"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Home, Music2, Library, User } from "lucide-react";
import gsap from "gsap";

const NAV_ITEMS = [
  { href: "/", label: "Home", icon: Home },
  { href: "/studio", label: "Studio", icon: Music2 },
  { href: "/library", label: "Library", icon: Library },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, profile, loading, profileLoading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);
  const isReady = !loading && !profileLoading;

  useEffect(() => {
    if (!isReady) return;
    if (!user) router.push("/login");
  }, [user, isReady, router]);

  useEffect(() => {
    if (mainRef.current) {
      gsap.fromTo(mainRef.current,
        { opacity: 0, y: 8 },
        { opacity: 1, y: 0, duration: 0.35, ease: "power2.out" }
      );
    }
  }, [pathname]);

  if (!isReady || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  const avatarSrc = profile?.avatarUrl || user.photoURL || "";
  const displayName = profile?.username ? `@${profile.username}` : user.displayName || "";
  const profileHref = profile?.username ? `/${profile.username}` : "/";
  const isProfileActive = profile?.username ? pathname === `/${profile.username}` : false;

  return (
    <div className="min-h-screen flex flex-col md:flex-row pb-[calc(56px+64px)] md:pb-[64px]">
      <aside className="hidden md:flex w-56 border-r border-[#b14eff]/[0.06] flex-col justify-between p-4 synth-grid-bg sticky top-0 h-screen shrink-0"
        style={{ background: "linear-gradient(180deg, rgba(17,14,31,0.97) 0%, rgba(10,8,18,0.99) 100%)" }}>
        <div className="flex flex-col gap-8">
          <Link href="/" className="flex items-center gap-3 px-2">
            <span className="text-xl font-bold synth-glow tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
              Orchestre
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                    isActive
                      ? "bg-[#b14eff]/10 text-white border border-[#b14eff]/20"
                      : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
                  }`}>
                  <Icon size={18} />
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#b14eff] shadow-[0_0_6px_rgba(177,78,255,0.5)]" />}
                </Link>
              );
            })}

            <div className="h-px bg-[#b14eff]/[0.06] my-2" />

            <Link href={profileHref}
              className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                isProfileActive
                  ? "bg-[#b14eff]/10 text-white border border-[#b14eff]/20"
                  : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
              }`}>
              <Avatar className="w-5 h-5 ring-1 ring-[#b14eff]/10">
                <AvatarImage src={avatarSrc} />
                <AvatarFallback className="bg-[#b14eff]/10 text-[#b14eff] text-[9px]">
                  {user.displayName?.[0] || "U"}
                </AvatarFallback>
              </Avatar>
              <span>Profile</span>
              {isProfileActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#b14eff] shadow-[0_0_6px_rgba(177,78,255,0.5)]" />}
            </Link>
          </nav>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg border border-[#b14eff]/[0.04] bg-white/[0.01]">
          <Avatar className="w-8 h-8 ring-1 ring-[#b14eff]/10">
            <AvatarImage src={avatarSrc} />
            <AvatarFallback className="bg-[#b14eff]/10 text-[#b14eff] text-xs">
              {user.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate">{displayName}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
      </aside>

      <nav className="md:hidden fixed bottom-[64px] left-0 right-0 z-[90] bg-[oklch(0.07_0.02_290)]/95 backdrop-blur-xl border-t border-[#b14eff]/[0.08]">
        <div className="flex items-center justify-around h-14">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
            return (
              <Link key={item.href} href={item.href}
                className={`flex flex-col items-center gap-0.5 py-1 px-4 transition-colors ${
                  isActive ? "text-[#b14eff]" : "text-muted-foreground"
                }`}>
                <Icon size={20} />
                <span className="text-[10px] font-medium">{item.label}</span>
              </Link>
            );
          })}
          <Link href={profileHref}
            className={`flex flex-col items-center gap-0.5 py-1 px-4 transition-colors ${
              isProfileActive ? "text-[#b14eff]" : "text-muted-foreground"
            }`}>
            <User size={20} />
            <span className="text-[10px] font-medium">Profile</span>
          </Link>
        </div>
      </nav>

      <main ref={mainRef} className="flex-1 overflow-y-auto synth-grid-bg min-w-0">
        {children}
      </main>
    </div>
  );
}
