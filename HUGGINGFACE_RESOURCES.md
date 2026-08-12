# Hugging Face Resources — REDLINE

This file documents all Hugging Face models, datasets, and infrastructure used in the REDLINE project.

---

## Models

### 1. `openai/whisper-base`
- **Hub URL:** https://huggingface.co/openai/whisper-base
- **Role:** Speech-to-Text (transcription)
- **Usage:** Pretrained inference only — no fine-tuning, no training loops.
  The model is loaded once at backend startup via `transformers.pipeline("automatic-speech-recognition")` and run against each uploaded or demo `.wav` file.
- **Why chosen:** Fast CPU inference (~1.5–3s per clip), good English accuracy, multilingual support.
- **License:** MIT

### 2. `superb/wav2vec2-base-superb-er`
- **Hub URL:** https://huggingface.co/superb/wav2vec2-base-superb-er
- **Role:** Speech Emotion Recognition (SER)
- **Usage:** Pretrained inference only — no fine-tuning, no training loops.
  Loaded via `transformers.pipeline("audio-classification")` and run against each clip after transcription.
- **Output classes:** `neu` (Neutral), `hap` (Happy), `ang` (Angry), `sad` (Sad)
- **REDLINE mapping:**
  | Model class | REDLINE label | Rationale |
  |---|---|---|
  | `neu` | Calm | No vocal stress signal |
  | `hap` | Calm | Rare in race context; folded into Calm |
  | `ang` | Stressed | Elevated vocal aggression |
  | `sad` | Tired | Low-energy, depressed vocal tone |
  | Composite ang+sad | Frustrated | Derived heuristic — **not a raw model output** |
- **Known limitation:** Model trained on IEMOCAP (acted studio speech). Shows strong Happy/Calm bias on real broadcast radio — 4 of 5 demo clips returned Calm regardless of content. This is documented distribution shift, not a pipeline bug.
- **License:** Apache 2.0

---

## Dataset

### `MikCil/f1-team-radio`
- **Hub URL:** https://huggingface.co/datasets/MikCil/f1-team-radio
- **Role:** Real-world audio input for demo clips
- **Usage:** We download clips from the Parquet files hosted on the HF dataset server using standard HTTP requests, and run them through the two pretrained models above. Zero training, zero labelling, zero fine-tuning.
- **Dataset size:** ~14,681 rows, covering 2018–2025 seasons
- **Audio format:** 16kHz mono WAV (embedded as bytes in Parquet)
- **License:** CC-BY-4.0

---

## Integration Pattern

REDLINE chains two pretrained models in a sequential inference pipeline:

```
.wav audio → [whisper-base] → transcript text
           → [wav2vec2-base-superb-er] → mood label + confidence score
```

No API calls are made to any external inference service. All inference runs locally on CPU via the `transformers` library. The HF Hub is used only for model weight download on first startup.

---

## Known Limitations (Disclosure)

1. **SER Happy-bias:** `wav2vec2-base-superb-er` shows heavy Calm/Happy bias on broadcast audio.  
   In the final 5-clip demo set, 4 of 5 clips returned `Calm`. Only the Ricciardo "different plan" clip returned `Tired`. This reflects the domain gap between IEMOCAP studio data and F1 radio.

2. **Whisper accuracy on noisy clips:** Short clips (<3s) and heavily static-affected audio produce phonetically plausible but semantically incorrect transcripts. Strategy discussions (longer, less clipped) transcribe accurately.

3. **Correlation sample-size caveat:** With n=5 clips, Pearson r between stress scores and lap times is directional but not statistically significant. Final demo set yielded r = +0.6736 (positive correlation driven by the single Tired clip having the slowest lap time). A full race stint (40–80 clips) would produce meaningful results.
