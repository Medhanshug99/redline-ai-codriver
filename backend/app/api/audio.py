import os
import uuid
import json
import time
from fastapi import APIRouter, File, UploadFile, HTTPException
from fastapi.responses import FileResponse
from app.models.transcriber import transcribe_audio
from app.models.emotion import analyze_emotion
from app.analytics.sentiment import analyze_text_sentiment, detect_hidden_stress, generate_race_engineer_action, get_topic_tags, calculate_predicted_risk

router = APIRouter()

SAMPLE_AUDIO_DIR = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_audio')

@router.get("/sample/{clip_id}")
async def serve_sample_audio(clip_id: str):
    """Serve a raw WAV file from sample_audio so the browser can play it."""
    # Sanitize: no path traversal
    safe_id = os.path.basename(clip_id)
    file_path = os.path.join(SAMPLE_AUDIO_DIR, f'clip_{safe_id}.wav')
    if not os.path.exists(file_path):
        raise HTTPException(status_code=404, detail=f"Sample clip '{safe_id}' not found")
    return FileResponse(file_path, media_type="audio/wav", filename=f"clip_{safe_id}.wav")

# Load mock lap times
LAPS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_laps.json')
try:
    with open(LAPS_FILE, 'r') as f:
        mock_laps = json.load(f)
except FileNotFoundError:
    mock_laps = []

# Track upload count so successive clips cycle through different lap entries
_upload_count = 0

# ── Session accumulator for A4 Session Summary Card ──────────────────────────
_session_history: list[dict] = []

def _accumulate(entry: dict):
    """Store a lightweight snapshot of each analysis result for the summary."""
    _session_history.append({
        "mood":              entry.get("mood", "Calm"),
        "confidence":        entry.get("confidence", 0.0),
        "mismatch_detected": entry.get("mismatch_detected", False),
        "text_distress_score": entry.get("text_distress_score", 0.0),
        "risk_level":        entry.get("risk_level", "LOW"),
        "predicted_lap_delta": entry.get("predicted_lap_delta", 0.0),
        "topic_tags":        entry.get("topic_tags", []),
        "transcript":        (entry.get("transcript") or "")[:120],
    })

@router.get("/summary")
async def session_summary():
    """A4 – Session Summary Card: aggregate stats across all clips processed this session."""
    global _session_history
    if not _session_history:
        return {"message": "No data yet — process at least one clip first."}

    n = len(_session_history)
    from collections import Counter

    mood_counts  = Counter(e["mood"] for e in _session_history)
    top_mood     = mood_counts.most_common(1)[0][0]
    avg_distress = round(sum(e["text_distress_score"] for e in _session_history) / n, 3)
    avg_delta    = round(sum(e["predicted_lap_delta"]  for e in _session_history) / n, 3)
    hidden_stress_count = sum(1 for e in _session_history if e["mismatch_detected"])

    all_tags: list[str] = []
    for e in _session_history:
        all_tags.extend(e["topic_tags"])
    tag_counts   = Counter(all_tags)
    top_tags     = [t for t, _ in tag_counts.most_common(3)]

    risk_counts  = Counter(e["risk_level"] for e in _session_history)
    # session risk = highest observed
    session_risk = "CRITICAL" if risk_counts.get("CRITICAL", 0) else \
                   "ELEVATED" if risk_counts.get("ELEVATED", 0) else "LOW"

    # Simple rule-based summary text — no LLM required
    summary_lines = [
        f"Session covered {n} communication{'s' if n>1 else ''}.",
        f"Dominant mood: {top_mood}. Average distress score: {avg_distress:.2f}.",
    ]
    if hidden_stress_count:
        summary_lines.append(
            f"⚠️  Hidden Stress detected {hidden_stress_count} time{'s' if hidden_stress_count>1 else ''} — vocal tone and words diverged."
        )
    if top_tags:
        summary_lines.append(f"Primary topics discussed: {', '.join(top_tags)}.")
    summary_lines.append(
        f"Projected average lap-time impact: +{avg_delta:.3f}s. Session risk: {session_risk}."
    )

    return {
        "clips_analysed":     n,
        "dominant_mood":      top_mood,
        "mood_distribution":  dict(mood_counts),
        "avg_distress_score": avg_distress,
        "avg_lap_delta":      avg_delta,
        "session_risk":       session_risk,
        "hidden_stress_count": hidden_stress_count,
        "top_topics":         top_tags,
        "topic_distribution": dict(tag_counts),
        "summary_text":       " ".join(summary_lines),
    }

@router.post("/session/reset")
async def reset_session():
    """Clear session history to start a fresh pit-wall session."""
    global _session_history, _upload_count
    _session_history = []
    _upload_count = 0
    return {"message": "Session cleared."}


@router.post("/upload")
async def upload_audio(file: UploadFile = File(...)):
    global _upload_count
    file_id = str(uuid.uuid4())
    
    # Ensure temporary directory exists
    temp_dir = os.path.join(os.getcwd(), "temp_audio")
    os.makedirs(temp_dir, exist_ok=True)
    temp_file_path = os.path.join(temp_dir, f"{file_id}_{file.filename}")

    with open(temp_file_path, "wb") as buffer:
        buffer.write(await file.read())

    try:
        # Transcribe & measure latency
        t_transcribe_start = time.perf_counter()
        transcript_result = transcribe_audio(temp_file_path)
        transcription_latency_ms = round((time.perf_counter() - t_transcribe_start) * 1000, 1)
        
        # Analyze Emotion & measure latency
        t_emotion_start = time.perf_counter()
        emotion_result = analyze_emotion(temp_file_path)
        emotion_latency_ms = round((time.perf_counter() - t_emotion_start) * 1000, 1)

        transcript_text = transcript_result.get("text", "")
        mood_label = emotion_result.get("label", "Calm")
        confidence_score = emotion_result.get("score", 0.0)

        # Multi-Modal Divergence Analysis & Topic Tags & Predicted Risk
        t_sent_start = time.perf_counter()
        text_analysis = analyze_text_sentiment(transcript_text)
        divergence = detect_hidden_stress(mood_label, confidence_score, text_analysis)
        topic_tags = get_topic_tags(transcript_text)
        risk_data = calculate_predicted_risk(mood_label, confidence_score, divergence["text_distress_score"])
        divergence_latency_ms = round((time.perf_counter() - t_sent_start) * 1000, 1)

        # Cycle through lap entries so successive uploads show varied telemetry
        lap_idx = _upload_count % len(mock_laps) if mock_laps else 0
        lap_data = mock_laps[lap_idx] if mock_laps else {"lap_time": 85.5, "sector1": 25.1}
        _upload_count += 1

        response = {
            "transcript": transcript_text,
            "mood": mood_label,
            "confidence": confidence_score,
            "timestamp": time.time(),
            "lap_data": lap_data,
            "divergence": divergence,
            "text_distress_score": divergence["text_distress_score"],
            "text_sentiment": divergence["text_sentiment"],
            "mismatch_detected": divergence["mismatch_detected"],
            "mismatch_note": divergence["mismatch_note"],
            "topic_tags": topic_tags,
            "predicted_lap_delta": risk_data["predicted_lap_delta"],
            "risk_level": risk_data["risk_level"],
            "recommended_action": generate_race_engineer_action(transcript_text, mood_label, divergence["mismatch_detected"]),
            "latency": {
                "transcription_ms": transcription_latency_ms,
                "emotion_ms": emotion_latency_ms,
                "divergence_ms": divergence_latency_ms,
                "total_ms": round(transcription_latency_ms + emotion_latency_ms + divergence_latency_ms, 1),
            },
        }
        
        _accumulate(response)
        return response
    finally:
        # Clean up
        if os.path.exists(temp_file_path):
            os.remove(temp_file_path)

@router.post("/demo")
async def demo_audio(clip_id: str = "05"):
    global _upload_count
    
    demo_file_path = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_audio', f'clip_{clip_id}.wav')
    
    if not os.path.exists(demo_file_path):
        return {"error": "Demo file not found"}
        
    try:
        # Transcribe & measure latency
        t_transcribe_start = time.perf_counter()
        transcript_result = transcribe_audio(demo_file_path)
        transcription_latency_ms = round((time.perf_counter() - t_transcribe_start) * 1000, 1)
        
        # Analyze Emotion & measure latency
        t_emotion_start = time.perf_counter()
        emotion_result = analyze_emotion(demo_file_path)
        emotion_latency_ms = round((time.perf_counter() - t_emotion_start) * 1000, 1)

        transcript_text = transcript_result.get("text", "")
        mood_label = emotion_result.get("label", "Calm")
        confidence_score = emotion_result.get("score", 0.0)

        # Multi-Modal Divergence Analysis & Topic Tags & Predicted Risk
        t_sent_start = time.perf_counter()
        text_analysis = analyze_text_sentiment(transcript_text)
        divergence = detect_hidden_stress(mood_label, confidence_score, text_analysis)
        topic_tags = get_topic_tags(transcript_text)
        risk_data = calculate_predicted_risk(mood_label, confidence_score, divergence["text_distress_score"])
        divergence_latency_ms = round((time.perf_counter() - t_sent_start) * 1000, 1)

        # Cycle through lap entries so successive uploads show varied telemetry
        lap_idx = _upload_count % len(mock_laps) if mock_laps else 0
        lap_data = mock_laps[lap_idx] if mock_laps else {"lap_time": 85.5, "sector1": 25.1}
        _upload_count += 1

        response = {
            "transcript": transcript_text,
            "mood": mood_label,
            "confidence": confidence_score,
            "timestamp": time.time(),
            "lap_data": lap_data,
            "divergence": divergence,
            "text_distress_score": divergence["text_distress_score"],
            "text_sentiment": divergence["text_sentiment"],
            "mismatch_detected": divergence["mismatch_detected"],
            "mismatch_note": divergence["mismatch_note"],
            "topic_tags": topic_tags,
            "predicted_lap_delta": risk_data["predicted_lap_delta"],
            "risk_level": risk_data["risk_level"],
            "recommended_action": generate_race_engineer_action(transcript_text, mood_label, divergence["mismatch_detected"]),
            "latency": {
                "transcription_ms": transcription_latency_ms,
                "emotion_ms": emotion_latency_ms,
                "divergence_ms": divergence_latency_ms,
                "total_ms": round(transcription_latency_ms + emotion_latency_ms + divergence_latency_ms, 1),
            },
        }
        
        _accumulate(response)
        return response
    except Exception as e:
        return {"error": str(e)}
