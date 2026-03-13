"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { doc, setDoc, getDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { db, storage } from "@/lib/firebase";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import gsap from "gsap";
import { Loader2, Check, RefreshCw, Sparkles } from "lucide-react";

export default function OnboardingPage() {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const isReady = !loading && !profileLoading;
  const hasStartedGeneration = useRef(false);

  const [username, setUsername] = useState("");
  const [avatarDataUrl, setAvatarDataUrl] = useState("");
  const [generatingUsername, setGeneratingUsername] = useState(true);
  const [generatingAvatar, setGeneratingAvatar] = useState(true);
  const [saving, setSaving] = useState(false);
  const [usernameError, setUsernameError] = useState("");

  useEffect(() => {
    if (!isReady) return;
    if (!user) { router.push("/login"); return; }
    if (profile?.username) { router.push("/"); return; }
    if (!hasStartedGeneration.current) {
      hasStartedGeneration.current = true;
      generateBoth();
    }
  }, [user, profile, isReady, router]);

  async function generateBoth() {
    generateUsername();
    generateAvatar();
  }

  async function generateUsername() {
    setGeneratingUsername(true);
    try {
      const res = await fetch("/api/username", { method: "POST" });
      const data = await res.json();
      setUsername(data.username || "artist_" + Math.random().toString(36).slice(2, 8));
    } catch {
      setUsername("artist_" + Math.random().toString(36).slice(2, 8));
    }
    setGeneratingUsername(false);
  }

  async function generateAvatar() {
    if (!user) return;
    setGeneratingAvatar(true);
    try {
      const res = await fetch("/api/avatar", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ displayName: user.displayName }),
      });
      const data = await res.json();
      if (data.image) setAvatarDataUrl(data.image);
    } catch {
      console.error("Avatar generation failed, using default");
    }
    setGeneratingAvatar(false);
  }

  function validateUsername(value: string) {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, "");
    if (clean.length > 18) return;
    setUsername(clean);
    setUsernameError("");
    if (clean.length < 3) setUsernameError("Must be at least 3 characters");
  }

  async function handleComplete() {
    if (!user || username.length < 3) return;
    setSaving(true);
    setUsernameError("");

    try {
      const usernameDoc = await getDoc(doc(db, "usernames", username));
      if (usernameDoc.exists()) {
        setUsernameError("Username already taken");
        setSaving(false);
        return;
      }

      let avatarUrl = user.photoURL || "";
      if (avatarDataUrl) {
        const response = await fetch(avatarDataUrl);
        const blob = await response.blob();
        const storageRef = ref(storage, `avatars/${user.uid}.png`);
        await uploadBytes(storageRef, blob);
        avatarUrl = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "usernames", username), { uid: user.uid });
      await setDoc(doc(db, "users", user.uid), {
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        avatarUrl,
        username,
        bio: "",
        followersCount: 0,
        followingCount: 0,
        tracksCount: 0,
        isNewUser: false,
        lastLogin: serverTimestamp(),
        createdAt: serverTimestamp(),
      }, { merge: true });

      router.push("/");
    } catch (error) {
      console.error("Onboarding error:", error);
      setUsernameError("Something went wrong, try again");
    }
    setSaving(false);
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="w-6 h-6 animate-spin text-[#b14eff]" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center px-6 relative overflow-hidden">
      <div className="absolute inset-0 synth-grid opacity-30" />
      <div className="absolute top-1/3 left-1/3 w-[500px] h-[500px] bg-[#b14eff]/5 rounded-full blur-[150px]" />
      <div className="absolute bottom-1/3 right-1/3 w-[400px] h-[400px] bg-[#ff2d8b]/5 rounded-full blur-[120px]" />

      <div className="onboarding-card relative z-10 w-full max-w-md space-y-8">
        <div className="text-center space-y-2">
          <div className="text-xs font-mono tracking-[0.3em] text-[#b14eff]/60 uppercase flex items-center justify-center gap-2">
            <Sparkles size={12} /> Welcome to Orchestre
          </div>
          <h1 className="text-3xl font-bold synth-glow">Your Identity</h1>
          <p className="text-sm text-muted-foreground">We created a unique artist identity for you</p>
        </div>

        <div className="flex flex-col items-center gap-6">
          <div className="relative group">
            <div className="w-32 h-32 rounded-full overflow-hidden neon-border">
              {generatingAvatar ? (
                <div className="w-full h-full bg-white/5 flex items-center justify-center">
                  <Loader2 className="w-6 h-6 animate-spin text-[#b14eff]" />
                </div>
              ) : avatarDataUrl ? (
                <img src={avatarDataUrl} alt="Your avatar" className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-[#ff2d8b]/20 to-[#b14eff]/20 flex items-center justify-center text-3xl">
                  {user?.displayName?.charAt(0) || "?"}
                </div>
              )}
            </div>
            <button
              onClick={generateAvatar}
              disabled={generatingAvatar}
              className="absolute -bottom-1 -right-1 p-2 rounded-full bg-[#b14eff] text-white hover:bg-[#9b3ee0] transition-colors shadow-lg disabled:opacity-50"
            >
              <RefreshCw size={14} className={generatingAvatar ? "animate-spin" : ""} />
            </button>
          </div>

          <div className="w-full space-y-2">
            <label className="text-sm font-medium flex items-center gap-2">
              Username
              {generatingUsername && <Loader2 size={12} className="animate-spin text-[#b14eff]" />}
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground text-sm">@</span>
              <Input
                value={username}
                onChange={(e) => validateUsername(e.target.value)}
                disabled={generatingUsername}
                className="pl-7 bg-white/[0.03] border-[#b14eff]/10 focus:border-[#b14eff]/40"
                placeholder="your_username"
              />
              <button
                onClick={generateUsername}
                disabled={generatingUsername}
                className="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-muted-foreground hover:text-[#b14eff] transition-colors"
              >
                <RefreshCw size={14} className={generatingUsername ? "animate-spin" : ""} />
              </button>
            </div>
            {usernameError && <p className="text-xs text-red-400">{usernameError}</p>}
            <p className="text-xs text-muted-foreground">You can change this later</p>
          </div>
        </div>

        <Button
          onClick={handleComplete}
          disabled={saving || generatingUsername || username.length < 3}
          className="w-full bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] hover:opacity-90 text-white py-6 text-base font-semibold shadow-[0_0_30px_rgba(177,78,255,0.15)]"
        >
          {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : (
            <span className="flex items-center gap-2"><Check size={18} /> Start Creating</span>
          )}
        </Button>
      </div>
    </div>
  );
}
