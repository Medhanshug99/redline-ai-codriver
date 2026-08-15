import os
import urllib.request
import urllib.error
import time
import pandas as pd

PARQUET_URL = "https://huggingface.co/datasets/MikCil/f1-team-radio/resolve/main/data/train-00000-of-00005.parquet"
PARQUET_FILE = os.path.join(os.path.dirname(os.path.abspath(__file__)), "dataset.parquet")
OUT_DIR = os.path.join(os.path.dirname(os.path.abspath(__file__)), "app", "data", "sample_audio")


def download_with_resume(url: str, dest: str, max_retries: int = 5) -> None:
    """Download a file with byte-range resume support and retry on failure."""
    for attempt in range(1, max_retries + 1):
        existing = os.path.getsize(dest) if os.path.exists(dest) else 0
        headers = {}
        if existing > 0:
            headers["Range"] = f"bytes={existing}-"
            print(f"  Resuming from byte {existing:,} (attempt {attempt}/{max_retries})...")
        else:
            print(f"  Starting download (attempt {attempt}/{max_retries})...")

        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req, timeout=120) as resp:
                mode = "ab" if existing > 0 else "wb"
                with open(dest, mode) as f:
                    chunk_size = 1024 * 1024  # 1 MB
                    while True:
                        chunk = resp.read(chunk_size)
                        if not chunk:
                            break
                        f.write(chunk)
            print("  Download complete.")
            return
        except (urllib.error.URLError, urllib.error.ContentTooShortError, OSError) as e:
            print(f"  Error on attempt {attempt}: {e}")
            if attempt < max_retries:
                wait = 2 ** attempt
                print(f"  Retrying in {wait}s...")
                time.sleep(wait)
            else:
                raise RuntimeError(f"Download failed after {max_retries} attempts.") from e


def main():
    print("=== REDLINE Audio Setup ===")
    os.makedirs(OUT_DIR, exist_ok=True)

    print(f"\nDownloading F1 radio Parquet from Hugging Face...")
    download_with_resume(PARQUET_URL, PARQUET_FILE)

    print("\nReading Parquet file...")
    df = pd.read_parquet(PARQUET_FILE)
    print(f"Loaded {len(df):,} rows.")

    print("\n--- Extracting first 10 clips ---")
    for count, row in df.head(10).iterrows():
        audio_data = row["audio"]
        if isinstance(audio_data, dict) and "bytes" in audio_data:
            audio_bytes = audio_data["bytes"]
        else:
            print(f"  [{count:02d}] Skipping: unexpected audio format")
            continue

        out_path = os.path.join(OUT_DIR, f"clip_{count:02d}.wav")
        with open(out_path, "wb") as f:
            f.write(audio_bytes)

        driver = row.get("driver_id", "Unknown")
        gp = row.get("grand_prix", "Unknown GP")
        year = str(row.get("session_date", "Unknown Date"))[:4]
        text = row.get("transcription", "")
        preview = (text[:50] + "...") if isinstance(text, str) and len(text) > 50 else str(text)

        size_kb = len(audio_bytes) / 1024
        print(f"  [{count:02d}] {driver} | {year} {gp} | {size_kb:.1f} KB | '{preview}'")

    print(f"\n[OK] Extracted 10 clips to: {OUT_DIR}")
    print("  Files: clip_00.wav through clip_09.wav")


if __name__ == "__main__":
    main()
