import os
import urllib.request
import pandas as pd

def main():
    print("Downloading Parquet file from Hugging Face (this may take a minute)...")
    url = "https://huggingface.co/datasets/MikCil/f1-team-radio/resolve/main/data/train-00000-of-00005.parquet"
    
    file_path = "dataset.parquet"
    if not os.path.exists(file_path):
        urllib.request.urlretrieve(url, file_path)
    
    print("Download complete. Reading local parquet file...")
    
    # Load data
    df = pd.read_parquet(file_path)
    
    out_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data", "sample_audio")
    os.makedirs(out_dir, exist_ok=True)
    
    print("\n--- CLIP METADATA ---")
    
    # Extract first 10 clips
    for count, row in df.head(10).iterrows():
        audio_data = row['audio']
        if isinstance(audio_data, dict) and 'bytes' in audio_data:
            audio_bytes = audio_data['bytes']
        else:
            print(f"Skipping {count}: unexpected audio format")
            continue
            
        out_path = os.path.join(out_dir, f"clip_{count:02d}.wav")
        with open(out_path, "wb") as f:
            f.write(audio_bytes)
        
        driver = row.get("driver_id", "Unknown")
        gp = row.get("grand_prix", "Unknown GP")
        year = str(row.get("session_date", "Unknown Date"))[:4]
        text = row.get("transcription", "")
        if isinstance(text, str):
            text_preview = text[:50] + ("..." if len(text) > 50 else "")
        else:
            text_preview = str(text)
            
        print(f"[{count:02d}] Driver: {driver} | Event: {year} {gp} | Text: '{text_preview}'")
        
    print(f"\nSuccessfully extracted 10 clips to {out_dir}")

if __name__ == "__main__":
    main()
