"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc } from "firebase/firestore";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import gsap from "gsap";

interface Track {
  id: string;
  title: string;
  genre: string;
  mood: string;
  coverUrl: string;
  audioUrl: string;
  lyrics: string;
  bpm: number;
  instruments: string[];
  createdAt: { seconds: number };
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [selectedTrack, setSelectedTrack] = useState<Track | null>(null);
  const [playingId, setPlayingId] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const gridRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!user) return;
    const fetchTracks = async () => {
      const q = query(collection(db, "tracks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setTracks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Track[]);
      setLoading(false);
    };
    fetchTracks();
  }, [user]);

  useEffect(() => {
    if (gridRef.current && tracks.length > 0) {
      gsap.fromTo(gridRef.current.children, { opacity: 0, y: 15, scale: 0.97 },
        { opacity: 1, y: 0, scale: 1, stagger: 0.04, duration: 0.5, ease: "power3.out" });
    }
  }, [tracks]);

  const deleteTrack = async (trackId: string) => {
    await deleteDoc(doc(db, "tracks", trackId));
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
    if (selectedTrack?.id === trackId) setSelectedTrack(null);
    if (playingId === trackId) { setPlayingId(null); audioRef.current?.pause(); }
  };

  const togglePlay = (track: Track) => {
    if (!audioRef.current) return;
    if (playingId === track.id) {
      audioRef.current.pause();
      setPlayingId(null);
    } else {
      audioRef.current.src = track.audioUrl;
      audioRef.current.play();
      setPlayingId(track.id);
    }
  };

  const filtered = tracks.filter(
    (t) => t.title.toLowerCase().includes(search.toLowerCase()) || t.genre.toLowerCase().includes(search.toLowerCase())
  );

  const formatDate = (ts: { seconds: number }) => {
    if (!ts) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
  };

  const nowPlaying = tracks.find((t) => t.id === playingId);

  return (
    <div className="min-h-screen p-8" style={{ paddingBottom: nowPlaying ? "6rem" : undefined }}>
      <audio ref={audioRef} onEnded={() => setPlayingId(null)} />

      <div className="flex items-center justify-between mb-10">
        <div>
          <h1 className="text-3xl font-bold synth-glow tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>Library</h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tracks.length} track{tracks.length !== 1 ? "s" : ""} in your collection
          </p>
        </div>
        <Input placeholder="Search tracks..." value={search} onChange={(e) => setSearch(e.target.value)}
          className="w-64 bg-white/[0.02] border-[#b14eff]/[0.08] focus:border-[#b14eff]/30 transition-colors" />
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div className="flex gap-6">
          <div ref={gridRef} className="flex-1 grid grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((track) => (
              <TrackCard key={track.id} track={track}
                isSelected={selectedTrack?.id === track.id}
                isPlaying={playingId === track.id}
                onSelect={() => setSelectedTrack(track)}
                onPlay={() => togglePlay(track)}
                onDelete={() => deleteTrack(track.id)} />
            ))}
          </div>

          {selectedTrack && (
            <TrackDetail track={selectedTrack} onClose={() => setSelectedTrack(null)}
              formatDate={formatDate} isPlaying={playingId === selectedTrack.id}
              onPlay={() => togglePlay(selectedTrack)} />
          )}
        </div>
      )}

      {nowPlaying && (
        <NowPlayingBar track={nowPlaying} audioRef={audioRef}
          isPlaying={playingId === nowPlaying.id}
          onToggle={() => togglePlay(nowPlaying)}
          onStop={() => { audioRef.current?.pause(); setPlayingId(null); }} />
      )}
    </div>
  );
}

/* ─── Track Card ─────────────────────────────────────────────────────────── */

function TrackCard({ track, isSelected, isPlaying, onSelect, onPlay, onDelete }: {
  track: Track; isSelected: boolean; isPlaying: boolean;
  onSelect: () => void; onPlay: () => void; onDelete: () => void;
}) {
  return (
    <div onClick={onSelect}
      className={`group cursor-pointer rounded-xl overflow-hidden transition-all duration-300 hover:scale-[1.02] ${
        isSelected ? "neon-border-pink" : "border border-[#b14eff]/[0.06] hover:border-[#b14eff]/15"
      }`}>
      <div className="aspect-square relative overflow-hidden bg-white/[0.02]">
        {track.coverUrl ? (
          <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
        ) : (
          <div className="w-full h-full flex items-center justify-center" style={{ background: "linear-gradient(135deg, rgba(255,45,139,0.08), rgba(177,78,255,0.08))" }}>
            <span className="text-4xl opacity-40">🎵</span>
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-[#0a0812]/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-all duration-300">
          <div className="absolute bottom-3 left-3 right-3 flex items-end justify-between">
            {track.audioUrl && (
              <button onClick={(e) => { e.stopPropagation(); onPlay(); }}
                className={`w-10 h-10 rounded-full flex items-center justify-center text-sm transition-all ${
                  isPlaying ? "bg-white text-black" : "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white hover:scale-110 shadow-[0_0_15px_rgba(177,78,255,0.3)]"
                }`}>
                {isPlaying ? "⏸" : "▶"}
              </button>
            )}
            <button onClick={(e) => { e.stopPropagation(); onDelete(); }}
              className="text-[10px] text-red-400/60 hover:text-red-300 font-mono tracking-wider transition-colors">
              DEL
            </button>
          </div>
        </div>

        {isPlaying && (
          <div className="absolute top-2.5 right-2.5">
            <div className="flex items-center gap-1 bg-black/50 backdrop-blur-sm rounded-full px-2 py-0.5 border border-[#b14eff]/20">
              <span className="rec-dot" style={{ width: 4, height: 4 }} />
              <span className="text-[9px] font-mono text-white/80">PLAYING</span>
            </div>
          </div>
        )}
      </div>

      <div className="p-3" style={{ background: "rgba(17,14,31,0.8)" }}>
        <h3 className="font-medium text-sm truncate">{track.title}</h3>
        <div className="flex items-center gap-2 mt-1.5">
          {track.genre && (
            <Badge variant="outline" className="text-[10px] border-[#b14eff]/[0.08] px-1.5 py-0 text-muted-foreground">
              {track.genre.split(",")[0]}
            </Badge>
          )}
          <span className="text-[10px] text-muted-foreground font-mono">{track.bpm} BPM</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Track Detail ───────────────────────────────────────────────────────── */

function TrackDetail({ track, onClose, formatDate, isPlaying, onPlay }: {
  track: Track; onClose: () => void; formatDate: (ts: { seconds: number }) => string;
  isPlaying: boolean; onPlay: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (panelRef.current) {
      gsap.fromTo(panelRef.current, { x: 20, opacity: 0 }, { x: 0, opacity: 1, duration: 0.4, ease: "power3.out" });
    }
  }, [track.id]);

  return (
    <div ref={panelRef} className="w-80 synth-card rounded-xl p-5 space-y-4 sticky top-8 h-fit">
      <div className="flex items-center justify-between">
        <h3 className="font-bold truncate flex-1">{track.title}</h3>
        <button onClick={onClose} className="text-muted-foreground hover:text-white text-lg ml-2 transition-colors">×</button>
      </div>

      {track.coverUrl && (
        <div className="relative group rounded-lg overflow-hidden neon-border">
          <img src={track.coverUrl} alt={track.title} className="w-full aspect-square object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-[#0a0812]/40 to-transparent" />
          {track.audioUrl && (
            <button onClick={onPlay}
              className={`absolute inset-0 flex items-center justify-center rounded-lg transition-all ${
                isPlaying ? "bg-black/30" : "bg-transparent group-hover:bg-black/30"
              }`}>
              <span className={`w-14 h-14 rounded-full flex items-center justify-center text-lg transition-all ${
                isPlaying ? "bg-white text-black" : "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white scale-0 group-hover:scale-100 shadow-[0_0_20px_rgba(177,78,255,0.3)]"
              }`}>
                {isPlaying ? "⏸" : "▶"}
              </span>
            </button>
          )}
        </div>
      )}

      <div className="space-y-2.5 text-sm">
        {track.genre && <DetailRow label="Genre" value={track.genre} />}
        {track.mood && <DetailRow label="Mood" value={track.mood} />}
        <DetailRow label="BPM" value={String(track.bpm)} mono />
        <DetailRow label="Created" value={formatDate(track.createdAt)} />
      </div>

      {track.lyrics && (
        <details className="group">
          <summary className="text-xs font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors flex items-center gap-1">
            <span className="group-open:rotate-90 transition-transform text-[10px]">▶</span> Lyrics
          </summary>
          <p className="mt-3 text-xs leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto font-mono text-muted-foreground pr-2">
            {track.lyrics}
          </p>
        </details>
      )}
    </div>
  );
}

function DetailRow({ label, value, mono }: { label: string; value: string; mono?: boolean }) {
  return (
    <div className="flex justify-between">
      <span className="text-muted-foreground">{label}</span>
      <span className={mono ? "font-mono text-[#b14eff]" : ""}>{value}</span>
    </div>
  );
}

/* ─── Now Playing Bar ────────────────────────────────────────────────────── */

function NowPlayingBar({ track, audioRef, isPlaying, onToggle, onStop }: {
  track: Track; audioRef: React.RefObject<HTMLAudioElement | null>;
  isPlaying: boolean; onToggle: () => void; onStop: () => void;
}) {
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const barRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const update = () => {
      setCurrentTime(audio.currentTime);
      setDuration(audio.duration || 0);
      if (audio.duration) setProgress((audio.currentTime / audio.duration) * 100);
    };
    audio.addEventListener("timeupdate", update);
    return () => audio.removeEventListener("timeupdate", update);
  }, [audioRef]);

  useEffect(() => {
    if (barRef.current) {
      gsap.fromTo(barRef.current, { y: 80, opacity: 0 }, { y: 0, opacity: 1, duration: 0.5, ease: "power3.out" });
    }
  }, [track.id]);

  const seek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioRef.current) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    audioRef.current.currentTime = pct * (audioRef.current.duration || 0);
  };

  const fmt = (s: number) => `${Math.floor(s / 60)}:${Math.floor(s % 60).toString().padStart(2, "0")}`;

  return (
    <div ref={barRef} className="fixed bottom-0 left-0 right-0 z-50">
      <div className="relative h-1 bg-white/[0.04] cursor-pointer group" onClick={seek}>
        <div className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] transition-all"
          style={{ width: `${progress}%` }} />
        <div className="absolute top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full bg-white shadow-[0_0_8px_rgba(177,78,255,0.4)] opacity-0 group-hover:opacity-100 transition-opacity"
          style={{ left: `calc(${progress}% - 5px)` }} />
      </div>
      <div className="border-t border-[#b14eff]/[0.06] px-6 py-3 flex items-center gap-4"
        style={{ background: "rgba(10,8,18,0.95)", backdropFilter: "blur(30px)" }}>
        {track.coverUrl && <img src={track.coverUrl} alt="" className="w-11 h-11 rounded-lg object-cover shadow-lg" />}
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium truncate">{track.title}</p>
          <p className="text-xs text-muted-foreground truncate">{track.genre}</p>
        </div>
        <span className="text-[10px] font-mono text-muted-foreground">{fmt(currentTime)} / {fmt(duration)}</span>
        <div className="flex items-center gap-2">
          <button onClick={onToggle}
            className="w-9 h-9 rounded-full bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] hover:opacity-80 flex items-center justify-center text-white text-sm transition-all shadow-[0_0_12px_rgba(177,78,255,0.2)]">
            {isPlaying ? "⏸" : "▶"}
          </button>
          <button onClick={onStop}
            className="w-8 h-8 rounded-full bg-white/[0.05] hover:bg-white/[0.1] flex items-center justify-center text-xs text-muted-foreground transition-all">
            ⏹
          </button>
        </div>
      </div>
    </div>
  );
}

/* ─── Empty State ────────────────────────────────────────────────────────── */

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-24 gap-5">
      <div className="w-20 h-20 rounded-full flex items-center justify-center neon-border synth-float"
        style={{ background: "linear-gradient(135deg, rgba(255,45,139,0.05), rgba(177,78,255,0.05))" }}>
        <span className="text-3xl opacity-50">{hasSearch ? "🔍" : "💿"}</span>
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-medium">{hasSearch ? "No tracks found" : "No recordings yet"}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {hasSearch ? "Try a different search term" : "Head to the Studio to create your first track — it will appear here automatically"}
        </p>
      </div>
      {!hasSearch && (
        <a href="/studio">
          <Button className="bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] hover:opacity-90 text-white shadow-[0_0_20px_rgba(177,78,255,0.15)] mt-2">
            Open Studio ✦
          </Button>
        </a>
      )}
    </div>
  );
}
