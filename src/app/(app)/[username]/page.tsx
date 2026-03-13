"use client";

import { useEffect, useState, useCallback, use } from "react";
import { collection, query, where, orderBy, getDocs, doc, getDoc } from "firebase/firestore";
import { db } from "@/lib/firebase";
import { useAuth } from "@/lib/auth-context";
import { isFollowing, followUser, unfollowUser, getLikedTrackIds, likeTrack, unlikeTrack } from "@/lib/social";
import { Play, Heart, Headphones, Music2, Users, ArrowLeft, UserPlus, UserCheck } from "lucide-react";
import { usePlayerStore, PlayerTrack } from "@/stores/player-store";
import Link from "next/link";

interface PublicProfile {
  displayName: string;
  avatarUrl: string;
  username: string;
  bio: string;
  followersCount: number;
  followingCount: number;
  tracksCount: number;
}

interface ProfileTrack {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  genre: string;
  plays: number;
  likes: number;
  isPublic: boolean;
  createdAt: { seconds: number };
}

export default function ProfilePage({ params }: { params: Promise<{ username: string }> }) {
  const { username } = use(params);
  const { user } = useAuth();
  const [profile, setProfile] = useState<PublicProfile | null>(null);
  const [profileUid, setProfileUid] = useState<string | null>(null);
  const [tracks, setTracks] = useState<ProfileTrack[]>([]);
  const [likedIds, setLikedIds] = useState<Set<string>>(new Set());
  const [following, setFollowing] = useState(false);
  const [followLoading, setFollowLoading] = useState(false);
  const [loading, setLoading] = useState(true);
  const play = usePlayerStore((s) => s.play);
  const currentTrack = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);

  const loadLikes = useCallback(async (trackIds: string[]) => {
    if (!user || trackIds.length === 0) return;
    const liked = await getLikedTrackIds(user.uid, trackIds);
    setLikedIds(liked);
  }, [user]);

  useEffect(() => { loadProfile(); }, [username, user]);

  async function loadProfile() {
    setLoading(true);
    try {
      const usernameDoc = await getDoc(doc(db, "usernames", username));
      if (!usernameDoc.exists()) { setLoading(false); return; }

      const uid = usernameDoc.data().uid;
      setProfileUid(uid);
      const isOwn = user?.uid === uid;

      const userDoc = await getDoc(doc(db, "users", uid));
      if (userDoc.exists()) setProfile(userDoc.data() as PublicProfile);

      const tracksQuery = isOwn
        ? query(collection(db, "tracks"), where("userId", "==", uid), orderBy("createdAt", "desc"))
        : query(collection(db, "tracks"), where("userId", "==", uid), where("isPublic", "==", true), orderBy("createdAt", "desc"));

      const snap = await getDocs(tracksQuery);
      const loadedTracks = snap.docs.map((d) => ({ id: d.id, ...d.data() } as ProfileTrack));
      setTracks(loadedTracks);
      loadLikes(loadedTracks.map((t) => t.id));

      if (user && !isOwn) {
        const follows = await isFollowing(user.uid, uid);
        setFollowing(follows);
      }
    } catch (error) {
      console.error("Profile load error:", error);
    }
    setLoading(false);
  }

  async function toggleFollow() {
    if (!user || !profileUid || user.uid === profileUid) return;
    setFollowLoading(true);
    const wasFollowing = following;
    setFollowing(!wasFollowing);
    setProfile((p) => p ? {
      ...p,
      followersCount: (p.followersCount || 0) + (wasFollowing ? -1 : 1)
    } : p);
    try {
      wasFollowing
        ? await unfollowUser(user.uid, profileUid)
        : await followUser(user.uid, profileUid);
    } catch {
      setFollowing(wasFollowing);
      setProfile((p) => p ? {
        ...p,
        followersCount: (p.followersCount || 0) + (wasFollowing ? 1 : -1)
      } : p);
    }
    setFollowLoading(false);
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

  function playTrack(track: ProfileTrack) {
    const pt: PlayerTrack = {
      id: track.id, title: track.title, audioUrl: track.audioUrl,
      coverUrl: track.coverUrl, username, genre: track.genre,
    };
    const allPt = tracks.filter((t) => t.audioUrl).map((t) => ({
      id: t.id, title: t.title, audioUrl: t.audioUrl,
      coverUrl: t.coverUrl, username, genre: t.genre,
    }));
    play(pt, allPt);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!profile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 px-6">
        <h1 className="text-2xl font-bold">User not found</h1>
        <p className="text-sm text-muted-foreground">@{username} doesn&apos;t exist</p>
        <Link href="/" className="text-sm text-[#b14eff] hover:underline flex items-center gap-1">
          <ArrowLeft size={14} /> Back to home
        </Link>
      </div>
    );
  }

  const isOwn = user?.uid === profileUid;

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-6 py-6 md:py-10 space-y-8 md:space-y-10">
      <div className="flex flex-col items-center md:flex-row md:items-start gap-4 md:gap-6">
        <div className="w-24 h-24 md:w-28 md:h-28 rounded-full overflow-hidden neon-border shrink-0">
          {profile.avatarUrl ? (
            <img src={profile.avatarUrl} alt={profile.username} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-br from-[#ff2d8b]/20 to-[#b14eff]/20 flex items-center justify-center text-3xl">
              {profile.displayName?.charAt(0) || "?"}
            </div>
          )}
        </div>

        <div className="flex-1 space-y-3 text-center md:text-left">
          <div className="flex flex-col md:flex-row items-center gap-3 md:gap-4">
            <div>
              <h1 className="text-2xl font-bold synth-glow">@{profile.username}</h1>
              <p className="text-sm text-muted-foreground">{profile.displayName}</p>
            </div>
            {!isOwn && user && (
              <button onClick={toggleFollow} disabled={followLoading}
                className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 transition-all ${
                  following
                    ? "bg-white/[0.05] border border-[#b14eff]/20 text-white hover:border-red-500/30 hover:text-red-400"
                    : "bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white hover:shadow-[0_0_20px_rgba(177,78,255,0.3)]"
                }`}>
                {following ? <><UserCheck size={14} /> Following</> : <><UserPlus size={14} /> Follow</>}
              </button>
            )}
          </div>

          {profile.bio && <p className="text-sm leading-relaxed">{profile.bio}</p>}

          <div className="flex items-center justify-center md:justify-start gap-4 md:gap-6 text-sm">
            <span className="flex items-center gap-1.5">
              <strong>{profile.followersCount || 0}</strong>
              <span className="text-muted-foreground">followers</span>
            </span>
            <span className="flex items-center gap-1.5">
              <strong>{profile.followingCount || 0}</strong>
              <span className="text-muted-foreground">following</span>
            </span>
            <span className="flex items-center gap-1.5">
              <Music2 size={14} className="text-[#b14eff]" />
              <strong>{tracks.length}</strong>
              <span className="text-muted-foreground">tracks</span>
            </span>
          </div>
        </div>
      </div>

      <div className="space-y-4">
        <h2 className="text-lg font-semibold flex items-center gap-2">
          <Users size={18} className="text-[#b14eff]" /> Tracks
        </h2>

        {tracks.length === 0 && (
          <p className="text-sm text-muted-foreground py-8 text-center">No public tracks yet</p>
        )}

        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4">
          {tracks.map((track) => {
            const isCurrentlyPlaying = currentTrack?.id === track.id && isPlaying;
            const isLiked = likedIds.has(track.id);
            return (
              <div key={track.id}
                className="group cursor-pointer rounded-xl overflow-hidden bg-white/[0.02] border border-[#b14eff]/[0.06] hover:border-[#b14eff]/20 transition-all duration-300"
                onClick={() => playTrack(track)}>
                <div className="relative aspect-square">
                  {track.coverUrl ? (
                    <img src={track.coverUrl} alt={track.title} className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full bg-gradient-to-br from-[#ff2d8b]/20 to-[#b14eff]/20 flex items-center justify-center">
                      <Music2 size={32} className="text-[#b14eff]/30" />
                    </div>
                  )}
                  <div className="absolute inset-0 bg-black/0 group-hover:bg-black/40 transition-colors flex items-center justify-center">
                    <div className={`w-12 h-12 rounded-full bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] flex items-center justify-center shadow-lg transition-all ${
                      isCurrentlyPlaying ? "scale-100 opacity-100" : "scale-75 opacity-0 group-hover:scale-100 group-hover:opacity-100"
                    }`}>
                      <Play size={18} className="text-white ml-0.5" fill="white" />
                    </div>
                  </div>
                  {!track.isPublic && (
                    <div className="absolute top-2 right-2 px-2 py-0.5 rounded-full bg-black/60 text-[10px] text-white/60">
                      Private
                    </div>
                  )}
                </div>
                <div className="p-3 space-y-1">
                  <h3 className="text-sm font-medium truncate">{track.title}</h3>
                  <div className="flex items-center gap-3 text-[10px] text-muted-foreground">
                    <span className="flex items-center gap-1"><Headphones size={10} /> {track.plays || 0}</span>
                    <button onClick={(e) => toggleLike(e, track.id)}
                      className={`flex items-center gap-1 transition-colors ${isLiked ? "text-[#ff2d8b]" : "hover:text-[#ff2d8b]"}`}>
                      <Heart size={10} fill={isLiked ? "currentColor" : "none"} /> {track.likes || 0}
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
