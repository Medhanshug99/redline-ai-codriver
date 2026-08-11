import os
import requests
import json

def test_clips():
    base_dir = os.path.join(os.path.dirname(__file__), "backend", "app", "data", "sample_audio")
    
    for i in range(5, 10):
        clip_name = f"clip_0{i}.wav"
        file_path = os.path.join(base_dir, clip_name)
        
        if not os.path.exists(file_path):
            print(f"Skipping {clip_name}, not found.")
            continue
            
        print(f"\n--- Testing {clip_name} ---")
        try:
            with open(file_path, "rb") as f:
                response = requests.post("http://localhost:8000/api/audio/upload", files={"file": f})
            
            if response.ok:
                data = response.json()
                print(f"Transcript: {data.get('transcript')}")
                print(f"Mood: {data.get('mood')} ({data.get('confidence'):.4f})")
            else:
                print(f"Error {response.status_code}: {response.text}")
        except Exception as e:
            print(f"Request failed: {e}")

if __name__ == "__main__":
    test_clips()
