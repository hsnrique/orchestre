"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { collection, query, where, orderBy, limit, getDocs, startAfter, QueryDocumentSnapshot } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { likeTrack, unlikeTrack, getLikedTrackIds } from "@/lib/social";
import { Play, Heart, Headphones, Music2 } from "lucide-react";
import { usePlayerStore, PlayerTrack } from "@/stores/player-store";
import Link from "next/link";
import gsap from "gsap";

interface FeedTrack {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  username: string;
  userAvatarUrl: string;
  genre: string;
  plays: number;
  likes: number;
  createdAt: { seconds: number };
}

const PAGE_SIZE = 20;

export default function HomePage() {
  const { user } = useAuth();
  const [tracks, setTracks] = useState<FeedTrack[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [lastDoc, setLastDoc] = useState<QueryDocumentSnapshot | null>(null);
  const [hasMore, setHasMore] = useState(true);
  const gridRef = useRef<HTMLDivElement>(null);
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const loadLikes = useCallback(async (trackIds: string[]) => {
    if (!user || trackIds.length === 0) return;
    const liked = await getLikedTrackIds(user.uid, trackIds);
    setLikedIds((prev) => new Set([...prev, ...liked]));
  }, [user]);

  useEffect(() => { loadTracks(); }, []);

  useEffect(() => {
    if (gridRef.current && tracks.length > 0) {
      gsap.fromTo(".track-card", { y: 20, opacity: 0 }, { y: 0, opacity: 1, duration: 0.4, stagger: 0.04, ease: "power2.out" });
    }
  }, [tracks.length]);

  async function loadTracks(after?: QueryDocumentSnapshot) {
    setLoading(true);
    try {
      let q = query(
        collection(db, "tracks"),
        where("isPublic", "==", true),
        orderBy("createdAt", "desc"),
        limit(PAGE_SIZE)
      );
      if (after) q = query(q, startAfter(after));

      const snap = await getDocs(q);
      const newTracks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as FeedTrack));

      setTracks((prev) => after ? [...prev, ...newTracks] : newTracks);
      setLastDoc(snap.docs[snap.docs.length - 1] || null);
      setHasMore(snap.docs.length === PAGE_SIZE);
      loadLikes(newTracks.map((t) => t.id));
    } catch (error) {
      console.error("Feed load error:", error);
    }
    setLoading(false);
  }

  async function toggleLike(e: React.MouseEvent, trackId: string) {
    e.stopPropagation();
    if (!user) return;
    const isLiked = likedIds.has(trackId);
    setLikedIds((prev) => {
      const next = new Set(prev);
      isLiked ? next.delete(trackId) : next.add(trackId);
      return next;
    });
    setTracks((prev) => prev.map((t) =>
      t.id === trackId ? { ...t, likes: t.likes + (isLiked ? -1 : 1) } : t
    ));
    try {
      isLiked ? await unlikeTrack(user.uid, trackId) : await likeTrack(user.uid, trackId);
    } catch {
      setLikedIds((prev) => {
        const next = new Set(prev);
        isLiked ? next.add(trackId) : next.delete(trackId);
        return next;
      });
    }
  }

  function playTrack(track: FeedTrack) {
    const pt: PlayerTrack = {
      id: track.id, title: track.title, audioUrl: track.audioUrl,
      coverUrl: track.coverUrl, username: track.username, genre: track.genre,
    };
    const allPt = tracks.map((t) => ({
      id: t.id, title: t.title, audioUrl: t.audioUrl,
      coverUrl: t.coverUrl, username: t.username, genre: t.genre,
    }));
    play(pt, allPt);
  }

  function timeAgo(seconds: number) {
    const diff = Math.floor(Date.now() / 1000) - seconds;
    if (diff < 60) return "just now";
    if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
    if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
    return `${Math.floor(diff / 86400)}d ago`;
  }

  return (
    <div className="p-4 md:p-6 max-w-6xl mx-auto space-y-6 md:space-y-8">
      <header className="space-y-1">
        <h1 className="text-2xl md:text-3xl font-bold synth-glow">Discover</h1>
        <p className="text-xs md:text-sm text-muted-foreground">Fresh tracks from the Orchestre community</p>
      </header>

      {tracks.length === 0 && !loading && (
        <div className="flex flex-col items-center justify-center py-24 gap-4 text-center">
          <div className="w-20 h-20 rounded-full neon-border flex items-center justify-center">
            <Music2 size={32} className="text-[#b14eff]" />
          </div>
          <h2 className="text-xl font-semibold">No public tracks yet</h2>
          <p className="text-sm text-muted-foreground max-w-sm">
            Be the first to create and publish a track! Go to Studio to start composing.
          </p>
        </div>
      )}

      <div ref={gridRef} className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 md:gap-4">
        {tracks.map((track) => {
          const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
          const isLiked = likedIds.has(track.id);
          return (
            <div key={track.id}
              className="track-card group cursor-pointer rounded-xl overflow-hidden bg-white/[0.02] border border-[#b14eff]/[0.06] hover:border-[#b14eff]/20 transition-all duration-300 hover:shadow-[0_0_25px_rgba(177,78,255,0.08)]"
              onClick={() => playTrack(track)}>
              <div className="relative aspect-square">
                {track.coverUrl ? (
                  <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gradient-to-br from-[#ff2d8b]/20 to-[#b14eff]/20 flex items-center justify-center">
                    <Music2 size={40} className="text-[#b14eff]/30" />
                  </div>
                )}
                <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                  <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] flex items-center justify-center shadow-lg transition-all duration-300 ${
                    isCurrentlyPlaying ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                  }`}>
                    <Play size={20} className="text-white ml-0.5" fill="white" />
                  </div>
                </div>
                {track.genre && (
                  <div className="absolute top-2 left-2 px-2 py-0.5 rounded-full bg-black/60 backdrop-blur-sm text-[10px] font-medium text-white/80">
                    {track.genre}
                  </div>
                )}
              </div>

              <div className="p-3 space-y-1.5">
                <h3 className="text-sm font-medium truncate">{track.title}</h3>
                <Link href={`/${track.username}`} onClick={(e) => e.stopPropagation()}
                  className="flex items-center gap-2 hover:opacity-80 transition-opacity">
                  {track.userAvatarUrl && (
                    <img src={track.userAvatarUrl} alt="" className="w-4 h-4 rounded-full" />
                  )}
                  <span className="text-xs text-muted-foreground truncate">@{track.username}</span>
                </Link>
                <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                  <span className="flex items-center gap-1"><Headphones size={10} /> {track.plays || 0}</span>
                  <button onClick={(e) => toggleLike(e, track.id)}
                    className={`flex items-center gap-1 transition-colors ${isLiked ? "text-[#ff2d8b]" : "hover:text-[#ff2d8b]"}`}>
                    <Heart size={10} fill={isLiked ? "currentColor" : "none"} /> {track.likes || 0}
                  </button>
                  {track.createdAt && <span>{timeAgo(track.createdAt.seconds)}</span>}
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {loading && (
        <div className="flex justify-center py-8">
          <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {hasMore && !loading && tracks.length > 0 && (
        <div className="flex justify-center">
          <button onClick={() => lastDoc && loadTracks(lastDoc)}
            className="px-6 py-2.5 rounded-lg bg-white/[0.03] border border-[#b14eff]/10 text-sm hover:bg-[#b14eff]/10 transition-colors">
            Load more
          </button>
        </div>
      )}
    </div>
  );
}
