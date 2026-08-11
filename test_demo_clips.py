"""
Upload clips 02, 04, 05, 06, 07 in sequence and report:
- Transcript per clip
- Raw SER scores per clip  
- Final mood + confidence
- Lap data returned (to confirm cycling)
Then compute and report the resulting Pearson r manually.
"""
import os
import json
import requests
import math

def pearson_r(xs, ys):
    n = len(xs)
    if n < 2:
        return 0.0
    mean_x = sum(xs) / n
    mean_y = sum(ys) / n
    num = sum((xs[i] - mean_x) * (ys[i] - mean_y) for i in range(n))
    den_x = math.sqrt(sum((x - mean_x) ** 2 for x in xs))
    den_y = math.sqrt(sum((y - mean_y) ** 2 for y in ys))
    if den_x == 0 or den_y == 0:
        return 0.0
    return num / (den_x * den_y)

clips = ["clip_02.wav", "clip_04.wav", "clip_05.wav", "clip_06.wav", "clip_07.wav"]
base_dir = os.path.join(os.path.dirname(__file__), "backend", "app", "data", "sample_audio")

stress_scores = []
lap_times = []

for clip in clips:
    path = os.path.join(base_dir, clip)
    if not os.path.exists(path):
        print(f"MISSING: {clip}")
        continue
    
    print(f"\n=== {clip} ===")
    with open(path, "rb") as f:
        resp = requests.post("http://localhost:8000/api/audio/upload", files={"file": f})
    
    if not resp.ok:
        print(f"Error {resp.status_code}: {resp.text}")
        continue
    
    data = resp.json()
    print(f"Transcript : {data['transcript']}")
    print(f"Mood       : {data['mood']} ({data['confidence']:.4f})")
    print(f"Lap time   : {data['lap_data']['lap_time']}s (lap #{data['lap_data'].get('lap', '?')})")
    
    # Stress score: high if stressed/tired/frustrated, low if calm
    mood = data['mood']
    conf = data['confidence']
    stress = conf if mood in ('Stressed', 'Tired', 'Frustrated') else 1 - conf
    stress_scores.append(stress)
    lap_times.append(data['lap_data']['lap_time'])

print("\n=== SUMMARY ===")
print(f"Stress scores : {[round(s, 4) for s in stress_scores]}")
print(f"Lap times     : {lap_times}")
r = pearson_r(stress_scores, lap_times)
print(f"Pearson r     : {r:.4f}")
