import re
import os
from transformers import pipeline

_sentiment_pipeline = None
_zero_shot_pipeline = None

def get_sentiment_pipeline():
    global _sentiment_pipeline
    if _sentiment_pipeline is None:
        hf_token = os.getenv("HF_TOKEN")
        try:
            _sentiment_pipeline = pipeline(
                "sentiment-analysis",
                model="cardiffnlp/twitter-roberta-base-sentiment-latest",
                token=hf_token
            )
        except Exception as e:
            print(f"REDLINE WARNING: Failed to load Cardiff NLP sentiment model: {e}. Falling back to rules.")
    return _sentiment_pipeline

def get_zero_shot_pipeline():
    global _zero_shot_pipeline
    if _zero_shot_pipeline is None:
        hf_token = os.getenv("HF_TOKEN")
        try:
            _zero_shot_pipeline = pipeline(
                "zero-shot-classification",
                model="facebook/bart-large-mnli",
                token=hf_token
            )
        except Exception as e:
            print(f"REDLINE WARNING: Failed to load BART MNLI zero shot classifier: {e}. Falling back to rules.")
    return _zero_shot_pipeline

# TIER 1: Safety-critical / High-severity emergency keywords
TIER1_KEYWORDS = {
    "brake": 0.45,
    "brakes": 0.45,
    "fire": 0.50,
    "smoke": 0.45,
    "pain": 0.50,
    "wall": 0.40,
    "damage": 0.40,
    "damaged": 0.40,
    "crash": 0.50,
    "failure": 0.45,
    "failed": 0.45,
    "puncture": 0.45,
    "flame": 0.50,
    "flames": 0.50,
    "lose control": 0.50,
    "lost control": 0.50,
}

# TIER 2: Lower-severity general distress / struggle / ambiguity markers
TIER2_KEYWORDS = {
    "can't": 0.20,
    "cant": 0.20,
    "struggling": 0.25,
    "losing it": 0.25,
    "losing": 0.15,
    "not right": 0.20,
    "no no": 0.20,
    "difficult": 0.15,
    "hard": 0.15,
    "problem": 0.15,
    "issue": 0.15,
    "bad": 0.15,
    "slow": 0.10,
    "heavy": 0.10,
    "stuck": 0.15,
    "weird": 0.15,
    "strange": 0.15,
}

def analyze_text_sentiment(transcript: str) -> dict:
    """
    Analyzes text sentiment using cardiffnlp/twitter-roberta-base-sentiment-latest with rule-based fallback.
    """
    if not transcript:
        return {
            "text_sentiment": "Neutral",
            "distress_score": 0.0,
            "tier1_hits": [],
            "tier2_hits": [],
            "flagged_words": [],
        }

    lower_text = transcript.lower()
    tier1_hits = [phrase for phrase in TIER1_KEYWORDS if phrase in lower_text]
    tier2_hits = [phrase for phrase in TIER2_KEYWORDS if phrase in lower_text]
    if transcript.count("!") > 0:
        tier2_hits.append("exclamation")
    if re.search(r'\bno\b[\s,.]+\bno\b', lower_text):
        tier2_hits.append("no no")
    
    all_flagged = list(set(tier1_hits + tier2_hits))

    pipe = get_sentiment_pipeline()
    if pipe is not None:
        try:
            res = pipe(transcript)[0]
            label = res["label"].lower() # positive, negative, neutral
            score = res["score"]
            if "negative" in label or "neg" in label:
                sentiment = "Distressed"
                distress_score = round(score, 2)
            elif "neutral" in label or "neu" in label:
                sentiment = "Neutral"
                distress_score = round(score * 0.2, 2)
            else:
                sentiment = "Calm"
                distress_score = 0.0
        except Exception:
            pipe = None # trigger fallback

    if pipe is None:
        # Fallback to heuristics
        score = 0.0
        for phrase in tier1_hits:
            score += TIER1_KEYWORDS[phrase]
        for phrase in tier2_hits:
            score += TIER2_KEYWORDS.get(phrase, 0.15)
        normalized_score = min(round(score, 2), 1.0)
        if len(tier1_hits) > 0 or normalized_score >= 0.5:
            sentiment = "Distressed"
        elif len(tier2_hits) > 0 or normalized_score >= 0.2:
            sentiment = "Urgent"
        else:
            sentiment = "Neutral"
        distress_score = normalized_score

    return {
        "text_sentiment": sentiment,
        "distress_score": distress_score,
        "tier1_hits": tier1_hits,
        "tier2_hits": tier2_hits,
        "flagged_words": all_flagged,
    }

def detect_hidden_stress(ser_mood: str, ser_confidence: float, text_analysis: dict) -> dict:
    """
    Cross-checks SER voice mood vs text_sentiment.
    Flags mismatch_detected: true if vocal tone is Calm but transcript suggests Distressed/Urgent.
    """
    text_sentiment = text_analysis.get("text_sentiment", "Neutral")
    distress_score = text_analysis.get("distress_score", 0.0)
    flagged_words = text_analysis.get("flagged_words", [])

    mismatch_detected = False
    mismatch_note = None

    if ser_mood == "Calm" and text_sentiment in ("Distressed", "Urgent"):
        mismatch_detected = True
        mismatch_note = f"Suppressed Stress: Vocal tone is Calm, but transcript text indicates {text_sentiment} state ({', '.join(flagged_words) if flagged_words else 'keywords'})."
    elif ser_mood in ("Stressed", "Frustrated") and text_sentiment == "Neutral" and ser_confidence >= 0.6:
        mismatch_detected = True
        mismatch_note = "Acoustic Agitation: High vocal stress detected despite routine/neutral transcript content."

    return {
        "mismatch_detected": mismatch_detected,
        "mismatch_note": mismatch_note,
        "text_sentiment": text_sentiment,
        "text_distress_score": distress_score,
        "divergence_detected": mismatch_detected,
        "divergence_reason": mismatch_note,
    }

def get_topic_tags(transcript: str) -> list[str]:
    """
    Classify topics (Tyres, Brakes, Power Unit, Fuel, Traffic, Strategy) using BART.
    """
    if not transcript:
        return []
    candidate_labels = ["Tyres", "Brakes", "Power Unit", "Fuel", "Traffic", "Strategy"]
    pipe = get_zero_shot_pipeline()
    if pipe is not None:
        try:
            res = pipe(transcript, candidate_labels=candidate_labels)
            # return labels with score > 0.35
            return [label for label, score in zip(res["labels"], res["scores"]) if score > 0.35]
        except Exception:
            pass

    # Heuristic fallback
    tags = []
    lower = transcript.lower()
    if any(k in lower for k in ["tyre", "tire", "puncture", "gravel", "rubber", "slide", "grip"]):
        tags.append("Tyres")
    if any(k in lower for k in ["brake", "stopping", "pedal", "lock"]):
        tags.append("Brakes")
    if any(k in lower for k in ["engine", "power", "gear", "mgu", "battery", "turbo"]):
        tags.append("Power Unit")
    if any(k in lower for k in ["fuel", "consumption", "lift", "map"]):
        tags.append("Fuel")
    if any(k in lower for k in ["traffic", "car ahead", "behind", "gap", "blue flag"]):
        tags.append("Traffic")
    if any(k in lower for k in ["strategy", "pit", "box", "window", "plan", "lap"]):
        tags.append("Strategy")
    return tags

def calculate_predicted_risk(ser_mood: str, ser_confidence: float, text_distress: float) -> dict:
    """
    Linear projection of next-lap delta.
    Calm mood maintains delta around 0s. Stressed/Frustrated/Tired adds risk.
    """
    base_delta = 0.0
    if ser_mood == "Stressed":
        base_delta = 0.45 * ser_confidence
    elif ser_mood == "Frustrated":
        base_delta = 0.35 * ser_confidence
    elif ser_mood == "Tired":
        base_delta = 0.60 * ser_confidence
    
    # Text distress component
    text_impact = text_distress * 0.40
    total_delta = round(base_delta + text_impact, 3)
    risk_level = "LOW"
    if total_delta > 0.6:
        risk_level = "CRITICAL"
    elif total_delta > 0.25:
        risk_level = "ELEVATED"

    return {
        "predicted_lap_delta": total_delta,
        "risk_level": risk_level
    }

def generate_race_engineer_action(transcript: str, ser_mood: str, mismatch_detected: bool) -> str | None:
    """
    Race-Engineer Action Decision Table.
    """
    is_elevated_stress = ser_mood in ("Stressed", "Frustrated", "Tired") or mismatch_detected
    if not is_elevated_stress:
        return None

    lower_text = transcript.lower()
    if any(k in lower_text for k in ["brake", "brakes"]):
        return "INSPECT BRAKE BIAS & SYSTEM TEMP"
    if any(k in lower_text for k in ["tyre", "tyres", "tire", "tires", "puncture", "gravel"]):
        return "PREPARE TYRE PIT BOX / MONITOR DEGRADATION"
    if any(k in lower_text for k in ["fuel", "consumption", "lift"]):
        return "SWITCH TO ECO ENGINE MAP / MANAGE LIFT-AND-COAST"
    if any(k in lower_text for k in ["box", "pit", "in this lap"]):
        return "CONFIRM PIT LANE ENTRY & TEAM READINESS"
    if any(k in lower_text for k in ["engine", "power", "smoke", "fire", "oil"]):
        return "CHECK ENGINE TELEMETRY & SENSOR PRESSURES"

    return "FLAG FOR RACE ENGINEER REVIEW"


