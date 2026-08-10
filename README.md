# REDLINE — AI Co-Driver: Real-Time Driver Stress & Performance Intelligence

[![FastAPI](https://img.shields.io/badge/FastAPI-0.141-009688?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18-61DAFB?logo=react)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5-3178C6?logo=typescript)](https://www.typescriptlang.org)
[![Vite](https://img.shields.io/badge/Vite-8-646CFF?logo=vite)](https://vitejs.dev)
[![HuggingFace](https://img.shields.io/badge/🤗%20HuggingFace-Hub-FFD21E)](https://huggingface.co)
[![Dataset](https://img.shields.io/badge/Dataset-MikCil%2Ff1--team--radio-blue)](https://huggingface.co/datasets/MikCil/f1-team-radio)
[![License: CC BY 4.0](https://img.shields.io/badge/Data%20License-CC%20BY%204.0-green)](https://creativecommons.org/licenses/by/4.0/)

> **Every engine has one. So does every driver.**

REDLINE is a real-time AI co-driver intelligence system built for the **Grand Prix Hackathon (Track: PS1 — The Silent Co-Driver)**. It listens to driver radio transmissions, transcribes them, detects vocal stress/mood patterns, and cross-references them against lap-time data — surfacing a live timeline the pit wall can act on.

---

## Problem

Pit wall engineers currently assess driver state through intuition and fragmented radio communications. Subtle emotional cues — rising stress before a lock-up, fatigue at lap 40 — are missed in the noise. REDLINE makes those patterns visible.

---

## Feature Table

| Feature | Status | Description |
|---|---|---|
| 🎤 Audio Upload | ✅ Core | Upload any driver radio clip (.mp3 / .wav / .ogg) |
| 🌊 Live Waveform | ✅ Core | Animated Web Audio API visualizer synced to playback |
| 📝 Transcription | ✅ Core | `openai/whisper-base` on HF Hub — fast, demo-safe |
| 🧠 Mood Classification | ✅ Core | `superb/wav2vec2-base-superb-er` — Calm / Stressed / Tired |
| ⚡ Keyword Flagging | ✅ Core | Real-time highlight of safety words: brake, tyre, smoke, pain, vision |
| 📊 Lap Time Chart | ✅ Core | Recharts telemetry chart with sector breakdown |
| 🔥 Stress Heatmap | ✅ Differentiator | Color-coded timeline strip of mood across clips |
| 📈 Correlation Score | ✅ Differentiator | Pearson r between stress and lap time |
| 📻 Radio Log | ✅ Differentiator | Scrollable searchable history with mood badges |
| 🏎️ Driver Psych Panel | ✅ Differentiator | Real-time session stats, mood panel, disclaimer |

---

## Architecture

```
REDLINE/
├── backend/
│   ├── app/
│   │   ├── main.py               # FastAPI entrypoint
│   │   ├── api/audio.py          # /api/audio/upload endpoint
│   │   ├── models/
│   │   │   ├── transcriber.py    # openai/whisper-base wrapper
│   │   │   └── emotion.py        # superb/wav2vec2-base-superb-er wrapper
│   │   └── analytics/
│   │       └── correlation.py    # Pearson correlation utilities
│   ├── data/sample_laps.json     # Mock paired lap-time dataset
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
        │   ├── CorrelationCard.tsx    # Pearson r insight card
        │   ├── RadioLog.tsx           # Scrollable history
        │   └── ui/                   # Glass-card, Badge, GlowButton
        ├── scenes/TrackBackdrop.tsx   # React Three Fiber particle field
        ├── pages/Dashboard.tsx        # Full 12-column layout
        └── lib/api.ts                 # Typed fetch client
```

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + TypeScript + Vite 8 |
| Styling | Tailwind CSS + custom CSS variables (dark cockpit design) |
| 3D / Motion | React Three Fiber + Framer Motion |
| Charts | Recharts |
| Audio | Web Audio API |
| Backend | FastAPI + Uvicorn |
| Speech-to-Text | `openai/whisper-base` (Hugging Face Hub) |
| Emotion Recognition | `superb/wav2vec2-base-superb-er` (Hugging Face Hub) |
| Keyword flagging | Frontend regex pass on transcript |
| Mock Data | `MikCil/f1-team-radio` (CC-BY-4.0) paired with `data/sample_laps.json` |

---

## Emotion Mapping

The SER model (`wav2vec2-base-superb-er`) outputs 4 raw classes. They are mapped to REDLINE categories:

| Model Output | REDLINE Label | Rationale |
|---|---|---|
| `neu` (Neutral) | Calm | No vocal stress signal |
| `hap` (Happy) | Calm | Rare in race context; folded into Calm |
| `ang` (Angry) | Stressed | Elevated vocal aggression |
| `sad` (Sad) | Tired | Low-energy, depressed vocal tone |
| Composite | Frustrated | Derived from high `ang`+`sad` confidence with neither dominant — **not a direct model output**; documented as a derived heuristic |

> ⚠️ **Known Limitation:** The "Frustrated" label is a composite heuristic derived from confidence thresholds on `ang` and `sad` — it is **not** a raw model output class. Outputs reflect detected vocal tone patterns and are not diagnostic claims about any real driver's mental state.

---

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

---

## Results

| Metric | Value | Notes |
|---|---|---|
| Whisper transcription latency | ~1.5–3s | `whisper-base` on CPU, 10–30s clips |
| SER classification latency | ~0.3–0.8s | `wav2vec2-base-superb-er` on CPU |
| SER model classes | 4 (neu, hap, ang, sad) | Mapped to 3 UI labels + 1 derived |
| Frustrated label accuracy | Derived heuristic | See Known Limitations above |
| End-to-end pipeline | ~2–4s | Upload → transcript → mood → chart |

---

## Data Attribution

Primary audio dataset: **[MikCil/f1-team-radio](https://huggingface.co/datasets/MikCil/f1-team-radio)** on Hugging Face Hub.
~14,700 rows of real F1 team radio audio, transcriptions, driver/race/timestamp metadata.
Licensed under **CC-BY-4.0**.

Lap-time data in `data/sample_laps.json` is **synthetic mock data** generated for demo purposes and is not derived from any real timing source.

---

## Team & Submission

**Track:** PS1 — The Silent Co-Driver | **Hackathon:** Grand Prix Hackathon
**HF Hub Assets:** `openai/whisper-base` · `superb/wav2vec2-base-superb-er` · `MikCil/f1-team-radio`
