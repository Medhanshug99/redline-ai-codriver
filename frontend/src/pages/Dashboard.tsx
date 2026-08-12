import { useState, useCallback, useRef } from "react";
import { motion, AnimatePresence, useMotionValue, useTransform } from "framer-motion";
import { Panel } from "../components/ui/Panel";
import { Badge } from "../components/ui/Badge";
import { WaveformPlayer } from "../components/WaveformPlayer";
import { TranscriptPanel } from "../components/TranscriptPanel";
import { LapTimeChart } from "../components/LapTimeChart";
import { MoodBadge } from "../components/MoodBadge";
import { StressHeatmap } from "../components/StressHeatmap";
import { CorrelationCard } from "../components/CorrelationCard";
import { RadioLog } from "../components/RadioLog";
import { TrackBackdrop } from "../scenes/TrackBackdrop";
import {
  Mic,
  Activity,
  Clock,
  Radio,
  TrendingUp,
  AlertTriangle,
  Loader2,
  PlayCircle,
  XCircle,
} from "lucide-react";
import { uploadAudio, runDemo, type AnalysisResponse } from "../lib/api";
import { v4 as uuidv4 } from "uuid";

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } },
};
const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } },
};

type Mood = "Calm" | "Stressed" | "Tired" | "Frustrated";

interface LogEntry {
  id: string;
  transcript: string;
  mood: Mood;
  confidence: number;
  timestamp: number;
  lap_time: number;
}

interface HeatmapEntry {
  mood: Mood;
  time: string;
  confidence: number;
}

export function Dashboard() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);

  // Parallax tilt — one global listener, throttled to rAF
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-3, 3]);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (rafId.current) return; // throttle to rAF
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      const el = e.currentTarget;
      const rect = el.getBoundingClientRect();
      mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
      mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
    });
  }, [mouseX, mouseY]);

  const processAnalysisResult = (result: AnalysisResponse) => {
    setAnalysis(result);
    setAnalysisKey((k) => k + 1);
    const entry: LogEntry = {
      id: uuidv4(),
      transcript: result.transcript,
      mood: result.mood as Mood,
      confidence: result.confidence,
      timestamp: result.timestamp,
      lap_time: result.lap_data?.lap_time || 87,
    };
    setLog((prev) => [entry, ...prev]);
    setHeatmap((prev) => [
      ...prev,
      {
        mood: result.mood as Mood,
        time: new Date(result.timestamp * 1000).toLocaleTimeString(),
        confidence: result.confidence,
      },
    ]);
  };

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await uploadAudio(file);
      processAnalysisResult(result);
    } catch (err) {
      console.error('Failed to analyze audio:', err);
      setError('Analysis failed. Make sure the backend is running.');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDemoClick = async (clipId: string = '05') => {
    setIsAnalyzing(true);
    setError(null);
    try {
      const result = await runDemo(clipId);
      processAnalysisResult(result);
    } catch (err) {
      console.error(`Failed to run demo for clip ${clipId}:`, err);
      setError(`Demo failed. Backend might be down or clip_${clipId}.wav is missing.`);
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stressScores = log.map((e) =>
    ["Stressed", "Frustrated", "Tired"].includes(e.mood)
      ? e.confidence
      : 1 - e.confidence,
  );
  const lapTimes = log.map((e) => e.lap_time);

  const flaggedKeywords = analysis?.transcript
    ? [
        "brake",
        "tyre",
        "smoke",
        "pain",
        "vision",
        "fire",
        "wall",
        "damage",
      ].filter((kw) => analysis.transcript.toLowerCase().includes(kw))
    : [];

  return (
    <>
      <TrackBackdrop mood={(analysis?.mood as "Calm" | "Stressed" | "Tired" | "Frustrated") ?? null} />
      <motion.div
        className="min-h-screen p-6 pt-8 max-w-[1440px] mx-auto"
        onMouseMove={handleMouseMove}
        style={{ perspective: 1200 }}
      >
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-text-primary flex items-center gap-3">
            RED<span className="text-accent-red">LINE</span>
            <span className="font-mono text-sm text-accent-red/70 animate-pulse flex items-center gap-1">
              <div className="w-2 h-2 rounded-full bg-accent-red/70"></div> LIVE
            </span>
          </h1>
          <p className="text-text-muted font-mono text-xs tracking-widest uppercase mt-1">
            AI Co-Driver · Driver Stress &amp; Performance Intelligence
          </p>
        </div>
        <div className="flex items-center gap-3">
          {isAnalyzing && (
            <motion.span
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="text-xs font-mono text-accent-cyan flex items-center gap-1"
            >
              <Loader2 size={12} className="animate-spin" /> Analyzing voice
              telemetry...
            </motion.span>
          )}
          {flaggedKeywords.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-accent-red/40 bg-accent-red/10 text-accent-red text-xs font-mono">
              <AlertTriangle size={12} />
              {flaggedKeywords.join(", ")} flagged
            </div>
          )}
        </div>
      </header>

      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mb-6 p-4 rounded-lg bg-accent-red/10 border border-accent-red/30 flex items-center justify-between"
          >
            <div className="flex items-center gap-3 text-accent-red">
              <AlertTriangle size={18} />
              <p className="text-sm font-medium">{error}</p>
            </div>
            <button onClick={() => setError(null)} className="text-accent-red/70 hover:text-accent-red">
              <XCircle size={18} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main Grid */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left — Voice Telemetry (col-span-5) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-5 flex flex-col gap-5"
          style={{ rotateX, rotateY, transformStyle: "preserve-3d" }}
        >
          <Panel className="flex flex-col gap-4 relative overflow-hidden">
            {/* Sweep accent line — animates in when new data arrives */}
            <AnimatePresence>
              {analysisKey > 0 && (
                <motion.div
                  key={analysisKey}
                  className="absolute top-0 left-0 right-0 h-[2px] z-20"
                  style={{ background: "var(--accent-red)", boxShadow: "0 0 8px var(--accent-red)" }}
                  initial={{ scaleX: 0, originX: 0 }}
                  animate={{ scaleX: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.4, ease: "easeOut" }}
                />
              )}
            </AnimatePresence>
            {isAnalyzing && (
              <div className="absolute inset-0 z-10 bg-void/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border border-white/10">
                <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin mb-3"></div>
                <p className="font-mono text-accent-cyan text-sm animate-pulse tracking-widest">
                  PROCESSING AI...
                </p>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
                <Mic size={14} className="text-accent-cyan" /> Voice Telemetry
              </h2>
              <Badge
                label={
                  isAnalyzing
                    ? 'Analyzing...'
                    : analysis
                      ? 'Signal Received'
                      : 'Awaiting Signal'
                }
                variant={(analysis?.mood as Mood) ?? 'Calm'}
                pulse={isAnalyzing || analysis?.mood === 'Stressed'}
              />
            </div>
            <div className="flex flex-col gap-3">
              <WaveformPlayer onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
              {!isAnalyzing && (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs font-mono text-text-muted mr-2">Demo Clips:</span>
                  <button 
                    onClick={() => handleDemoClick('05')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 05 (Ricciardo)
                  </button>
                  <button 
                    onClick={() => handleDemoClick('demo_hamilton_2018_calm')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> HAM '18
                  </button>
                  <button 
                    onClick={() => handleDemoClick('demo_hamilton_2019_calm')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> HAM '19
                  </button>
                  <button 
                    onClick={() => handleDemoClick('demo_verstappen_2019_calm')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> VER '19
                  </button>
                  <button 
                    onClick={() => handleDemoClick('demo_hamilton_2018_defending')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> HAM Defend
                  </button>
                </div>
              )}
            </div>
            <TranscriptPanel text={analysis?.transcript ?? ""} />
          </Panel>

          {/* Stress Heatmap */}
          <Panel>
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2 mb-3">
              <Activity size={14} className="text-accent-red" /> Stress Heatmap
            </h2>
            <StressHeatmap entries={heatmap} />
          </Panel>

          {/* Radio Log */}
          <Panel>
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2 mb-3">
              <Radio size={14} className="text-accent-cyan" /> Radio Log
            </h2>
            <RadioLog entries={log} />
          </Panel>
        </motion.div>

        {/* Middle — Lap Times (col-span-4) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-4 flex flex-col gap-5"
        >
          <Panel className="flex-grow">
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2 mb-2">
              <Clock size={14} className="text-stress-tired" /> Lap Time
              Telemetry
            </h2>
            {analysis?.lap_data && (
              <div className="flex gap-4 mb-4">
                <div>
                  <p className="text-xs text-text-muted font-mono">Lap</p>
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {analysis.lap_data.lap_time.toFixed(3)}s
                  </p>
                </div>
                <div>
                  <p className="text-xs text-text-muted font-mono">S1</p>
                  <p className="text-lg font-bold font-mono text-stress-calm">
                    {analysis.lap_data.sector1.toFixed(2)}s
                  </p>
                </div>
              </div>
            )}
            <LapTimeChart data={analysis?.lap_data ?? null} />
          </Panel>

          {/* Correlation Card */}
          <Panel>
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2 mb-3">
              <TrendingUp size={14} className="text-stress-calm" /> Stress ↔ Lap
              Correlation
            </h2>
            <CorrelationCard stressScores={stressScores} lapTimes={lapTimes} />
          </Panel>
        </motion.div>

        {/* Right — Mood Panel (col-span-3) */}
        <motion.div
          variants={itemVariants}
          className="lg:col-span-3 flex flex-col gap-5"
        >
          <Panel className="flex-grow flex flex-col">
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} className="text-accent-red" /> Driver Psyche
            </h2>
            <MoodBadge
              mood={(analysis?.mood as Mood) ?? null}
              confidence={analysis?.confidence ?? 0}
            />

            {/* Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: "Clips", value: log.length },
                {
                  label: "Stressed",
                  value: log.filter((e) => e.mood === "Stressed").length,
                },
                {
                  label: "Tired",
                  value: log.filter((e) => e.mood === "Tired").length,
                },
                {
                  label: "Calm",
                  value: log.filter((e) => e.mood === "Calm").length,
                },
              ].map((stat) => (
                <div
                  key={stat.label}
                  className="p-3 rounded-lg bg-void/40 border border-white/5"
                >
                  <p className="text-xs text-text-muted font-mono">
                    {stat.label}
                  </p>
                  <p className="text-2xl font-bold font-mono text-text-primary">
                    {stat.value}
                  </p>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-text-muted/50 font-mono mt-4 leading-relaxed border-t border-white/5 pt-3">
              Outputs reflect detected vocal tone patterns — not diagnostic
              claims about any individual driver's mental state.
            </p>
            <p className="text-xs text-text-muted/30 font-mono mt-2 leading-relaxed">
              Built on pretrained Hugging Face models (Whisper + wav2vec2 SER) — no fine-tuning or custom training.
            </p>
          </Panel>
        </motion.div>
      </motion.div>
      </motion.div>
    </>
  );
}
