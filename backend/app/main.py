from contextlib import asynccontextmanager
from dotenv import load_dotenv
load_dotenv()

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from app.api import audio
from app.models.transcriber import get_whisper_pipeline
from app.models.emotion import get_emotion_pipeline


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Preload HF models at server startup so the first demo request is instant."""
    print("REDLINE: Loading Whisper model (openai/whisper-base)...")
    get_whisper_pipeline()
    print("REDLINE: Whisper loaded OK.")
    print("REDLINE: Loading SER model (superb/wav2vec2-base-superb-er)...")
    get_emotion_pipeline()
    print("REDLINE: SER model loaded OK.")
    
    # Preload Cardiff NLP sentiment model (fast, already cached)
    from app.analytics.sentiment import get_sentiment_pipeline
    print("REDLINE: Loading Text Sentiment model (cardiffnlp/twitter-roberta-base-sentiment-latest)...")
    get_sentiment_pipeline()
    print("REDLINE: All models loaded OK. Server ready.")
    print("REDLINE: Zero-Shot (BART) will load lazily on first topic-tag request.")
    yield
    # Nothing to clean up on shutdown


app = FastAPI(title="REDLINE API", version="1.0.0", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(audio.router, prefix="/api/audio", tags=["audio"])

@app.get("/health")
def health_check():
    return {"status": "ok"}
