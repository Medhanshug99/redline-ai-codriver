import { useRef, useState, useEffect } from "react";
import { Upload, Loader2, Play, Pause } from "lucide-react";
import { GlowButton } from "./ui/GlowButton";

interface Props {
  onFileSelect: (file: File) => void;
  isAnalyzing: boolean;
  /** Passed externally when a demo clip is selected – takes priority over the upload object URL */
  audioSrc?: string | null;
}

export function WaveformPlayer({ onFileSelect, isAnalyzing, audioSrc }: Props) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [localAudioUrl, setLocalAudioUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  // Whichever src is active: external (demo) wins over local (upload)
  const activeSrc = audioSrc ?? localAudioUrl;

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  // Revoke old object URL when a new file is chosen
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
      const url = URL.createObjectURL(file);
      setLocalAudioUrl(url);
      setIsPlaying(false);
      onFileSelect(file);
    }
  };

  // Revoke local URL on unmount
  useEffect(() => {
    return () => {
      if (localAudioUrl) URL.revokeObjectURL(localAudioUrl);
    };
  }, [localAudioUrl]);

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

        {isAnalyzing && (
          <span className="text-xs font-mono text-accent-cyan animate-pulse flex items-center gap-1">
            <Loader2 size={12} className="animate-spin" /> Transcribing +
            classifying emotion…
          </span>
        )}
      </div>

      {activeSrc ? (
        <div className="w-full flex flex-col gap-2">
          {activeSrc && !audioSrc && (
            <button
              onClick={togglePlay}
              className="w-9 h-9 flex items-center justify-center rounded-full bg-void border border-white/10 hover:border-accent-cyan text-accent-cyan transition-colors"
            >
              {isPlaying ? <Pause size={16} /> : <Play size={16} className="ml-0.5" />}
            </button>
          )}
          <audio
            ref={audioRef}
            key={activeSrc}
            controls
            src={activeSrc}
            className="w-full h-10 rounded-lg"
            onEnded={() => setIsPlaying(false)}
            style={{
              filter: "invert(1) hue-rotate(180deg) brightness(0.85)",
              accentColor: "var(--accent-cyan)",
            }}
          />
          <p className="text-[10px] font-mono text-text-muted/40 text-right">
            {audioSrc ? "demo clip" : "uploaded file"}
          </p>
        </div>
      ) : (
        <div className="w-full h-14 rounded-xl border border-dashed border-white/10 flex items-center justify-center text-xs text-text-muted/50 font-mono">
          No clip loaded — upload a .mp3 / .wav / .ogg or select a demo clip
        </div>
      )}
    </div>
  );
}
