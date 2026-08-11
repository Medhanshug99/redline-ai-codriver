import { useRef, useEffect, useState } from "react";
import { Upload, Play, Pause, Loader2 } from "lucide-react";
import { GlowButton } from "./ui/GlowButton";

interface Props {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
}

export function WaveformPlayer({ onFileSelect, isAnalyzing }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null);
  const animFrameRef = useRef<number | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      const url = URL.createObjectURL(file);
      setAudioUrl(url);
      setIsPlaying(false);
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
      sourceRef.current = null;
      onFileSelect(file);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setupWebAudio();
      setIsPlaying(true);
    }
  };

  const setupWebAudio = () => {
    if (!audioCtxRef.current) {
      audioCtxRef.current = new AudioContext();
    }
    if (audioCtxRef.current.state === "suspended") {
      audioCtxRef.current.resume();
    }
    if (!sourceRef.current && audioRef.current) {
      sourceRef.current = audioCtxRef.current.createMediaElementSource(
        audioRef.current,
      );
      analyserRef.current = audioCtxRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      sourceRef.current.connect(analyserRef.current);
      analyserRef.current.connect(audioCtxRef.current.destination);
      drawWaveform();
    }
  };

  const drawWaveform = () => {
    if (!canvasRef.current || !analyserRef.current) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const bufferLength = analyserRef.current.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);
    const width = canvas.width;
    const height = canvas.height;

    const draw = () => {
      animFrameRef.current = requestAnimationFrame(draw);
      if (!analyserRef.current) return;
      analyserRef.current.getByteTimeDomainData(dataArray);

      ctx.fillStyle = "rgba(5, 7, 12, 0.3)";
      ctx.fillRect(0, 0, width, height);

      ctx.lineWidth = 2;
      ctx.strokeStyle = "#2be8ff";
      ctx.shadowBlur = 8;
      ctx.shadowColor = "#2be8ff";
      ctx.beginPath();

      const sliceWidth = width / bufferLength;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const v = dataArray[i] / 128.0;
        const y = (v * height) / 2;
        if (i === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
        x += sliceWidth;
      }
      ctx.lineTo(width, height / 2);
      ctx.stroke();
    };

    draw();
  };

  return (
    <div className="w-full flex flex-col gap-4">
      <div className="flex gap-3 items-center flex-wrap">
        <input
          type="file"
          accept="audio/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleFileChange}
        />
        <GlowButton
          onClick={() => fileInputRef.current?.click()}
          disabled={isAnalyzing}
          className="text-sm px-4 py-2"
        >
          <Upload size={15} className="mr-2" />
          {isAnalyzing ? "Analyzing..." : "Upload Radio Clip"}
        </GlowButton>

        {audioUrl && (
          <button
            onClick={togglePlay}
            className="w-9 h-9 flex items-center justify-center rounded-full bg-void border border-white/10 hover:border-accent-cyan text-accent-cyan transition-colors"
          >
            {isPlaying ? (
              <Pause size={16} />
            ) : (
              <Play size={16} className="ml-0.5" />
            )}
          </button>
        )}

        {isAnalyzing && (
          <span className="text-xs font-mono text-accent-cyan animate-pulse flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Transcribing +
            classifying emotion…
          </span>
        )}
      </div>

      {audioUrl && (
        <div className="w-full h-20 bg-void/50 rounded-xl border border-white/5 overflow-hidden relative">
          <canvas
            ref={canvasRef}
            width={800}
            height={80}
            className="w-full h-full"
          />
          <audio
            ref={audioRef}
            src={audioUrl}
            onEnded={() => setIsPlaying(false)}
            crossOrigin="anonymous"
          />
        </div>
      )}

      {!audioUrl && (
        <div className="w-full h-20 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-xs text-text-muted/50 font-mono">
          No clip loaded — upload a .mp3, .wav, or .ogg file
        </div>
      )}
    </div>
  );
}
