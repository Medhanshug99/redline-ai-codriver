import os
import soundfile as sf
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
    # Read audio array using soundfile directly to eliminate ffmpeg subprocess dependency
    audio_array, sampling_rate = sf.read(file_path)
    # Ensure float32 format expected by transformers pipeline
    audio_array = audio_array.astype("float32")
    
    result = pipe({"raw": audio_array, "sampling_rate": sampling_rate})
    return {"text": result.get("text", "").strip()}
