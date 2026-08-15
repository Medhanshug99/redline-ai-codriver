const API_BASE_DEFAULT = "http://localhost:8000/api/audio";

export const API_BASE: string =
  (import.meta as unknown as { env: Record<string, string> }).env?.VITE_API_BASE ?? API_BASE_DEFAULT;

export interface AnalysisResponse {
  transcript: string;
  mood: "Calm" | "Stressed" | "Tired" | "Frustrated";
  confidence: number;
  timestamp: number;
  lap_data: {
    lap: number;
    lap_time: number;
    sector1: number;
    sector2?: number;
    sector3?: number;
  };
  divergence?: {
    divergence_detected: boolean;
    divergence_reason: string | null;
    text_sentiment: string;
    distress_score: number;
  };
  mismatch_detected?: boolean;
  mismatch_note?: string | null;
  text_sentiment?: string;
  text_distress_score?: number;
  recommended_action?: string | null;
  topic_tags?: string[];
  predicted_lap_delta?: number;
  risk_level?: "LOW" | "ELEVATED" | "CRITICAL";
  latency?: {
    transcription_ms: number;
    emotion_ms: number;
    divergence_ms: number;
    total_ms: number;
  };
}

export async function uploadAudio(file: File): Promise<AnalysisResponse> {
  const formData = new FormData();
  formData.append("file", file);

  const response = await fetch(`${API_BASE}/upload`, {
    method: "POST",
    body: formData,
  });

  if (!response.ok) {
    throw new Error("Upload failed");
  }

  return response.json();
}

export async function runDemo(clipId: string = '05'): Promise<AnalysisResponse> {
  const response = await fetch(`${API_BASE}/demo?clip_id=${clipId}`, {
    method: "POST",
  });

  if (!response.ok) {
    throw new Error("Demo request failed");
  }

  const data = await response.json();
  if (data.error) {
    throw new Error(data.error);
  }
  
  return data;
}

export interface SessionSummary {
  clips_analysed?: number;
  dominant_mood?: string;
  mood_distribution?: Record<string, number>;
  avg_distress_score?: number;
  avg_lap_delta?: number;
  session_risk?: "LOW" | "ELEVATED" | "CRITICAL";
  hidden_stress_count?: number;
  top_topics?: string[];
  topic_distribution?: Record<string, number>;
  summary_text?: string;
  message?: string;
}

export async function fetchSessionSummary(): Promise<SessionSummary> {
  const response = await fetch(`${API_BASE}/summary`);
  if (!response.ok) {
    throw new Error("Failed to fetch session summary");
  }
  return response.json();
}

export async function resetSession(): Promise<void> {
  await fetch(`${API_BASE}/session/reset`, { method: "POST" });
}

