import { useState } from 'react';
import { motion } from 'framer-motion';
import { Panel } from '../components/ui/Panel';
import { Badge } from '../components/ui/Badge';
import { WaveformPlayer } from '../components/WaveformPlayer';
import { TranscriptPanel } from '../components/TranscriptPanel';
import { LapTimeChart } from '../components/LapTimeChart';
import { MoodBadge } from '../components/MoodBadge';
import { StressHeatmap } from '../components/StressHeatmap';
import { CorrelationCard } from '../components/CorrelationCard';
import { RadioLog } from '../components/RadioLog';
import { Mic, Activity, Clock, Radio, TrendingUp, AlertTriangle } from 'lucide-react';
import { uploadAudio, type AnalysisResponse } from '../lib/api';
import { v4 as uuidv4 } from 'uuid';

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.08 } }
};
const itemVariants = {
  hidden: { y: 24, opacity: 0 },
  visible: { y: 0, opacity: 1, transition: { duration: 0.4 } }
};

type Mood = 'Calm' | 'Stressed' | 'Tired' | 'Frustrated';

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

  const handleFileSelect = async (file: File) => {
    setIsAnalyzing(true);
    try {
      const result = await uploadAudio(file);
      setAnalysis(result);

      const entry: LogEntry = {
        id: uuidv4(),
        transcript: result.transcript,
        mood: result.mood as Mood,
        confidence: result.confidence,
        timestamp: result.timestamp,
        lap_time: result.lap_data?.lap_time || 87,
      };
      setLog(prev => [...prev, entry]);
      setHeatmap(prev => [...prev, {
        mood: result.mood as Mood,
        time: new Date(result.timestamp * 1000).toLocaleTimeString(),
        confidence: result.confidence,
      }]);
    } catch (error) {
      console.error('Failed to analyze audio:', error);
      alert('Analysis failed. Make sure the backend is running on http://localhost:8000');
    } finally {
      setIsAnalyzing(false);
    }
  };

  const stressScores = log.map(e => ['Stressed', 'Frustrated', 'Tired'].includes(e.mood) ? e.confidence : 1 - e.confidence);
  const lapTimes = log.map(e => e.lap_time);

  const flaggedKeywords = analysis?.transcript
    ? ['brake', 'tyre', 'smoke', 'pain', 'vision', 'fire', 'wall', 'damage'].filter(kw =>
        analysis.transcript.toLowerCase().includes(kw)
      )
    : [];

  return (
    <div className="min-h-screen p-6 pt-8 max-w-[1440px] mx-auto">
      {/* Header */}
      <header className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tighter text-text-primary flex items-center gap-3">
            RED<span className="text-accent-red">LINE</span>
            <span className="font-mono text-sm text-accent-red/70 animate-pulse">● LIVE</span>
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
              <span className="animate-spin">⟳</span> Analyzing voice telemetry...
            </motion.span>
          )}
          {flaggedKeywords.length > 0 && (
            <div className="flex items-center gap-1 px-3 py-1 rounded-full border border-accent-red/40 bg-accent-red/10 text-accent-red text-xs font-mono">
              <AlertTriangle size={12} />
              {flaggedKeywords.join(', ')} flagged
            </div>
          )}
        </div>
      </header>

      {/* Main Grid */}
      <motion.div
        className="grid grid-cols-1 lg:grid-cols-12 gap-5"
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        {/* Left — Voice Telemetry (col-span-5) */}
        <motion.div variants={itemVariants} className="lg:col-span-5 flex flex-col gap-5">
          <Panel className="flex flex-col gap-4 relative">
            {isAnalyzing && (
              <div className="absolute inset-0 z-10 bg-void/80 backdrop-blur-sm flex flex-col items-center justify-center rounded-xl border border-white/10">
                <div className="w-8 h-8 border-2 border-accent-cyan/30 border-t-accent-cyan rounded-full animate-spin mb-3"></div>
                <p className="font-mono text-accent-cyan text-sm animate-pulse tracking-widest">PROCESSING AI...</p>
              </div>
            )}
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2">
                <Mic size={14} className="text-accent-cyan" /> Voice Telemetry
              </h2>
              <Badge
                label={isAnalyzing ? 'Analyzing...' : analysis ? 'Signal Received' : 'Awaiting Signal'}
                variant={analysis?.mood as Mood ?? 'Calm'}
                pulse={isAnalyzing || analysis?.mood === 'Stressed'}
              />
            </div>
            <WaveformPlayer onFileSelect={handleFileSelect} isAnalyzing={isAnalyzing} />
            <TranscriptPanel text={analysis?.transcript ?? ''} />
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
        <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col gap-5">
          <Panel className="flex-grow">
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest flex items-center gap-2 mb-2">
              <Clock size={14} className="text-stress-tired" /> Lap Time Telemetry
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
              <TrendingUp size={14} className="text-stress-calm" /> Stress ↔ Lap Correlation
            </h2>
            <CorrelationCard stressScores={stressScores} lapTimes={lapTimes} />
          </Panel>
        </motion.div>

        {/* Right — Mood Panel (col-span-3) */}
        <motion.div variants={itemVariants} className="lg:col-span-3 flex flex-col gap-5">
          <Panel className="flex-grow flex flex-col">
            <h2 className="font-mono text-text-muted text-xs uppercase tracking-widest mb-4 flex items-center gap-2">
              <Activity size={14} className="text-accent-red" /> Driver Psyche
            </h2>
            <MoodBadge mood={(analysis?.mood as Mood) ?? null} confidence={analysis?.confidence ?? 0} />

            {/* Stats Grid */}
            <div className="mt-4 grid grid-cols-2 gap-3">
              {[
                { label: 'Clips', value: log.length },
                { label: 'Stressed', value: log.filter(e => e.mood === 'Stressed').length },
                { label: 'Tired', value: log.filter(e => e.mood === 'Tired').length },
                { label: 'Calm', value: log.filter(e => e.mood === 'Calm').length },
              ].map(stat => (
                <div key={stat.label} className="p-3 rounded-lg bg-void/40 border border-white/5">
                  <p className="text-xs text-text-muted font-mono">{stat.label}</p>
                  <p className="text-2xl font-bold font-mono text-text-primary">{stat.value}</p>
                </div>
              ))}
            </div>

            {/* Disclaimer */}
            <p className="text-xs text-text-muted/50 font-mono mt-4 leading-relaxed border-t border-white/5 pt-3">
              Outputs reflect detected vocal tone patterns — not diagnostic claims about any individual driver's mental state.
            </p>
          </Panel>
        </motion.div>
      </motion.div>
    </div>
  );
}
