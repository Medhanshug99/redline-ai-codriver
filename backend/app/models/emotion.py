import os
from transformers import pipeline

_emotion_pipeline = None

def get_emotion_pipeline():
    global _emotion_pipeline
    if _emotion_pipeline is None:
        hf_token = os.getenv("HF_TOKEN")
        _emotion_pipeline = pipeline(
            "audio-classification", 
            model="superb/wav2vec2-base-superb-er", 
            token=hf_token
        )
    return _emotion_pipeline

def map_emotion(raw_scores):
    """
    Map raw HF SER scores to Hackathon categories.
    Labels for superb/wav2vec2-base-superb-er: 'neu', 'hap', 'ang', 'sad'
    """
    scores_dict = {item['label'][:3].lower(): item['score'] for item in raw_scores}
    
    ang = scores_dict.get('ang', 0.0)
    sad = scores_dict.get('sad', 0.0)

    # Derived 'Frustrated': high negative emotion, but split between angry and sad
    if (ang + sad) > 0.6 and ang < 0.5 and sad < 0.5:
        return {"label": "Frustrated", "score": ang + sad}

    max_label = max(scores_dict, key=scores_dict.get)
    max_score = scores_dict[max_label]

    if max_label in ['neu', 'hap']:
        return {"label": "Calm", "score": max_score}
    elif max_label == 'ang':
        return {"label": "Stressed", "score": max_score}
    elif max_label == 'sad':
        return {"label": "Tired", "score": max_score}
    
    return {"label": "Calm", "score": max_score}

def analyze_emotion(file_path: str):
    pipe = get_emotion_pipeline()
    result = pipe(file_path, top_k=4)
    return map_emotion(result)
