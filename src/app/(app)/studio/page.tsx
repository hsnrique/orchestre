"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth-context";
import { db, storage } from "@/lib/firebase";
import { collection, addDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { INSPIRATIONS } from "@/lib/inspirations";
import gsap from "gsap";

const GENRES = [
  "Lo-Fi Hip Hop", "Synthpop", "EDM", "Indie Folk", "Jazz Fusion",
  "Deep House", "R&B", "Chillout", "Classic Rock", "Bossa Nova",
  "Trap Beat", "Reggae", "Afrobeat", "Ambient", "Blues Rock",
];
const MOODS = [
  "Dreamy", "Upbeat", "Emotional", "Funky", "Chill",
  "Ethereal", "Danceable", "Dark", "Bright", "Psychedelic",
];
const INSTRUMENTS = [
  "Piano", "Guitar", "Synth Pads", "808 Hip Hop Beat", "Violin",
  "Trumpet", "Harmonica", "Flute", "Bass", "Drums",
];

type Step = "describe" | "creating" | "result";
type DescribeMode = "simple" | "advanced";
type MusicEngine = "minimax" | "suno";

export default function StudioPage() {
  const { user, profile } = useAuth();
  const [step, setStep] = useState<Step>("describe");
  const [describeMode, setDescribeMode] = useState<DescribeMode>("simple");
  const [engine, setEngine] = useState<MusicEngine>("minimax");
  const [description, setDescription] = useState("");
  const [selectedInspirations, setSelectedInspirations] = useState<string[]>([]);
  const [inspirationSearch, setInspirationSearch] = useState("");
  const [selectedGenre, setSelectedGenre] = useState("");
  const [selectedMood, setSelectedMood] = useState("");
  const [selectedInstruments, setSelectedInstruments] = useState<string[]>([]);
  const [bpm, setBpm] = useState([120]);
  const [title, setTitle] = useState("");
  const [lyrics, setLyrics] = useState("");
  const [coverImage, setCoverImage] = useState("");
  const [audioUrl, setAudioUrl] = useState("");
  const [lyricsReady, setLyricsReady] = useState(false);
  const [coverReady, setCoverReady] = useState(false);
  const [musicReady, setMusicReady] = useState(false);
  const [isPublic, setIsPublic] = useState(true);
  const [saved, setSaved] = useState(false);
  const [creatingPhase, setCreatingPhase] = useState("");
  const [error, setError] = useState("");
  const stepRef = useRef<HTMLDivElement>(null);

  const animateStep = useCallback(() => {
    if (stepRef.current) {
      gsap.fromTo(stepRef.current, { opacity: 0, y: 20 }, { opacity: 1, y: 0, duration: 0.6, ease: "power3.out" });
    }
  }, []);

  useEffect(() => { animateStep(); }, [step, animateStep]);

  const toggleInstrument = (inst: string) => {
    setSelectedInstruments((prev) => prev.includes(inst) ? prev.filter((i) => i !== inst) : [...prev, inst]);
  };

  const buildStylePrompt = () => {
    if (describeMode === "simple") return [description, ...selectedInspirations].filter(Boolean).join(", ");
    return [selectedGenre, selectedMood, ...selectedInstruments].filter(Boolean).join(", ");
  };

  const saveToFirebase = async (genTitle: string, genLyrics: string, genCover: string, genAudio: string) => {
    if (!user) return;
    try {
      let coverUrl = "";
      if (genCover) {
        const coverBlob = await fetch(genCover).then((r) => r.blob());
        const coverRef = ref(storage, `covers/${user.uid}/${Date.now()}.png`);
        await uploadBytes(coverRef, coverBlob);
        coverUrl = await getDownloadURL(coverRef);
      }
      let savedAudioUrl = genAudio;
      if (genAudio) {
        const audioBlob = await fetch(genAudio).then((r) => r.blob());
        const audioRef = ref(storage, `tracks/${user.uid}/${Date.now()}.mp3`);
        await uploadBytes(audioRef, audioBlob);
        savedAudioUrl = await getDownloadURL(audioRef);
      }
      await addDoc(collection(db, "tracks"), {
        userId: user.uid,
        username: profile?.username || "",
        userAvatarUrl: profile?.avatarUrl || "",
        title: genTitle, lyrics: genLyrics,
        genre: describeMode === "simple" ? selectedInspirations.join(", ") : selectedGenre,
        mood: describeMode === "simple" ? "" : selectedMood,
        instruments: describeMode === "simple" ? [] : selectedInstruments,
        bpm: bpm[0], coverUrl, audioUrl: savedAudioUrl, prompt: description,
        engine, isPublic,
        plays: 0, likes: 0,
        createdAt: serverTimestamp(),
      });
      setSaved(true);
    } catch {
      console.error("Auto-save failed");
    }
  };

  const startCreation = async () => {
    setStep("creating");
    setError("");
    setLyricsReady(false);
    setCoverReady(false);
    setMusicReady(false);
    setSaved(false);
    setCoverImage("");
    setAudioUrl("");
    setCreatingPhase("Composing lyrics...");

    try {
      const theme = describeMode === "simple"
        ? [description, selectedInspirations.length > 0 ? `Style: ${selectedInspirations.join(", ")}` : ""].filter(Boolean).join(". ")
        : description;
      const genre = describeMode === "simple" ? selectedInspirations[0] || "" : selectedGenre;
      const mood = describeMode === "simple" ? selectedInspirations[1] || "" : selectedMood;

      const lyricsRes = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, mood, theme }),
      });
      const lyricsData = await lyricsRes.json();
      const genTitle = lyricsData.title || "Untitled";
      const genLyrics = lyricsData.lyrics || "";

      setTitle(genTitle);
      setLyrics(genLyrics);
      if (selectedInspirations.length === 0 && Array.isArray(lyricsData.inspirations)) {
        setSelectedInspirations(lyricsData.inspirations.slice(0, 5));
      }
      setLyricsReady(true);
      setCreatingPhase("Producing your track...");

      let genCover = "";
      let genAudio = "";

      const coverPromise = fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: genTitle, genre, mood }),
      }).then((r) => r.json()).then((data) => {
        genCover = data.image || "";
        setCoverImage(genCover);
        setCoverReady(true);
      });

      const musicEndpoint = engine === "suno" ? "/api/suno" : "/api/music";
      const musicBody = engine === "suno"
        ? { prompt: buildStylePrompt(), lyrics: genLyrics, title: genTitle, style: buildStylePrompt() }
        : { prompt: buildStylePrompt(), lyrics: genLyrics };

      const musicPromise = fetch(musicEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(musicBody),
      }).then((r) => r.json()).then((data) => {
        if (data.audioUrl) {
          genAudio = data.audioUrl;
          setAudioUrl(genAudio);
          setMusicReady(true);
        } else { throw new Error(data.error || "Music generation failed"); }
      });

      await Promise.all([coverPromise, musicPromise]);
      setCreatingPhase("Saving to library...");
      await saveToFirebase(genTitle, genLyrics, genCover, genAudio);
      setStep("result");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong. Try again.");
      setCreatingPhase("");
    }
  };

  const resetStudio = () => {
    setStep("describe");
    setDescription(""); setSelectedInspirations([]); setInspirationSearch("");
    setSelectedGenre(""); setSelectedMood(""); setSelectedInstruments([]);
    setBpm([120]); setTitle(""); setLyrics(""); setCoverImage("");
    setAudioUrl(""); setLyricsReady(false); setCoverReady(false);
    setMusicReady(false); setSaved(false); setCreatingPhase(""); setError("");
  };

  return (
    <div className="min-h-screen p-8 max-w-4xl mx-auto">
      <StudioHeader step={step} />
      <div ref={stepRef}>
        {step === "describe" && (
          <DescribeStep mode={describeMode} setMode={setDescribeMode}
            engine={engine} setEngine={setEngine}
            description={description} setDescription={setDescription}
            selectedInspirations={selectedInspirations} setSelectedInspirations={setSelectedInspirations}
            inspirationSearch={inspirationSearch} setInspirationSearch={setInspirationSearch}
            selectedGenre={selectedGenre} setSelectedGenre={setSelectedGenre}
            selectedMood={selectedMood} setSelectedMood={setSelectedMood}
            selectedInstruments={selectedInstruments} toggleInstrument={toggleInstrument}
            bpm={bpm} setBpm={setBpm}
            isPublic={isPublic} setIsPublic={setIsPublic}
            onStart={startCreation} />
        )}
        {step === "creating" && (
          <CreatingStep phase={creatingPhase} error={error}
            lyricsReady={lyricsReady} coverReady={coverReady} musicReady={musicReady}
            title={title} coverImage={coverImage}
            onRetry={startCreation} onBack={resetStudio} />
        )}
        {step === "result" && (
          <ResultStep title={title} lyrics={lyrics} coverImage={coverImage}
            audioUrl={audioUrl} saved={saved} onNewTrack={resetStudio} />
        )}
      </div>
    </div>
  );
}

/* ─── Header ────────────────────────────────────────────────────────────── */

function StudioHeader({ step }: { step: Step }) {
  const steps = [
    { key: "describe", label: "Describe" },
    { key: "creating", label: "Creating" },
    { key: "result", label: "Result" },
  ];
  const currentIndex = steps.findIndex((s) => s.key === step);

  return (
    <div className="flex items-center justify-between mb-12">
      <div>
        <h1 className="text-3xl font-bold synth-glow tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>Studio</h1>
        <p className="text-sm text-muted-foreground mt-1">Create your next masterpiece</p>
      </div>
      <div className="flex items-center gap-3">
        {steps.map((s, i) => (
          <div key={s.key} className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-mono transition-all duration-500 ${
                i < currentIndex ? "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white shadow-[0_0_12px_rgba(177,78,255,0.3)]"
                : i === currentIndex ? "bg-[#b14eff]/15 text-[#b14eff] border border-[#b14eff]/30"
                : "bg-white/[0.03] text-muted-foreground border border-white/[0.06]"
              }`}>
                {i < currentIndex ? "✓" : i + 1}
              </div>
              <span className={`text-xs font-medium hidden md:inline transition-colors ${
                i <= currentIndex ? "text-white" : "text-muted-foreground"
              }`}>{s.label}</span>
            </div>
            {i < steps.length - 1 && (
              <div className={`w-8 h-px transition-colors duration-500 ${i < currentIndex ? "bg-[#b14eff]/40" : "bg-white/[0.06]"}`} />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

/* ─── Describe Step ──────────────────────────────────────────────────────── */

function DescribeStep(props: {
  mode: DescribeMode; setMode: (v: DescribeMode) => void;
  engine: MusicEngine; setEngine: (v: MusicEngine) => void;
  description: string; setDescription: (v: string) => void;
  selectedInspirations: string[]; setSelectedInspirations: (v: string[]) => void;
  inspirationSearch: string; setInspirationSearch: (v: string) => void;
  selectedGenre: string; setSelectedGenre: (v: string) => void;
  selectedMood: string; setSelectedMood: (v: string) => void;
  selectedInstruments: string[]; toggleInstrument: (v: string) => void;
  bpm: number[]; setBpm: (v: number[]) => void;
  isPublic: boolean; setIsPublic: (v: boolean) => void;
  onStart: () => void;
}) {
  const canProceed = props.mode === "simple" ? !!props.description
    : !!props.description && !!props.selectedGenre && !!props.selectedMood;

  return (
    <div className="space-y-8">
      <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-[#b14eff]/[0.08] w-fit">
        {(["simple", "advanced"] as DescribeMode[]).map((m) => (
          <button key={m} onClick={() => props.setMode(m)}
            className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all capitalize ${
              props.mode === m
                ? "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white shadow-[0_0_15px_rgba(177,78,255,0.2)]"
                : "text-muted-foreground hover:text-white"
            }`}>{m}</button>
        ))}
      </div>

      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Describe your song</label>
          <span className={`text-xs font-mono ${props.description.length > 280 ? "text-red-400" : "text-muted-foreground"}`}>
            {props.description.length}/300
          </span>
        </div>
        <Textarea placeholder="A melancholic sunset ballad about memories fading like polaroid photos..."
          value={props.description} onChange={(e) => props.setDescription(e.target.value)}
          maxLength={300}
          className="bg-white/[0.02] border-[#b14eff]/[0.08] min-h-[100px] resize-none focus:border-[#b14eff]/30 transition-colors" />
      </section>

      {props.mode === "simple" ? (
        <SimpleInspirations selected={props.selectedInspirations} setSelected={props.setSelectedInspirations}
          search={props.inspirationSearch} setSearch={props.setInspirationSearch} />
      ) : (
        <AdvancedControls selectedGenre={props.selectedGenre} setSelectedGenre={props.setSelectedGenre}
          selectedMood={props.selectedMood} setSelectedMood={props.setSelectedMood}
          selectedInstruments={props.selectedInstruments} toggleInstrument={props.toggleInstrument}
          bpm={props.bpm} setBpm={props.setBpm} />
      )}

      <section className="space-y-3">
        <label className="text-sm font-medium">Engine</label>
        <div className="flex items-center gap-1 p-1 rounded-lg bg-white/[0.02] border border-[#b14eff]/[0.08] w-fit">
          {(["minimax", "suno"] as MusicEngine[]).map((e) => (
            <button key={e} onClick={() => props.setEngine(e)}
              className={`px-4 py-1.5 rounded-md text-sm font-medium transition-all flex items-center gap-2 ${
                props.engine === e
                  ? e === "suno"
                    ? "bg-gradient-to-r from-[#ffaa00] to-[#ff2d8b] text-white shadow-[0_0_15px_rgba(255,170,0,0.2)]"
                    : "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white shadow-[0_0_15px_rgba(177,78,255,0.2)]"
                  : "text-muted-foreground hover:text-white"
              }`}>
              <span>{e === "minimax" ? "🎹" : "🎸"}</span>
              <span>{e === "minimax" ? "MiniMax" : "Suno V5"}</span>
            </button>
          ))}
        </div>
        <p className="text-xs text-muted-foreground">
          {props.engine === "minimax" ? "Fast generation (~2 min) with MiniMax Music v2" : "Premium quality with Suno V5 (~3 min)"}
        </p>
      </section>

      <section className="flex items-center justify-between p-3 rounded-lg bg-white/[0.02] border border-[#b14eff]/[0.06]">
        <div>
          <span className="text-sm font-medium">{props.isPublic ? "Public" : "Private"}</span>
          <p className="text-xs text-muted-foreground">
            {props.isPublic ? "Visible on your profile and feed" : "Only you can see this track"}
          </p>
        </div>
        <button onClick={() => props.setIsPublic(!props.isPublic)}
          className={`w-10 h-5 rounded-full transition-colors relative ${props.isPublic ? "bg-[#b14eff]" : "bg-white/10"}`}>
          <div className={`w-4 h-4 rounded-full bg-white absolute top-0.5 transition-transform ${props.isPublic ? "translate-x-5" : "translate-x-0.5"}`} />
        </button>
      </section>

      <Button onClick={props.onStart} disabled={!canProceed}
        className="w-full bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] hover:opacity-90 text-white py-6 text-base font-semibold shadow-[0_0_30px_rgba(177,78,255,0.15)] transition-all duration-300 hover:shadow-[0_0_50px_rgba(177,78,255,0.25)]">
        Create Track ✦
      </Button>
    </div>
  );
}

/* ─── Creating Step ──────────────────────────────────────────────────────── */

function CreatingStep(props: {
  phase: string; error: string;
  lyricsReady: boolean; coverReady: boolean; musicReady: boolean;
  title: string; coverImage: string;
  onRetry: () => void; onBack: () => void;
}) {
  const tasks = [
    { label: "Writing lyrics", done: props.lyricsReady, icon: "✍️" },
    { label: "Painting cover art", done: props.coverReady, icon: "🎨" },
    { label: "Composing music", done: props.musicReady, icon: "🎵" },
  ];

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      gsap.fromTo(containerRef.current, { opacity: 0, scale: 0.95 }, { opacity: 1, scale: 1, duration: 0.8, ease: "power3.out" });
    }
  }, []);

  return (
    <div ref={containerRef} className="flex flex-col items-center justify-center py-12 gap-10">
      <div className="relative">
        {props.coverImage ? (
          <div className="w-56 h-56 rounded-2xl overflow-hidden neon-border shadow-[0_0_40px_rgba(177,78,255,0.15)]">
            <img src={props.coverImage} alt="" className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-[#0a0812]/60 to-transparent rounded-2xl" />
          </div>
        ) : (
          <div className="relative w-36 h-36">
            <div className="w-36 h-36 rounded-full border-[3px] border-[#b14eff]/30 vinyl-spin"
              style={{ background: "conic-gradient(from 0deg, #110e1f, #1e1635, #110e1f, #1e1635, #110e1f)" }}>
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-[#ff2d8b]/30 to-[#b14eff]/30 border border-[#b14eff]/30" />
              </div>
              <div className="absolute inset-4 rounded-full border border-[#b14eff]/[0.06]" />
              <div className="absolute inset-8 rounded-full border border-[#b14eff]/[0.04]" />
              <div className="absolute inset-12 rounded-full border border-[#b14eff]/[0.06]" />
            </div>
            <div className="absolute inset-0 rounded-full shadow-[0_0_30px_rgba(177,78,255,0.15)]" />
          </div>
        )}
      </div>

      {props.title && <h2 className="text-2xl font-bold text-center neon-breathe">{props.title}</h2>}

      <div className="flex flex-col gap-2.5 w-full max-w-sm">
        {tasks.map((t) => (
          <div key={t.label} className={`flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-500 ${
            t.done ? "synth-card neon-border" : "bg-white/[0.02] border border-white/[0.04]"
          }`}>
            <span className="text-lg">{t.icon}</span>
            <span className={`flex-1 text-sm transition-colors ${t.done ? "text-white font-medium" : "text-muted-foreground"}`}>{t.label}</span>
            {t.done ? (
              <span className="text-xs font-mono text-[#00f0ff]">✓</span>
            ) : (
              <div className="w-4 h-4 border-2 border-[#b14eff]/50 border-t-transparent rounded-full animate-spin" />
            )}
          </div>
        ))}
      </div>

      <p className="text-sm text-muted-foreground font-mono animate-pulse tracking-wide">{props.phase}</p>

      {props.error && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-sm text-red-400 font-mono">{props.error}</p>
          <div className="flex gap-2">
            <Button variant="outline" onClick={props.onBack} className="border-[#b14eff]/10">← Back</Button>
            <Button onClick={props.onRetry} className="bg-gradient-to-r from-[#ff2d8b] to-[#b14eff]">Retry</Button>
          </div>
        </div>
      )}
    </div>
  );
}

/* ─── Result Step ────────────────────────────────────────────────────────── */

function ResultStep(props: {
  title: string; lyrics: string; coverImage: string; audioUrl: string;
  saved: boolean; onNewTrack: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  useEffect(() => {
    if (cardRef.current) {
      gsap.fromTo(cardRef.current, { scale: 0.9, opacity: 0 },
        { scale: 1, opacity: 1, duration: 0.8, ease: "elastic.out(1, 0.7)" });
    }
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const onTime = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      setProgress(audio.duration ? (audio.currentTime / audio.duration) * 100 : 0);
    };
    const onEnd = () => setIsPlaying(false);
    audio.addEventListener("timeupdate", onTime);
    audio.addEventListener("ended", onEnd);
    return () => { audio.removeEventListener("timeupdate", onTime); audio.removeEventListener("ended", onEnd); };
  }, []);

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) { audioRef.current.pause(); } else { audioRef.current.play(); }
    setIsPlaying(!isPlaying);
  };

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div className="flex flex-col items-center gap-8 py-4">
      <audio ref={audioRef} src={props.audioUrl} preload="metadata" />

      <div ref={cardRef} className="w-full max-w-lg">
        <div className="rounded-2xl overflow-hidden synth-card">
          {props.coverImage && (
            <div className="aspect-square relative group cursor-pointer" onClick={togglePlay}>
              <img src={props.coverImage} alt={props.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-[#0a0812]/80 via-[#0a0812]/20 to-transparent" />

              {props.saved && (
                <div className="absolute top-4 left-4 flex items-center gap-1.5 bg-black/40 backdrop-blur-sm rounded-full px-2.5 py-1 border border-[#b14eff]/20">
                  <span className="rec-dot" />
                  <span className="text-[10px] font-mono text-white/80 tracking-widest">SAVED</span>
                </div>
              )}

              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="w-16 h-16 rounded-full bg-black/40 backdrop-blur-sm flex items-center justify-center border border-[#b14eff]/20 shadow-[0_0_25px_rgba(177,78,255,0.2)]">
                  <span className="text-2xl text-white ml-1">{isPlaying ? "⏸" : "▶"}</span>
                </div>
              </div>

              <div className="absolute bottom-0 left-0 right-0 p-6">
                <h2 className="text-3xl font-bold text-white drop-shadow-lg">{props.title}</h2>
              </div>
            </div>
          )}

          <div className="p-5 space-y-4">
            {!props.coverImage && <h2 className="text-2xl font-bold">{props.title}</h2>}

            <div className="space-y-2">
              <div className="relative h-1.5 bg-white/[0.06] rounded-full cursor-pointer group" onClick={seek}>
                <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] rounded-full transition-all"
                  style={{ width: `${progress}%` }} />
                <div className="absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full bg-white shadow-[0_0_8px_rgba(177,78,255,0.4)] opacity-0 group-hover:opacity-100 transition-opacity"
                  style={{ left: `calc(${progress}% - 6px)` }} />
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <button onClick={togglePlay}
                    className="w-9 h-9 rounded-full bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] hover:opacity-80 flex items-center justify-center text-white text-sm transition-all shadow-[0_0_15px_rgba(177,78,255,0.2)]">
                    {isPlaying ? "⏸" : "▶"}
                  </button>
                  <span className="text-xs font-mono text-muted-foreground">{fmt(currentTime)} / {fmt(duration)}</span>
                </div>
              </div>
            </div>

            {props.lyrics && (
              <details className="group">
                <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors flex items-center gap-1">
                  <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span> Lyrics
                </summary>
                <div className="mt-3 text-xs leading-relaxed whitespace-pre-line font-mono text-muted-foreground max-h-56 overflow-y-auto pr-2">
                  {props.lyrics}
                </div>
              </details>
            )}
          </div>
        </div>
      </div>

      <div className="flex gap-3 w-full max-w-lg">
        <Button onClick={props.onNewTrack}
          className="flex-1 bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] hover:opacity-90 text-white py-6 text-base font-semibold shadow-[0_0_30px_rgba(177,78,255,0.15)]">
          Create Another ✦
        </Button>
        <a href="/library">
          <Button variant="outline" className="border-[#b14eff]/10 py-6 hover:bg-[#b14eff]/5 hover:border-[#b14eff]/20 transition-all">Library →</Button>
        </a>
      </div>
    </div>
  );
}

/* ─── Inspirations ───────────────────────────────────────────────────────── */

function SimpleInspirations({ selected, setSelected, search, setSearch }: {
  selected: string[]; setSelected: (v: string[]) => void;
  search: string; setSearch: (v: string) => void;
}) {
  const filtered = useMemo(() => {
    if (!search) return INSPIRATIONS.slice(0, 40);
    return INSPIRATIONS.filter((tag) => tag.toLowerCase().includes(search.toLowerCase())).slice(0, 40);
  }, [search]);

  const toggle = (tag: string) => {
    setSelected(selected.includes(tag) ? selected.filter((t) => t !== tag) : [...selected, tag]);
  };

  return (
    <section className="space-y-3">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Inspirations</label>
        <span className="text-xs text-muted-foreground">{selected.length} selected (optional)</span>
      </div>
      {selected.length > 0 && (
        <div className="flex flex-wrap gap-1.5">
          {selected.map((tag) => (
            <Badge key={tag} className="bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] border-none cursor-pointer shadow-[0_0_8px_rgba(177,78,255,0.2)]" onClick={() => toggle(tag)}>
              {tag} ×
            </Badge>
          ))}
        </div>
      )}
      <Input placeholder="Search inspirations..." value={search} onChange={(e) => setSearch(e.target.value)}
        className="bg-white/[0.02] border-[#b14eff]/[0.08] focus:border-[#b14eff]/30" />
      <div className="flex flex-wrap gap-1.5 max-h-48 overflow-y-auto">
        {filtered.map((tag) => (
          <Badge key={tag} variant={selected.includes(tag) ? "default" : "outline"}
            className={`cursor-pointer transition-all text-xs ${
              selected.includes(tag)
                ? "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] border-none shadow-[0_0_8px_rgba(177,78,255,0.15)]"
                : "border-[#b14eff]/[0.08] hover:border-[#b14eff]/20 hover:bg-[#b14eff]/5"
            }`} onClick={() => toggle(tag)}>
            {tag}
          </Badge>
        ))}
      </div>
    </section>
  );
}

/* ─── Advanced Controls ──────────────────────────────────────────────────── */

function AdvancedControls({ selectedGenre, setSelectedGenre, selectedMood, setSelectedMood,
  selectedInstruments, toggleInstrument, bpm, setBpm }: {
  selectedGenre: string; setSelectedGenre: (v: string) => void;
  selectedMood: string; setSelectedMood: (v: string) => void;
  selectedInstruments: string[]; toggleInstrument: (v: string) => void;
  bpm: number[]; setBpm: (v: number[]) => void;
}) {
  return (
    <>
      <section className="space-y-3">
        <label className="text-sm font-medium">Genre</label>
        <div className="flex flex-wrap gap-2">
          {GENRES.map((g) => (
            <Badge key={g} variant={selectedGenre === g ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                selectedGenre === g
                  ? "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] border-none shadow-[0_0_10px_rgba(177,78,255,0.2)]"
                  : "border-[#b14eff]/[0.08] hover:border-[#b14eff]/20 hover:bg-[#b14eff]/5"
              }`} onClick={() => setSelectedGenre(g)}>{g}</Badge>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <label className="text-sm font-medium">Mood</label>
        <div className="flex flex-wrap gap-2">
          {MOODS.map((m) => (
            <Badge key={m} variant={selectedMood === m ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                selectedMood === m
                  ? "bg-gradient-to-r from-[#00f0ff] to-[#b14eff] text-white border-none shadow-[0_0_10px_rgba(0,240,255,0.15)]"
                  : "border-[#00f0ff]/[0.08] hover:border-[#00f0ff]/20 hover:bg-[#00f0ff]/5"
              }`} onClick={() => setSelectedMood(m)}>{m}</Badge>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <label className="text-sm font-medium">Instruments</label>
        <div className="flex flex-wrap gap-2">
          {INSTRUMENTS.map((inst) => (
            <Badge key={inst} variant={selectedInstruments.includes(inst) ? "default" : "outline"}
              className={`cursor-pointer transition-all ${
                selectedInstruments.includes(inst)
                  ? "bg-gradient-to-r from-[#ffaa00] to-[#ff2d8b] text-white border-none shadow-[0_0_10px_rgba(255,170,0,0.15)]"
                  : "border-[#ffaa00]/[0.08] hover:border-[#ffaa00]/20 hover:bg-[#ffaa00]/5"
              }`} onClick={() => toggleInstrument(inst)}>{inst}</Badge>
          ))}
        </div>
      </section>
      <section className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">BPM</label>
          <span className="text-sm font-mono text-[#b14eff]">{bpm[0]}</span>
        </div>
        <Slider value={bpm} onValueChange={(v) => setBpm(Array.isArray(v) ? [...v] : [v])}
          min={60} max={200} step={1} className="[&_[role=slider]]:bg-[#b14eff] [&_[role=slider]]:border-none" />
      </section>
    </>
  );
}
