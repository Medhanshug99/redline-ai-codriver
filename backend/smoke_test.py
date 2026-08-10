import os
from transformers import pipeline
from dotenv import load_dotenv

load_dotenv()
hf_token = os.getenv("HF_TOKEN")

print("Initializing Whisper model...")
try:
    asr_pipeline = pipeline("automatic-speech-recognition", model="openai/whisper-base", token=hf_token)
    print("SUCCESS: openai/whisper-base loaded correctly.")
except Exception as e:
    print(f"FAILED: openai/whisper-base failed to load. Error: {e}")

print("Initializing Speech Emotion Recognition model...")
try:
    ser_pipeline = pipeline("audio-classification", model="superb/wav2vec2-base-superb-er", token=hf_token)
    print("SUCCESS: superb/wav2vec2-base-superb-er loaded correctly.")
except Exception as e:
    print(f"FAILED: superb/wav2vec2-base-superb-er failed to load. Error: {e}")
