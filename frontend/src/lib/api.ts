export const API_BASE = "http://localhost:8000/api/audio";

export interface AnalysisResponse {
  transcript: string;
  mood: "Calm" | "Stressed" | "Tired" | "Frustrated";
  confidence: number;
  timestamp: number;
  lap_data: {
    lap_time: number;
    sector1: number;
    sector2?: number;
    sector3?: number;
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
