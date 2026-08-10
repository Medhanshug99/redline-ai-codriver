import os
from transformers import pipeline

_whisper_pipeline = None

def get_whisper_pipeline():
    global _whisper_pipeline
    if _whisper_pipeline is None:
        hf_token = os.getenv("HF_TOKEN")
        _whisper_pipeline = pipeline(
            "automatic-speech-recognition", 
            model="openai/whisper-base", 
            token=hf_token
        )
    return _whisper_pipeline

def transcribe_audio(file_path: str):
    pipe = get_whisper_pipeline()
    result = pipe(file_path)
    return {"text": result.get("text", "").strip()}
