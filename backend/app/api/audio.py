import os
import uuid
import json
import time
from fastapi import APIRouter, File, UploadFile
from app.models.transcriber import transcribe_audio
from app.models.emotion import analyze_emotion

router = APIRouter()

# Load mock lap times
LAPS_FILE = os.path.join(os.path.dirname(__file__), '..', 'data', 'sample_laps.json')
try:
    with open(LAPS_FILE, 'r') as f:
        mock_laps = json.load(f)
except FileNotFoundError:
    mock_laps = []

# Track upload count so successive clips cycle through different lap entries
_upload_count = 0

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
        # Transcribe
        transcript_result = transcribe_audio(temp_file_path)
        
        # Analyze Emotion
        emotion_result = analyze_emotion(temp_file_path)

        # Cycle through lap entries so successive uploads show varied telemetry
        lap_idx = _upload_count % len(mock_laps) if mock_laps else 0
        lap_data = mock_laps[lap_idx] if mock_laps else {"lap_time": 85.5, "sector1": 25.1}
        _upload_count += 1

        response = {
            "transcript": transcript_result.get("text", ""),
            "mood": emotion_result.get("label", "Calm"),
            "confidence": emotion_result.get("score", 0.0),
            "timestamp": time.time(),
            "lap_data": lap_data
        }
        
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
        # Transcribe
        transcript_result = transcribe_audio(demo_file_path)
        
        # Analyze Emotion
        emotion_result = analyze_emotion(demo_file_path)

        # Cycle through lap entries so successive uploads show varied telemetry
        lap_idx = _upload_count % len(mock_laps) if mock_laps else 0
        lap_data = mock_laps[lap_idx] if mock_laps else {"lap_time": 85.5, "sector1": 25.1}
        _upload_count += 1

        response = {
            "transcript": transcript_result.get("text", ""),
            "mood": emotion_result.get("label", "Calm"),
            "confidence": emotion_result.get("score", 0.0),
            "timestamp": time.time(),
            "lap_data": lap_data
        }
        
        return response
    except Exception as e:
        return {"error": str(e)}
