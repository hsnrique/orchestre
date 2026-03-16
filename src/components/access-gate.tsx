"use client";

import { useState, useEffect, ReactNode } from "react";
import { Music2, Lock } from "lucide-react";

const STORAGE_KEY = "orchestre-access";

export function AccessGate({ children }: { children: ReactNode }) {
  const [authenticated, setAuthenticated] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const saved = sessionStorage.getItem(STORAGE_KEY);
    if (saved === "granted") {
      setAuthenticated(true);
    }
    setChecking(false);
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!password.trim()) return;

    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth/gate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: password.trim() }),
      });
      const data = await res.json();

      if (data.valid) {
        sessionStorage.setItem(STORAGE_KEY, "granted");
        setAuthenticated(true);
      } else {
        setError("Invalid access code");
        setPassword("");
      }
    } catch {
      setError("Connection error. Try again.");
    }
    setLoading(false);
  }

  if (checking) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#0a0812]">
        <div className="w-6 h-6 border-2 border-[#b14eff] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (authenticated) return <>{children}</>;

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0a0812] px-6">
      <div className="w-full max-w-sm space-y-8">
        <div className="text-center space-y-3">
          <div className="w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br from-[#ff2d8b]/20 to-[#b14eff]/20 border border-[#b14eff]/20 flex items-center justify-center">
            <Music2 size={28} className="text-[#b14eff]" />
          </div>
          <h1 className="text-2xl font-bold synth-glow" style={{ fontFamily: "var(--font-mono)" }}>
            Orchestre
          </h1>
          <p className="text-sm text-muted-foreground">
            Enter the access code to continue
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="relative">
            <Lock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Access code"
              autoFocus
              className="w-full pl-10 pr-4 py-3 rounded-xl bg-white/[0.03] border border-[#b14eff]/10 text-white placeholder:text-muted-foreground focus:outline-none focus:border-[#b14eff]/40 focus:shadow-[0_0_20px_rgba(177,78,255,0.1)] transition-all text-sm"
            />
          </div>

          {error && (
            <p className="text-xs text-red-400 text-center font-mono">{error}</p>
          )}

          <button
            type="submit"
            disabled={loading || !password.trim()}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white font-medium text-sm hover:opacity-90 transition-all shadow-[0_0_25px_rgba(177,78,255,0.15)] disabled:opacity-40 disabled:cursor-not-allowed"
          >
            {loading ? "Verifying..." : "Enter"}
          </button>
        </form>

        <p className="text-center text-[10px] text-muted-foreground/50 font-mono tracking-widest">
          PRIVATE BETA
        </p>
      </div>
    </div>
  );
}
