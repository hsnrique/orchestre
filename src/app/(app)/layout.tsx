"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useRef } from "react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import gsap from "gsap";

const NAV_ITEMS = [
  { href: "/studio", label: "Studio", icon: "🎹" },
  { href: "/library", label: "Library", icon: "💿" },
];

export default function AppLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const mainRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) router.push("/login");
  }, [user, loading, router]);

  useEffect(() => {
    if (mainRef.current) {
      gsap.fromTo(mainRef.current, { opacity: 0, y: 10 }, { opacity: 1, y: 0, duration: 0.5, ease: "power2.out" });
    }
  }, [pathname]);

  if (loading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-[#b14eff]/[0.06] flex flex-col justify-between p-4 synth-grid-bg"
        style={{ background: "linear-gradient(180deg, rgba(17,14,31,0.97) 0%, rgba(10,8,18,0.99) 100%)" }}>
        <div className="flex flex-col gap-8">
          <Link href="/studio" className="flex items-center gap-3 px-2">
            <span className="text-xl font-bold synth-glow tracking-tight" style={{ fontFamily: "var(--font-mono)" }}>
              Orchestre
            </span>
          </Link>

          <nav className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => {
              const isActive = pathname.startsWith(item.href);
              return (
                <Link key={item.href} href={item.href}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm transition-all duration-300 ${
                    isActive
                      ? "bg-[#b14eff]/10 text-white border border-[#b14eff]/20"
                      : "text-muted-foreground hover:text-white hover:bg-white/[0.03]"
                  }`}>
                  <span className="text-base">{item.icon}</span>
                  <span>{item.label}</span>
                  {isActive && <div className="ml-auto w-1.5 h-1.5 rounded-full bg-[#b14eff] shadow-[0_0_6px_rgba(177,78,255,0.5)]" />}
                </Link>
              );
            })}
          </nav>
        </div>

        <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-white/[0.03] transition-colors cursor-pointer" onClick={signOut}>
          <Avatar className="w-8 h-8 ring-1 ring-[#b14eff]/10">
            <AvatarImage src={user.photoURL || ""} />
            <AvatarFallback className="bg-[#b14eff]/10 text-[#b14eff] text-xs">
              {user.displayName?.[0] || "U"}
            </AvatarFallback>
          </Avatar>
          <div className="flex flex-col min-w-0">
            <span className="text-xs font-medium truncate">{user.displayName}</span>
            <span className="text-[10px] text-muted-foreground truncate">{user.email}</span>
          </div>
        </div>
      </aside>

      <main ref={mainRef} className="flex-1 overflow-y-auto synth-grid-bg">
        {children}
      </main>
    </div>
  );
}
