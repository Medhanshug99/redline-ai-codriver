# REDLINE — AI Co-Driver: Real-Time Driver Stress & Performance Intelligence
FastAPI · React · TypeScript · Vite · HuggingFace Dataset · License: CC BY 4.0

See also: HUGGINGFACE_RESOURCES.md — full disclosure of all HF models, datasets, integration pattern, and known limitations.

*Every engine has one. So does every driver.*

REDLINE is a real-time AI co-driver intelligence system built for the Grand Prix Hackathon (Track: PS1 — The Silent Co-Driver). It listens to driver radio transmissions, transcribes them, detects vocal stress/mood patterns, cross-checks that against what the driver actually said, and correlates it against lap-time data — surfacing a live timeline the pit wall can act on.

## Problem

Pit wall engineers currently assess driver state through intuition and fragmented radio communications. Subtle emotional cues — rising stress before a lock-up, fatigue at lap 40 — are missed in the noise. REDLINE makes those patterns visible.

## Feature Table

| Feature | Status | Description |
|---|---|---|
| Audio Upload | Done (Core) | Upload any driver radio clip (.mp3 / .wav / .ogg) |
| Live Waveform | Done (Core) | Animated Web Audio API visualizer synced to playback |
| Transcription | Done (Core) | `openai/whisper-base` on HF Hub — fast, demo-safe |
| Mood Classification | Done (Core) | `superb/wav2vec2-base-superb-er` — Calm / Stressed / Tired |
| Keyword Flagging | Done (Core) | Real-time highlight of safety words: brake, tyre, smoke, pain, vision |
| Lap Time Chart | Done (Core) | Recharts telemetry chart with sector breakdown |
| Hidden Stress Divergence | Done (Diff) | Cross-checks SER voice-tone against transcript text-sentiment; flags disagreement as suppressed/hidden stress |
| Stress Heatmap | Done (Diff) | Color-coded timeline strip of mood across clips |
| Correlation Score | Done (Diff) | Pearson r between stress and lap time, gated behind a 5-clip minimum sample size |
| Radio Log | Done (Diff) | Scrollable searchable history with mood badges |
| Driver Psych Panel | Done (Diff) | Real-time session stats, mood panel, disclaimer |

## Architecture

```
REDLINE/
├── backend/
│   ├── app/
│   │   ├── main.py                # FastAPI entrypoint, model preload on startup
│   │   ├── api/audio.py           # /api/audio/upload endpoint
│   │   ├── analytics/
│   │   │   └── sentiment.py       # text-sentiment cross-check, powers Hidden Stress Divergence
│   │   ├── models/
│   │   │   ├── transcriber.py     # openai/whisper-base wrapper
│   │   │   └── emotion.py         # superb/wav2vec2-base-superb-er wrapper
│   │   └── data/sample_laps.json  # Mock paired lap-time dataset
│   ├── requirements.txt
│   └── .env.example
└── frontend/
    └── src/
        ├── components/
        │   ├── WaveformPlayer.tsx     # Web Audio API visualizer
        │   ├── TranscriptPanel.tsx    # Keyword-highlighted transcript
        │   ├── MoodBadge.tsx          # Animated mood state indicator
        │   ├── LapTimeChart.tsx       # Recharts lap telemetry
        │   ├── StressHeatmap.tsx      # Color-coded timeline strip
        │   ├── CorrelationCard.tsx    # Pearson r insight card, 5-clip minimum gate
        │   ├── RadioLog.tsx           # Scrollable history
        │   └── ui/                    # Glass-card, Badge, GlowButton
        ├── scenes/TrackBackdrop.tsx   # React Three Fiber wireframe circuit backdrop
        ├── pages/Dashboard.tsx        # Full 12-column layout
        └── lib/api.ts                  # Typed fetch client
```

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite |
| Styling | Tailwind CSS + custom CSS variables (dark cockpit design) |
| 3D / Motion | React Three Fiber + Framer Motion |
| Charts | Recharts |
| Audio | Web Audio API |
| Backend | FastAPI + Uvicorn |
| Speech-to-Text | `openai/whisper-base` (Hugging Face Hub) |
| Emotion Recognition | `superb/wav2vec2-base-superb-er` (Hugging Face Hub) |
| Sentiment Cross-Check | HF text-sentiment model — powers Hidden Stress Divergence |
| Keyword flagging | Frontend regex pass on transcript |
| Mock Data | `MikCil/f1-team-radio` (CC-BY-4.0) paired with `data/sample_laps.json` |

## Emotion Mapping

The SER model (`wav2vec2-base-superb-er`) outputs 4 raw classes. They are mapped to REDLINE categories:

| Model Output | REDLINE Label | Rationale |
|---|---|---|
| `neu` (Neutral) | Calm | No vocal stress signal |
| `hap` (Happy) | Calm | Rare in race context; folded into Calm |
| `ang` (Angry) | Stressed | Elevated vocal aggression |
| `sad` (Sad) | Tired | Low-energy, depressed vocal tone |
| Composite | Frustrated | Derived from high `ang`+`sad` confidence with neither dominant — not a direct model output; documented as a derived heuristic |

## Known Limitations

- **"Frustrated" label is a derived heuristic**, not a raw model output. Confidence thresholds on `ang` and `sad` are combined — documented here and in the disclaimer shown in the UI.

- **SER Happy-bias on broadcast audio.** `wav2vec2-base-superb-er` was trained on IEMOCAP (acted speech in a recording studio). In testing against 10 real F1 team radio clips, 9 of 10 returned `hap`-dominant scores regardless of content — only one clip (a driver mid-strategy question) produced a non-Calm classification (`sad` → Tired). This is a known distribution shift between acted speech datasets and live radio. A model fine-tuned on motorsport broadcast audio would reduce this bias. Results shown in the demo are real model output; the limitation is the model's domain, not the pipeline.

- **Hidden Stress Divergence exists specifically to compensate for the SER bias above.** By cross-checking voice-tone against transcript sentiment, the system caught cases where SER defaulted to "Calm" on genuinely distressed speech (e.g. transcripts mentioning smoke, physical fatigue) — flagging the disagreement rather than trusting a single potentially-biased signal.

- **Whisper transcription accuracy degrades on heavy radio static.** In testing, 2 of 5 clips produced phonetically plausible but semantically incorrect transcripts due to noise in the audio channel. Clips recorded closer to the microphone (longer, cleaner utterances like strategy discussions) transcribed accurately. Clip accuracy is noted in demo materials; `whisper-base` was chosen for demo speed — `whisper-small` or `whisper-medium` would improve results at higher latency cost.

- **Stress–lap correlation requires session-scale data, and is now gated accordingly.** An early build displayed Pearson r = -1.00 with 100% confidence from just 2 data points — mathematically inevitable at n=2, not a real finding. The UI now requires a minimum of 5 clips before displaying a correlation value; below that threshold it shows "Insufficient data" instead. On the 5-clip demo set, r measured +0.6736 — directional but not yet statistically robust; this would converge meaningfully with a full session's 40–80 clips.

Outputs reflect detected vocal tone patterns and are not diagnostic claims about any real driver's mental state.

## What We Learned (Engineering Log)

- Initial correlation metric showed Pearson r = -1.00 (100% confidence) from just 2 data points — mathematically inevitable with n=2, not a real finding. Fixed by gating correlation/risk display behind a minimum 5-sample threshold.
- SER model defaults toward "Calm" on real F1 broadcast radio, which uses flatter, disciplined vocal delivery than the acted-speech dataset it was trained on. Only 1 of 10 real test clips broke through to a different label on tone alone.
- Built Hidden Stress Divergence to compensate: cross-checks voice-tone classification against transcript text-sentiment. Caught cases the SER model alone mislabeled as "Calm" despite clearly distressed transcript content.
- Moved model loading (Whisper + SER) into a FastAPI startup event instead of per-request lazy loading, removing first-request timeout risk during live demos.

## Roadmap

- Speaker diarization to isolate driver voice from engineer voice in mixed radio channels
- Supervised fusion classifier over SER + sentiment embeddings (learned divergence, not rule-based)
- Driver-conditioned VAE for personalized stress baselines — 8-16D latent bottleneck, reconstruction-error-based anomaly scoring instead of a global threshold
- Multi-driver baseline collection across race conditions to personalize stress thresholds
- Business model: per-session / per-season API subscription for F2/F3/junior teams without dedicated driver-performance staff

## Local Setup

### Backend
```bash
cd backend
python -m venv venv
# Windows
.\venv\Scripts\pip install -r requirements.txt
# Copy and fill .env
copy .env.example .env
# Add your HF token to .env:  HF_TOKEN=hf_...

.\venv\Scripts\uvicorn app.main:app --reload
# API running at: http://localhost:8000
```

### Frontend
```bash
cd frontend
npm install
npm run dev
# Dashboard at: http://localhost:5173
```

## Results

| Metric | Value | Notes |
|---|---|---|
| Whisper transcription latency | ~1.5–3s | whisper-base on CPU, 10–30s clips |
| SER classification latency | ~0.3–0.8s | wav2vec2-base-superb-er on CPU |
| SER model classes | 4 (neu, hap, ang, sad) | Mapped to 3 UI labels + 1 derived |
| Frustrated label accuracy | Derived heuristic | See Known Limitations above |
| End-to-end pipeline | ~2–4s | Upload → transcript → mood → chart. Models preloaded at server startup, not per-request. |
| Correlation display threshold | 5+ clips | Below this, UI shows "Insufficient data" rather than a misleading value |

## Data Attribution

Primary audio dataset: `MikCil/f1-team-radio` on Hugging Face Hub. ~14,700 rows of real F1 team radio audio, transcriptions, driver/race/timestamp metadata. Licensed under CC-BY-4.0.

Lap-time data in `data/sample_laps.json` is synthetic mock data generated for demo purposes and is not derived from any real timing source.

## Team, Process & Models

**Track:** PS1 — The Silent Co-Driver | **Hackathon:** Grand Prix Hackathon

**Hugging Face Integration Strategy:**

- `openai/whisper-base`: Chosen for Speech-to-Text because it strikes the right balance between inference speed and accuracy on CPU for a live demo.
- `superb/wav2vec2-base-superb-er`: Chosen for Speech Emotion Recognition because it directly outputs discrete emotional classes (`neu`, `hap`, `ang`, `sad`) which we could map heuristically to high-stress racing states.
- Sentiment cross-check model: Added after discovering the SER happy-bias limitation above — provides an independent second signal so a single model's blind spot doesn't become the system's blind spot.
- `MikCil/f1-team-radio`: The critical enabler for this project. Provides thousands of real-world noisy radio transmissions to test the pipeline against actual broadcast conditions rather than synthesized clean audio.
