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
import { uploadAudio, runDemo, API_BASE, type AnalysisResponse } from "../lib/api";
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
  mismatch_detected?: boolean;
  mismatch_note?: string | null;
  recommended_action?: string | null;
  topic_tags?: string[];
  predicted_lap_delta?: number;
  risk_level?: string;
}

interface HeatmapEntry {
  mood: Mood;
  time: string;
  confidence: number;
}

export function Dashboard() {
  const [activeTab, setActiveTab] = useState<"live" | "overview" | "about">("live");
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisResponse | null>(null);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [heatmap, setHeatmap] = useState<HeatmapEntry[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [analysisKey, setAnalysisKey] = useState(0);
  const [demoAudioUrl, setDemoAudioUrl] = useState<string | null>(null);

  // Pit Wall Session Sequencing
  const [isSessionActive, setIsSessionActive] = useState(false);
  const sessionTimerRef = useRef<number | null>(null);

  // Parallax tilt — one global listener, throttled to rAF
  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useTransform(mouseY, [-0.5, 0.5], [3, -3]);
  const rotateY = useTransform(mouseX, [-0.5, 0.5], [-3, 3]);
  const rafId = useRef<number | null>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (rafId.current) return; // throttle to rAF
    const clientX = e.clientX;
    const clientY = e.clientY;
    const el = e.currentTarget;
    
    rafId.current = requestAnimationFrame(() => {
      rafId.current = null;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      mouseX.set((clientX - rect.left) / rect.width - 0.5);
      mouseY.set((clientY - rect.top) / rect.height - 0.5);
    });
  }, [mouseX, mouseY]);

  // Speech alert function (TTS)
  const triggerVoiceAlert = (text: string) => {
    if ("speechSynthesis" in window) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 1.05;
      utterance.pitch = 0.95;
      window.speechSynthesis.speak(utterance);
    }
  };

  const processAnalysisResult = (result: AnalysisResponse) => {
    setAnalysis(result);
    setAnalysisKey((k) => k + 1);
    const hasMismatch = result.mismatch_detected ?? result.divergence?.divergence_detected;
    if (hasMismatch) {
      triggerVoiceAlert("Caution: Suppressed Driver Stress Detected. Inspect telemetry immediately.");
    }

    const entry: LogEntry = {
      id: uuidv4(),
      transcript: result.transcript,
      mood: result.mood as Mood,
      confidence: result.confidence,
      timestamp: result.timestamp,
      lap_time: result.lap_data?.lap_time || 87,
      mismatch_detected: hasMismatch,
      mismatch_note: result.mismatch_note ?? result.divergence?.divergence_reason,
      recommended_action: result.recommended_action,
      topic_tags: result.topic_tags,
      predicted_lap_delta: result.predicted_lap_delta,
      risk_level: result.risk_level,
    };
    setLog((prev) => {
      // Prevent duplicate log entry with exact same transcript & timestamp
      if (prev.length > 0 && prev[0].transcript === entry.transcript && Math.abs(prev[0].timestamp - entry.timestamp) < 0.5) {
        return prev;
      }
      return [entry, ...prev];
    });
    setHeatmap((prev) => [
      ...prev,
      {
        mood: result.mood as Mood,
        time: new Date(result.timestamp * 1000).toLocaleTimeString(),
        confidence: result.confidence,
      },
    ]);
  };

  // Fixed F1 Discipline Branding
  const currentAccent = { color: "#ff2b3c", rgb: "255, 43, 60" };

  const handleFileSelect = async (file: File) => {
    if (isAnalyzing) return;
    setIsAnalyzing(true);
    setError(null);
    setDemoAudioUrl(null); // Clear demo audio if a file is uploaded
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

  const handleDemoClick = async (clipId: string = '05', isChained = false) => {
    if (!isChained && isAnalyzing) return; // Prevent double-triggering when user rapidly clicks
    if (!isChained) {
      // Manual click cancels active auto-session
      stopSession();
    }
    setIsAnalyzing(true);
    setError(null);
    setDemoAudioUrl(`${API_BASE}/sample/${clipId}`);
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

  const startSession = () => {
    stopSession();
    setIsSessionActive(true);
    const clips = ["05", "02", "04", "06", "00"];
    let idx = 0;

    const runNext = async () => {
      if (idx >= clips.length) {
        stopSession();
        return;
      }
      const clip = clips[idx];
      idx += 1;
      await handleDemoClick(clip, true);
    };

    runNext();
    sessionTimerRef.current = window.setInterval(runNext, 7500);
  };

  const stopSession = () => {
    setIsSessionActive(false);
    if (sessionTimerRef.current) {
      clearInterval(sessionTimerRef.current);
      sessionTimerRef.current = null;
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
      <style>{`
        :root {
          --accent-red: ${currentAccent.color};
          --border-glow: rgba(${currentAccent.rgb}, 0.25);
        }
      `}</style>
      <TrackBackdrop mood={(analysis?.mood as "Calm" | "Stressed" | "Tired" | "Frustrated") ?? null} />
      <motion.div
        className="relative z-10 min-h-screen p-6 pt-8 max-w-[1440px] mx-auto"
        onMouseMove={handleMouseMove}
        style={{ perspective: 1200 }}
      >
      {/* Header */}
      <header className="mb-8 flex items-center justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-text-primary flex items-center gap-3">
            RED<span style={{ color: currentAccent.color }}>LINE</span>
            <span style={{ color: currentAccent.color }} className="font-mono text-sm opacity-70 animate-pulse flex items-center gap-1">
              <div className="w-2 h-2 rounded-full" style={{ backgroundColor: currentAccent.color }}></div> LIVE
            </span>
          </h1>
          <p className="text-text-muted font-mono text-xs tracking-widest uppercase mt-1">
            AI Co-Driver · Driver Stress &amp; Performance Intelligence
          </p>
        </div>

        {/* Header Session Controls */}
        <div className="flex items-center gap-3 flex-wrap">
          {/* Pit Wall Mode Trigger */}
          <button
            onClick={isSessionActive ? stopSession : startSession}
            style={{
              borderColor: `rgba(${currentAccent.rgb}, 0.4)`,
              backgroundColor: isSessionActive ? "rgba(239, 68, 68, 0.15)" : `rgba(${currentAccent.rgb}, 0.15)`,
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-text-primary text-xs font-mono font-bold shadow-[0_0_12px_rgba(255,255,255,0.05)] transition-all hover:brightness-110"
          >
            <Activity size={12} className={isSessionActive ? "animate-pulse" : ""} />
            {isSessionActive ? "STOP PIT WALL" : "START PIT WALL"}
          </button>
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
          {(analysis?.mismatch_detected || analysis?.divergence?.divergence_detected) && (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="flex items-center gap-1.5 px-3 py-1 rounded-full border border-purple-500/50 bg-purple-500/15 text-purple-300 text-xs font-mono shadow-[0_0_12px_rgba(168,85,247,0.3)]"
            >
              <AlertTriangle size={13} className="text-purple-400 animate-pulse" />
              HIDDEN STRESS DETECTED
            </motion.div>
          )}
          {flaggedKeywords.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-accent-red/40 bg-accent-red/10 text-accent-red text-xs font-mono">
              <AlertTriangle size={12} />
              {flaggedKeywords.join(", ")} flagged
            </div>
          )}
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-2 mb-6 border-b border-white/10 pb-3">
        <button
          onClick={() => setActiveTab("live")}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
            activeTab === "live"
              ? "bg-accent-red/20 text-accent-red border border-accent-red/40 shadow-[0_0_12px_rgba(255,43,60,0.2)]"
              : "bg-void/40 text-text-muted hover:text-text-primary border border-white/5"
          }`}
        >
          LIVE TELEMETRY
        </button>
        <button
          onClick={() => setActiveTab("overview")}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
            activeTab === "overview"
              ? "bg-accent-cyan/20 text-accent-cyan border border-accent-cyan/40 shadow-[0_0_12px_rgba(43,232,255,0.2)]"
              : "bg-void/40 text-text-muted hover:text-text-primary border border-white/5"
          }`}
        >
          DRIVER DEBRIEF ({log.length})
        </button>
        <button
          onClick={() => setActiveTab("about")}
          className={`px-4 py-2 rounded-lg font-mono text-xs font-semibold transition-all ${
            activeTab === "about"
              ? "bg-purple-500/20 text-purple-300 border border-purple-500/40 shadow-[0_0_12px_rgba(168,85,247,0.2)]"
              : "bg-void/40 text-text-muted hover:text-text-primary border border-white/5"
          }`}
        >
          SYSTEM STATUS
        </button>
      </div>

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

      {/* TAB 1: LIVE TELEMETRY DASHBOARD */}
      {activeTab === "live" && (
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
              <WaveformPlayer onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} audioSrc={demoAudioUrl} />
              {!isAnalyzing && (
                <div className="flex gap-2 items-center flex-wrap">
                  <span className="text-xs font-mono text-text-muted mr-2">Demo Clips:</span>
                  {/* Clip IDs match real extracted files: clip_00.wav … clip_09.wav */}
                  <button 
                    onClick={() => handleDemoClick('05')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 05
                  </button>
                  <button 
                    onClick={() => handleDemoClick('02')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 02
                  </button>
                  <button 
                    onClick={() => handleDemoClick('04')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 04
                  </button>
                  <button 
                    onClick={() => handleDemoClick('06')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 06
                  </button>
                  <button 
                    onClick={() => handleDemoClick('00')}
                    className="flex items-center gap-1.5 h-8 px-3 rounded bg-void border border-white/10 hover:border-accent-cyan text-text-muted hover:text-accent-cyan transition-colors text-xs font-mono"
                  >
                    <PlayCircle size={14} /> Clip 00
                  </button>
                </div>
              )}
            </div>
            <TranscriptPanel
              text={analysis?.transcript ?? ""}
              recommendedAction={analysis?.recommended_action}
            />
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
              <div className="flex flex-col gap-3 mb-4">
                <div className="flex gap-4 items-center flex-wrap tabular-nums font-mono">
                  <div className="bg-void/60 px-3 py-1.5 rounded border border-white/10">
                    <p className="text-[10px] text-text-muted uppercase tracking-widest">Timing Tower · Lap #{analysis.lap_data.lap ?? '—'}</p>
                    <p className="text-3xl font-bold text-text-primary tracking-tight">
                      {analysis.lap_data.lap_time.toFixed(3)}s
                    </p>
                  </div>
                  <div className="flex gap-3">
                    <div className="bg-void/40 px-2.5 py-1 rounded border border-white/5">
                      <p className="text-[10px] text-text-muted">S1</p>
                      <p className="text-base font-bold text-stress-calm">
                        {analysis.lap_data.sector1.toFixed(3)}s
                      </p>
                    </div>
                    {analysis.lap_data.sector2 != null && (
                      <div className="bg-void/40 px-2.5 py-1 rounded border border-white/5">
                        <p className="text-[10px] text-text-muted">S2</p>
                        <p className="text-base font-bold text-stress-tired">
                          {analysis.lap_data.sector2.toFixed(3)}s
                        </p>
                      </div>
                    )}
                    {analysis.lap_data.sector3 != null && (
                      <div className="bg-void/40 px-2.5 py-1 rounded border border-white/5">
                        <p className="text-[10px] text-text-muted">S3</p>
                        <p className="text-base font-bold text-stress-stressed">
                          {analysis.lap_data.sector3.toFixed(3)}s
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Risk and Topic Tags Row */}
                <div className="flex gap-2 items-center flex-wrap mt-1">
                  {analysis.risk_level && (
                    <div className={`px-2.5 py-1 rounded text-xs font-mono font-bold border ${
                      analysis.risk_level === "CRITICAL"
                        ? "bg-accent-red/20 text-accent-red border-accent-red/40 animate-pulse"
                        : analysis.risk_level === "ELEVATED"
                          ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                          : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                    }`}>
                      RISK: {analysis.risk_level} ({analysis.predicted_lap_delta != null ? (analysis.predicted_lap_delta > 0 ? `+${analysis.predicted_lap_delta}s` : `${analysis.predicted_lap_delta}s`) : "0.000s"})
                    </div>
                  )}
                  {analysis.topic_tags && analysis.topic_tags.map((tag) => (
                    <span
                      key={tag}
                      className="px-2 py-1 rounded bg-white/5 border border-white/10 text-text-primary text-[10px] font-mono font-bold uppercase tracking-wider"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>

                {/* SVG Checkered Flag Sector Divider */}
                <div className="h-1 w-full flex items-center opacity-30">
                  <svg className="w-full h-1" preserveAspectRatio="none" viewBox="0 0 200 4">
                    <pattern id="checkeredPattern" width="8" height="4" patternUnits="userSpaceOnUse">
                      <rect width="4" height="2" fill="#ffffff" />
                      <rect x="4" width="4" height="2" fill="#000000" />
                      <rect y="2" width="4" height="2" fill="#000000" />
                      <rect x="4" y="2" width="4" height="2" fill="#ffffff" />
                    </pattern>
                    <rect width="200" height="4" fill="url(#checkeredPattern)" />
                  </svg>
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
              divergence={analysis?.divergence}
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
      )}

      {/* TAB 2: DRIVER DEBRIEF & SESSION SUMMARY */}
      {activeTab === "overview" && (
        <Panel className="w-full flex flex-col gap-6">
          <div className="flex items-center justify-between border-b border-white/10 pb-3 flex-wrap gap-2">
            <h2 className="font-mono text-sm uppercase tracking-widest text-accent-cyan flex items-center gap-2">
              <Radio size={16} /> Driver Debrief &amp; Post-Session Analysis ({log.length} Transmissions)
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs font-mono text-text-muted">
                Race Engineer Performance Report
              </span>
            </div>
          </div>

          {log.length === 0 ? (
            <div className="py-12 text-center text-text-muted/60 font-mono text-xs">
              No radio transmissions recorded for this debrief yet. Run demo clips or upload audio in Live Telemetry.
            </div>
          ) : (
            <>
              {/* A4: Session Summary Metric Cards */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono">
                {(() => {
                  const calmCount = log.filter((e) => e.mood === "Calm").length;
                  const stressedCount = log.filter((e) => e.mood === "Stressed" || e.mood === "Frustrated").length;
                  const tiredCount = log.filter((e) => e.mood === "Tired").length;
                  const mismatchCount = log.filter((e) => e.mismatch_detected).length;
                  const dominantMood = calmCount >= stressedCount && calmCount >= tiredCount ? "Calm" : stressedCount > calmCount ? "Stressed" : "Tired";
                  const avgDelta = (log.reduce((acc, e) => acc + (e.predicted_lap_delta || 0), 0) / log.length).toFixed(3);
                  const hasCritical = log.some((e) => e.risk_level === "CRITICAL");
                  const sessionRisk = hasCritical ? "CRITICAL" : log.some((e) => e.risk_level === "ELEVATED") ? "ELEVATED" : "LOW";

                  return [
                    { label: "Dominant Mood", value: dominantMood, color: dominantMood === "Calm" ? "text-stress-calm" : "text-stress-stressed" },
                    { label: "Hidden Stress Events", value: `${mismatchCount} / ${log.length}`, color: mismatchCount > 0 ? "text-purple-400 font-bold" : "text-text-primary" },
                    { label: "Avg Projected Delta", value: `+${avgDelta}s`, color: Number(avgDelta) > 0.3 ? "text-accent-red" : "text-accent-cyan" },
                    { label: "Overall Session Risk", value: sessionRisk, color: sessionRisk === "CRITICAL" ? "text-accent-red animate-pulse font-bold" : sessionRisk === "ELEVATED" ? "text-amber-400" : "text-emerald-400" },
                  ].map((card) => (
                    <div key={card.label} className="p-3 rounded-lg bg-void/50 border border-white/10 flex flex-col justify-between">
                      <span className="text-[10px] text-text-muted uppercase tracking-wider">{card.label}</span>
                      <span className={`text-xl font-bold mt-1 ${card.color}`}>{card.value}</span>
                    </div>
                  ));
                })()}
              </div>

              {/* A4: Generated Race Engineer Debrief Summary Paragraph with Generate Pit Briefing Button */}
              <div className="p-4 rounded-xl bg-void/60 border border-accent-cyan/30 flex flex-col gap-3 font-mono text-xs shadow-[0_0_15px_rgba(43,232,255,0.05)]">
                <div className="flex items-center justify-between flex-wrap gap-2 border-b border-white/5 pb-2">
                  <span className="text-accent-cyan font-bold uppercase tracking-wider text-xs flex items-center gap-2">
                    <Activity size={14} /> Race Engineer Session Summary Briefing
                  </span>
                  <button
                    onClick={() => {
                      // Trigger visual refresh & optional TTS briefing read
                      triggerVoiceAlert("Generating Pit Briefing summary from session telemetry.");
                      setAnalysisKey((k) => k + 1);
                    }}
                    className="px-3 py-1 rounded bg-accent-cyan/15 hover:bg-accent-cyan/25 border border-accent-cyan/40 text-accent-cyan font-bold transition-all text-[11px] flex items-center gap-1.5 shadow-[0_0_10px_rgba(43,232,255,0.15)]"
                  >
                    <Radio size={12} /> Generate Pit Briefing
                  </button>
                </div>
                <p className="text-text-primary leading-relaxed">
                  {(() => {
                    const calmCount = log.filter((e) => e.mood === "Calm").length;
                    const stressedCount = log.filter((e) => e.mood === "Stressed" || e.mood === "Frustrated").length;
                    const tiredCount = log.filter((e) => e.mood === "Tired").length;
                    const mismatchCount = log.filter((e) => e.mismatch_detected).length;
                    const actionsTriggered = Array.from(new Set(log.map((e) => e.recommended_action).filter(Boolean)));
                    const allTags = Array.from(new Set(log.flatMap((e) => e.topic_tags || [])));
                    const avgDelta = (log.reduce((acc, e) => acc + (e.predicted_lap_delta || 0), 0) / log.length).toFixed(3);
                    
                    const dominantMood = calmCount >= stressedCount && calmCount >= tiredCount ? "composed and steady" : stressedCount > calmCount ? "elevated stress levels" : "fatigue markers";
                    
                    return `Session Analysis (${log.length} transmissions): Driver acoustic profile was predominantly ${dominantMood} (${calmCount} Calm, ${stressedCount} Stressed/Frustrated, ${tiredCount} Tired). ${mismatchCount > 0 ? `Flagged ${mismatchCount} Hidden Stress Divergence incident(s) where vocal tone masked transcript distress.` : "Zero suppressed stress mismatches detected."} ${allTags.length > 0 ? `Primary topics discussed: ${allTags.join(", ")}.` : ""} Projected session lap delta impact: +${avgDelta}s. ${actionsTriggered.length > 0 ? `Recommended pit wall actions issued: ${actionsTriggered.join("; ")}.` : "No emergency pit actions required."}`;
                  })()}
                </p>
              </div>

              {/* Full Session Transmissions Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-xs">
                  <thead>
                    <tr className="border-b border-white/10 text-text-muted uppercase text-[11px] bg-void/50">
                      <th className="py-3 px-4">#</th>
                      <th className="py-3 px-4">Time</th>
                      <th className="py-3 px-4">Transcript</th>
                      <th className="py-3 px-4">Topics</th>
                      <th className="py-3 px-4">SER Mood</th>
                      <th className="py-3 px-4">Lap Time</th>
                      <th className="py-3 px-4">Risk / Delta</th>
                      <th className="py-3 px-4">Hidden Stress</th>
                      <th className="py-3 px-4">Action Triggered</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {log.map((entry, index) => (
                      <tr key={entry.id} className="hover:bg-white/[0.02]">
                        <td className="py-3 px-4 font-bold text-text-muted">#{log.length - index}</td>
                        <td className="py-3 px-4 text-text-muted">
                          {new Date(entry.timestamp * 1000).toLocaleTimeString()}
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-text-primary">
                          "{entry.transcript}"
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex gap-1 flex-wrap">
                            {entry.topic_tags && entry.topic_tags.length > 0 ? (
                              entry.topic_tags.map((t) => (
                                <span key={t} className="px-1.5 py-0.5 rounded bg-white/5 border border-white/10 text-[9px] uppercase tracking-wider text-text-muted">
                                  {t}
                                </span>
                              ))
                            ) : (
                              <span className="text-text-muted/40">—</span>
                            )}
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <Badge label={entry.mood} variant={entry.mood} />
                        </td>
                        <td className="py-3 px-4 font-bold text-accent-cyan tabular-nums">
                          {entry.lap_time.toFixed(3)}s
                        </td>
                        <td className="py-3 px-4">
                          {entry.risk_level ? (
                            <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${
                              entry.risk_level === "CRITICAL"
                                ? "bg-accent-red/20 text-accent-red border-accent-red/40"
                                : entry.risk_level === "ELEVATED"
                                  ? "bg-amber-500/20 text-amber-400 border-amber-500/40"
                                  : "bg-emerald-500/20 text-emerald-400 border-emerald-500/40"
                            }`}>
                              {entry.risk_level} (+{entry.predicted_lap_delta?.toFixed(3) ?? "0.000"}s)
                            </span>
                          ) : (
                            <span className="text-text-muted/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {entry.mismatch_detected ? (
                            <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/40 text-[10px] font-bold">
                              FLAGGED
                            </span>
                          ) : (
                            <span className="text-text-muted/40">—</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          {entry.recommended_action ? (
                            <span className="px-2 py-0.5 rounded bg-amber-500/15 text-amber-300 border border-amber-500/30 text-[10px] font-bold">
                              {entry.recommended_action}
                            </span>
                          ) : (
                            <span className="text-text-muted/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </Panel>
      )}

      {/* TAB 3: SYSTEM STATUS (Live Model Indicators & Engineering Diagnostics) */}
      {activeTab === "about" && (
        <Panel className="w-full max-w-5xl mx-auto flex flex-col gap-6 font-mono text-xs">
          {/* Header */}
          <div className="border-b border-white/10 pb-4 flex items-center justify-between flex-wrap gap-2">
            <div>
              <h2 className="text-xl font-bold text-text-primary flex items-center gap-3">
                RED<span className="text-accent-red">LINE</span> System Diagnostics &amp; Model Registry
              </h2>
              <p className="text-[11px] text-text-muted mt-1 uppercase tracking-wider">
                Live Hugging Face ML Pipelines · Signal Cross-Validation · Latency Profiling
              </p>
            </div>
            <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/15 border border-emerald-500/40 text-emerald-400 text-xs">
              <div className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
              FASTAPI LOCAL SERVER (PORT 8000)
            </div>
          </div>

          {/* Model Registry Cards */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {/* Model 1: Whisper-Base */}
            <div className="p-4 rounded-xl bg-void/60 border border-accent-cyan/40 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-accent-cyan text-sm uppercase">1. Transcription</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  LOADED / READY
                </span>
              </div>
              <div className="flex flex-col gap-1 text-[11px]">
                <p className="text-text-muted">Model ID: <code className="text-text-primary">openai/whisper-base</code></p>
                <p className="text-text-muted">Framework: <span className="text-text-primary">Transformers Pipeline (ASR)</span></p>
                <p className="text-text-muted">Execution: <span className="text-emerald-400 font-bold">Local CPU Inference</span></p>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Latest Clip Latency:</span>
                <span className="text-accent-cyan font-bold tabular-nums">
                  {analysis?.latency ? `${analysis.latency.transcription_ms} ms` : "Awaiting first clip"}
                </span>
              </div>
            </div>

            {/* Model 2: wav2vec2-er SER */}
            <div className="p-4 rounded-xl bg-void/60 border border-purple-500/40 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-purple-300 text-sm uppercase">2. Voice Tone SER</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  LOADED / READY
                </span>
              </div>
              <div className="flex flex-col gap-1 text-[11px]">
                <p className="text-text-muted">Model ID: <code className="text-text-primary">superb/wav2vec2-base-superb-er</code></p>
                <p className="text-text-muted">Classes: <span className="text-text-primary">Neutral, Happy, Angry, Sad</span></p>
                <p className="text-text-muted">Driver Mood Map: <span className="text-purple-300 font-bold">Calm / Stressed / Frustrated / Tired</span></p>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Latest SER Latency:</span>
                <span className="text-purple-300 font-bold tabular-nums">
                  {analysis?.latency ? `${analysis.latency.emotion_ms} ms` : "Awaiting first clip"}
                </span>
              </div>
            </div>

            {/* Model 3: Cardiff NLP Sentiment & Divergence */}
            <div className="p-4 rounded-xl bg-void/60 border border-amber-500/40 flex flex-col justify-between gap-3">
              <div className="flex items-center justify-between">
                <span className="font-bold text-amber-400 text-sm uppercase">3. Hidden Stress Engine</span>
                <span className="px-2 py-0.5 rounded bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-[10px] font-bold">
                  ACTIVE
                </span>
              </div>
              <div className="flex flex-col gap-1 text-[11px]">
                <p className="text-text-muted">Text Classifier: <code className="text-text-primary">cardiffnlp/twitter-roberta-base-sentiment-latest</code></p>
                <p className="text-text-muted">Method: <span className="text-amber-300 font-bold">Acoustic ↔ Semantic Cross-Check</span></p>
                <p className="text-text-muted">Rule Overrides: <span className="text-text-primary font-bold">Two-Tier Emergency Lexicon</span></p>
              </div>
              <div className="pt-2 border-t border-white/5 flex justify-between items-center text-[11px]">
                <span className="text-text-muted">Divergence Latency:</span>
                <span className="text-amber-400 font-bold tabular-nums">
                  {analysis?.latency ? `${analysis.latency.divergence_ms} ms` : "Awaiting first clip"}
                </span>
              </div>
            </div>
          </div>

          {/* Real Live Latency & Pipeline Metrics */}
          <div className="p-4 rounded-xl bg-void/50 border border-white/10 flex flex-col gap-3">
            <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <Activity size={14} className="text-accent-cyan" /> End-to-End Latency Breakdown (Last Analyzed Transmission)
            </span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-lg bg-void/60 border border-white/5">
                <span className="text-[10px] text-text-muted uppercase">ASR Latency</span>
                <p className="text-lg font-bold text-accent-cyan mt-0.5 tabular-nums">
                  {analysis?.latency?.transcription_ms ? `${analysis.latency.transcription_ms} ms` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-void/60 border border-white/5">
                <span className="text-[10px] text-text-muted uppercase">SER Latency</span>
                <p className="text-lg font-bold text-purple-300 mt-0.5 tabular-nums">
                  {analysis?.latency?.emotion_ms ? `${analysis.latency.emotion_ms} ms` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-void/60 border border-white/5">
                <span className="text-[10px] text-text-muted uppercase">Divergence Check</span>
                <p className="text-lg font-bold text-amber-400 mt-0.5 tabular-nums">
                  {analysis?.latency?.divergence_ms ? `${analysis.latency.divergence_ms} ms` : "—"}
                </p>
              </div>
              <div className="p-3 rounded-lg bg-void/60 border border-white/5">
                <span className="text-[10px] text-text-muted uppercase">Total Inference</span>
                <p className="text-lg font-bold text-emerald-400 mt-0.5 tabular-nums">
                  {analysis?.latency?.total_ms ? `${analysis.latency.total_ms} ms` : "—"}
                </p>
              </div>
            </div>
          </div>

          {/* Statistical Rigor & Sample Size Gates */}
          <div className="p-4 rounded-xl bg-void/50 border border-white/10 flex flex-col gap-3">
            <span className="font-bold text-text-primary text-xs uppercase tracking-wider flex items-center gap-2">
              <TrendingUp size={14} className="text-accent-red" /> Statistical Thresholds &amp; Quality Controls
            </span>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-[11px] leading-relaxed text-text-muted">
              <div className="p-3 rounded bg-void/30 border border-white/5 flex flex-col gap-1">
                <span className="text-accent-red font-bold uppercase">Pearson r Sample Gate: 5+ Transmissions</span>
                <p>To eliminate spurious ±1.00 correlation artifacts from small sample sizes (N &lt; 5), Pearson r calculations and sparkline projections are strictly gated until 5 or more audio clips have been processed.</p>
              </div>
              <div className="p-3 rounded bg-void/30 border border-white/5 flex flex-col gap-1">
                <span className="text-accent-cyan font-bold uppercase">Predicted Lap Delta Linear Model</span>
                <p>Projected next-lap cost evaluates driver acoustic stress trajectory over a moving window of N=4 clips (delta_t = stress_delta * 0.65s), gated at N &gt;= 5 clips.</p>
              </div>
            </div>
          </div>

          {/* Honest Architecture & Data Disclosure */}
          <div className="p-5 rounded-xl bg-void/40 border border-white/10 flex flex-col gap-3">
            <h3 className="font-bold text-text-primary text-sm uppercase tracking-wider flex items-center gap-2">
              <Clock size={16} className="text-accent-cyan" /> Core Architecture Summary
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-text-muted text-[11px] leading-relaxed">
              <div className="p-3 rounded bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="font-bold text-emerald-400 uppercase">Two Independent Signal Sources</span>
                <p>REDLINE cross-checks acoustic vocal tone from Speech Emotion Recognition against semantic transcript sentiment. If tone suggests "Calm" but words indicate distress ("brake failure", "losing it"), the system triggers a <strong>Hidden Stress Divergence</strong> flag to prevent model blind spots.</p>
              </div>
              <div className="p-3 rounded bg-white/[0.02] border border-white/5 flex flex-col gap-1">
                <span className="font-bold text-amber-400 uppercase">Pretrained Hugging Face Models (No Fine-Tuning)</span>
                <p>All models run without custom weight retraining or fine-tuning, maximizing auditability. Audio is sourced from real Formula 1 team radio datasets (<code className="text-text-primary">MikCil/f1-team-radio</code>) and evaluated locally on CPU.</p>
              </div>
            </div>
          </div>
        </Panel>
      )}
      </motion.div>
    </>
  );
}
