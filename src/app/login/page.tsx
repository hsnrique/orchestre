"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import gsap from "gsap";

export default function LoginPage() {
  const { user, profile, loading, profileLoading, signIn } = useAuth();
  const router = useRouter();
  const titleRef = useRef<HTMLHeadingElement>(null);
  const subtitleRef = useRef<HTMLParagraphElement>(null);
  const buttonRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (loading || profileLoading) return;
    if (user) {
      router.push(profile?.username ? "/" : "/onboarding");
    }
  }, [user, profile, loading, profileLoading, router]);

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.fromTo(
        titleRef.current,
        { y: 40, opacity: 0, filter: "blur(10px)" },
        { y: 0, opacity: 1, filter: "blur(0px)", duration: 1.2, ease: "power3.out" }
      );
      gsap.fromTo(
        subtitleRef.current,
        { y: 30, opacity: 0 },
        { y: 0, opacity: 1, duration: 1, ease: "power3.out", delay: 0.3 }
      );
      gsap.fromTo(
        buttonRef.current,
        { y: 20, opacity: 0 },
        { y: 0, opacity: 1, duration: 0.8, ease: "power3.out", delay: 0.6 }
      );
    }, containerRef);

    return () => ctx.revert();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#ff2d8b] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div ref={containerRef} className="min-h-screen flex flex-col items-center justify-center relative overflow-hidden">
      <div className="absolute inset-0 vhs-gradient" />

      <div className="absolute top-1/4 left-1/4 w-96 h-96 bg-[#ff2d8b]/5 rounded-full blur-[120px]" />
      <div className="absolute bottom-1/4 right-1/4 w-96 h-96 bg-[#00f0ff]/5 rounded-full blur-[120px]" />

      <div className="relative z-10 flex flex-col items-center gap-8 px-6">
        <div className="flex flex-col items-center gap-3">
          <div className="text-xs font-mono tracking-[0.3em] text-[#ff2d8b]/60 uppercase">
            AI Music Studio
          </div>

          <h1
            ref={titleRef}
            className="text-6xl md:text-8xl font-bold tracking-tight vhs-glow"
            style={{ fontFamily: "var(--font-mono)" }}
          >
            Orchestre
          </h1>

          <p ref={subtitleRef} className="text-muted-foreground text-center max-w-md text-sm leading-relaxed">
            Create incredible music with AI. Lyrics powered by Gemini.
            Cover art by Nano Banana Pro. Music by Lyria.
          </p>
        </div>

        <div ref={buttonRef}>
          <Button
            onClick={signIn}
            size="lg"
            className="bg-white/5 border border-white/10 text-white hover:bg-white/10 hover:border-[#ff2d8b]/30 transition-all duration-300 px-8 py-6 text-base font-medium gap-3 pulse-glow"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continue with Google
          </Button>
        </div>

        <p className="text-[10px] text-muted-foreground/40 font-mono">
          v0.1.0 — Powered by Gemini Ecosystem
        </p>
      </div>
    </div>
  );
}
