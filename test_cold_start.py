import sys
import os
sys.path.insert(0, os.path.join(os.path.dirname(__file__), "backend"))

import json
import math
from app.models.transcriber import transcribe_audio
from app.models.emotion import analyze_emotion
from app.analytics.sentiment import analyze_text_sentiment, detect_hidden_stress, generate_race_engineer_action

clips = ['00', '02', '04', '05', '06']
laps = [91.234, 88.543, 87.921, 88.105, 89.450]
stress_history = []
lap_history = []

print("===================================================================")
print("             REDLINE v2 — COLD-START END-TO-END DEMO RUN           ")
print("===================================================================\n")

for idx, c in enumerate(clips):
    path = f"backend/app/data/sample_audio/clip_{c}.wav"
    t_res = transcribe_audio(path)
    e_res = analyze_emotion(path)

    transcript = t_res.get("text", "")
    mood = e_res.get("label", "Calm")
    conf = e_res.get("score", 0.0)

    text_analysis = analyze_text_sentiment(transcript)
    divergence = detect_hidden_stress(mood, conf, text_analysis)
    action = generate_race_engineer_action(transcript, mood, divergence["mismatch_detected"])

    stress_val = conf if mood in ("Stressed", "Frustrated", "Tired") else (1.0 - conf)
    stress_history.append(stress_val)
    lap_history.append(laps[idx])

    conf_label = "HIGH CONF" if conf >= 0.70 else "LOW CONF"

    print(f"--- DEMO STEP {idx + 1}: Clip {c} ---")
    print(f"Transcript        : \"{transcript}\"")
    print(f"SER Mood          : {mood} ({(conf * 100):.1f}% confidence - [{conf_label}])")
    print(f"Text Sentiment    : {text_analysis['text_sentiment']} (Score: {text_analysis['distress_score']})")
    print(f"Hidden Stress Flag: {divergence['mismatch_detected']}")
    if divergence['mismatch_detected']:
        print(f"  -> Reason       : {divergence['mismatch_note']}")
    print(f"Action Chip       : {action if action else '[None]'}")
    print(f"Lap Telemetry     : Lap #{idx + 1} | {laps[idx]}s")

    if len(stress_history) >= 3:
        n = len(stress_history)
        mx = sum(stress_history) / n
        my = sum(lap_history) / n
        num = sum((stress_history[i] - mx) * (lap_history[i] - my) for i in range(n))
        den_x = math.sqrt(sum((x - mx) ** 2 for x in stress_history))
        den_y = math.sqrt(sum((y - my) ** 2 for y in lap_history))
        r = num / (den_x * den_y) if (den_x > 0 and den_y > 0) else 0.0

        if r > 0.4:
            trend = f"Stress rising — correlates with lap time degradation (+{r:.2f} r)"
        elif r < -0.4:
            trend = f"Inverse stress-pace pattern — lap times improving under pressure ({r:.2f} r)"
        else:
            trend = f"Stress stable — weak pace correlation ({r:.2f} r)"

        print(f"Session Trendline : \"Session Trend ({n} clips): {trend}\"")

    print("")

print("===================================================================")
print("[OK] COLD-START RUN COMPLETE -- ZERO ERRORS DETECTED")
print("===================================================================")
