"use client";

import { useEffect, useState, useRef } from "react";
import { useAuth } from "@/lib/auth-context";
import { db } from "@/lib/firebase";
import { collection, query, where, orderBy, getDocs, deleteDoc, doc, updateDoc } from "firebase/firestore";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { usePlayerStore } from "@/stores/player-store";
import { Play, Pause, Trash2, Search, Globe, Lock, Eye, Music2, PlayCircle, PauseCircle } from "lucide-react";
import gsap from "gsap";
import Link from "next/link";

interface Track {
  id: string;
  title: string;
  genre: string;
  mood: string;
  coverUrl: string;
  audioUrl: string;
  lyrics: string;
  bpm: number;
  isPublic: boolean;
  plays: number;
  likes: number;
  username?: string;
  createdAt: { seconds: number };
}

export default function LibraryPage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const play = usePlayerStore((s) => s.play);
  const togglePlay = usePlayerStore((s) => s.togglePlay);

  useEffect(() => {
    if (!user) return;
    (async () => {
      const q = query(collection(db, "tracks"), where("userId", "==", user.uid), orderBy("createdAt", "desc"));
      const snapshot = await getDocs(q);
      setTracks(snapshot.docs.map((d) => ({ id: d.id, ...d.data() })) as Track[]);
      setLoading(false);
    })();
  }, [user]);

  useEffect(() => {
    if (listRef.current && tracks.length > 0) {
      gsap.fromTo(listRef.current.children,
        { opacity: 0, y: 12 },
        { opacity: 1, y: 0, stagger: 0.03, duration: 0.4, ease: "power3.out" }
      );
    }
  }, [tracks]);

  const handlePlay = (track: Track) => {
    if (currentTrack?.id === track.id) {
      togglePlay();
    } else {
      const queue = filtered.filter((t) => t.audioUrl).map((t) => ({
        id: t.id, title: t.title, audioUrl: t.audioUrl,
        coverUrl: t.coverUrl, username: t.username,
      }));
      const target = queue.find((q) => q.id === track.id);
      if (target) play(target, queue);
    }
  };

  const handleDelete = async (trackId: string) => {
    await deleteDoc(doc(db, "tracks", trackId));
    setTracks((prev) => prev.filter((t) => t.id !== trackId));
  };

  const handleTogglePublic = async (trackId: string) => {
    const track = tracks.find((t) => t.id === trackId);
    if (!track) return;
    const newVal = !track.isPublic;
    setTracks((prev) => prev.map((t) => t.id === trackId ? { ...t, isPublic: newVal } : t));
    await updateDoc(doc(db, "tracks", trackId), { isPublic: newVal });
  };

  const filtered = tracks.filter(
    (t) => t.title.toLowerCase().includes(search.toLowerCase()) ||
           (t.genre && t.genre.toLowerCase().includes(search.toLowerCase()))
  );

  const formatDate = (ts: { seconds: number }) => {
    if (!ts) return "";
    return new Date(ts.seconds * 1000).toLocaleDateString("en-US", { month: "short", day: "numeric" });
  };

  return (
    <div className="min-h-screen p-4 md:p-8 max-w-5xl mx-auto">
      <header className="mb-6 md:mb-8">
        <h1 className="text-2xl md:text-3xl font-bold synth-glow tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
          Library
        </h1>
        <p className="text-xs md:text-sm text-muted-foreground mt-1">
          {tracks.length} track{tracks.length !== 1 ? "s" : ""} in your collection
        </p>
      </header>

      <div className="relative mb-6">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search by title or genre..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10 bg-white/[0.02] border-[#b14eff]/[0.08] focus:border-[#b14eff]/30 h-11 transition-colors"
        />
      </div>

      {loading ? (
        <LoadingState />
      ) : filtered.length === 0 ? (
        <EmptyState hasSearch={!!search} />
      ) : (
        <div ref={listRef} className="space-y-2">
          {filtered.map((track) => (
            <TrackRow
              key={track.id}
              track={track}
              isActive={currentTrack?.id === track.id && isPlaying}
              isExpanded={expandedId === track.id}
              onToggleExpand={() => setExpandedId(expandedId === track.id ? null : track.id)}
              onPlay={() => handlePlay(track)}
              onDelete={() => handleDelete(track.id)}
              onTogglePublic={() => handleTogglePublic(track.id)}
              formatDate={formatDate}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function TrackRow({ track, isActive, isExpanded, onToggleExpand, onPlay, onDelete, onTogglePublic, formatDate }: {
  track: Track; isActive: boolean; isExpanded: boolean;
  onToggleExpand: () => void; onPlay: () => void; onDelete: () => void;
  onTogglePublic: () => void; formatDate: (ts: { seconds: number }) => string;
}) {
  return (
    <div className={`rounded-xl border transition-all duration-300 overflow-hidden ${
      isActive
        ? "border-[#b14eff]/30 bg-[#b14eff]/[0.04]"
        : "border-[#b14eff]/[0.06] bg-white/[0.01] hover:bg-white/[0.02] hover:border-[#b14eff]/10"
    }`}>
      <div className="flex items-center gap-3 p-3 cursor-pointer" onClick={onToggleExpand}>
        <div className="relative w-12 h-12 md:w-14 md:h-14 rounded-lg overflow-hidden shrink-0 group" onClick={(e) => { e.stopPropagation(); onPlay(); }}>
          {track.coverUrl ? (
            <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-[#ff2d8b]/10 to-[#b14eff]/10">
              <Music2 size={18} className="text-[#b14eff]/40" />
            </div>
          )}
          <div className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/40 transition-colors">
            <div className={`w-8 h-8 rounded-full flex items-center justify-center transition-all ${
              isActive
                ? "bg-white text-black scale-100"
                : "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white scale-0 group-hover:scale-100"
            }`}>
              {isActive ? <Pause size={12} /> : <Play size={12} className="ml-0.5" />}
            </div>
          </div>
        </div>

        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium truncate">{track.title}</h3>
          <div className="flex items-center gap-2 mt-0.5">
            {track.genre && (
              <span className="text-[10px] text-muted-foreground truncate">{track.genre.split(",")[0]}</span>
            )}
            <span className="text-[10px] text-muted-foreground/50">•</span>
            <span className="text-[10px] text-muted-foreground font-mono">{track.bpm || "—"} BPM</span>
          </div>
        </div>

        <div className="hidden sm:flex items-center gap-3 text-[11px] text-muted-foreground shrink-0">
          <span className="flex items-center gap-1"><Eye size={11} /> {track.plays || 0}</span>
          <span>{formatDate(track.createdAt)}</span>
        </div>

        <div className="flex items-center gap-1 shrink-0">
          <button
            onClick={(e) => { e.stopPropagation(); onPlay(); }}
            className={`p-1.5 rounded-full transition-all ${
              isActive
                ? "text-[#b14eff] hover:text-[#b14eff]/80"
                : "text-muted-foreground hover:text-white"
            }`}
            title={isActive ? "Pause" : "Play"}
          >
            {isActive ? <PauseCircle size={20} /> : <PlayCircle size={20} />}
          </button>
          <VisibilityBadge isPublic={track.isPublic} />
          <button
            onClick={(e) => { e.stopPropagation(); onToggleExpand(); }}
            className="p-1.5 text-muted-foreground hover:text-white transition-colors"
          >
            <svg width="12" height="12" viewBox="0 0 12 12" className={`transition-transform duration-200 ${isExpanded ? "rotate-180" : ""}`}>
              <path d="M3 4.5L6 7.5L9 4.5" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" />
            </svg>
          </button>
        </div>
      </div>

      {isExpanded && (
        <div className="px-3 pb-3 pt-1 border-t border-[#b14eff]/[0.04]">
          <div className="flex flex-col sm:flex-row gap-3">
            {track.coverUrl && (
              <img src={track.coverUrl} alt={track.title}
                className="w-full sm:w-32 aspect-square rounded-lg object-cover sm:shrink-0" />
            )}

            <div className="flex-1 space-y-3">
              <div className="grid grid-cols-2 gap-2 text-xs">
                {track.genre && <DetailItem label="Genre" value={track.genre} />}
                {track.mood && <DetailItem label="Mood" value={track.mood} />}
                <DetailItem label="BPM" value={`${track.bpm || "—"}`} />
                <DetailItem label="Created" value={formatDate(track.createdAt)} />
                <DetailItem label="Plays" value={`${track.plays || 0}`} />
                <DetailItem label="Likes" value={`${track.likes || 0}`} />
              </div>

              {track.lyrics && (
                <details className="group">
                  <summary className="text-[11px] font-medium text-muted-foreground cursor-pointer hover:text-white transition-colors">
                    Show lyrics
                  </summary>
                  <p className="mt-2 text-[11px] leading-relaxed whitespace-pre-line max-h-32 overflow-y-auto font-mono text-muted-foreground/80">
                    {track.lyrics}
                  </p>
                </details>
              )}

              <div className="flex items-center gap-2 pt-1">
                <button
                  onClick={onTogglePublic}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    track.isPublic
                      ? "bg-[#b14eff]/10 text-[#b14eff] border border-[#b14eff]/20 hover:bg-[#b14eff]/15"
                      : "bg-white/[0.03] text-muted-foreground border border-white/[0.06] hover:border-white/10"
                  }`}
                >
                  {track.isPublic ? <Globe size={12} /> : <Lock size={12} />}
                  {track.isPublic ? "Public" : "Private"}
                </button>

                <div className="flex-1" />

                <button
                  onClick={(e) => { e.stopPropagation(); onDelete(); }}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs text-red-400/70 hover:text-red-300 hover:bg-red-500/[0.06] border border-transparent hover:border-red-500/10 transition-all"
                >
                  <Trash2 size={12} /> Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function VisibilityBadge({ isPublic }: { isPublic: boolean }) {
  return (
    <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium ${
      isPublic
        ? "bg-[#b14eff]/10 text-[#b14eff]"
        : "bg-white/[0.04] text-muted-foreground"
    }`}>
      {isPublic ? <Globe size={9} /> : <Lock size={9} />}
      <span className="hidden sm:inline">{isPublic ? "Public" : "Private"}</span>
    </span>
  );
}

function DetailItem({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <span className="text-muted-foreground/60">{label}</span>
      <p className="font-medium mt-0.5 truncate">{value}</p>
    </div>
  );
}

function LoadingState() {
  return (
    <div className="flex items-center justify-center py-20">
      <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}

function EmptyState({ hasSearch }: { hasSearch: boolean }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 gap-5">
      <div
        className="w-20 h-20 rounded-full flex items-center justify-center synth-float"
        style={{
          background: "linear-gradient(135deg, rgba(255,45,139,0.05), rgba(177,78,255,0.05))",
          border: "1px solid rgba(177,78,255,0.1)",
        }}
      >
        <Music2 size={28} className="text-[#b14eff]/40" />
      </div>
      <div className="text-center space-y-1.5">
        <h3 className="text-lg font-medium">{hasSearch ? "No tracks found" : "No recordings yet"}</h3>
        <p className="text-sm text-muted-foreground max-w-xs">
          {hasSearch ? "Try a different search term" : "Head to the Studio to create your first track"}
        </p>
      </div>
      {!hasSearch && (
        <Link href="/studio">
          <Button className="bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] hover:opacity-90 text-white shadow-[0_0_20px_rgba(177,78,255,0.15)]">
            Open Studio ✦
          </Button>
        </Link>
      )}
    </div>
  );
}
