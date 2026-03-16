"use client";

import { useEffect, useRef, useState } from "react";
import { Play, Pause, SkipForward, SkipBack, Volume2, VolumeX, Shuffle, Music2 } from "lucide-react";
import { usePlayerStore } from "@/stores/player-store";

function formatTime(sec: number) {
  if (!sec || !isFinite(sec)) return "0:00";
  const m = Math.floor(sec / 60);
  const s = Math.floor(sec % 60);
  return `${m}:${s.toString().padStart(2, "0")}`;
}

export function GlobalAudioProvider() {
  const audioRef = useRef<HTMLAudioElement>(null);
  const setAudioElement = usePlayerStore((s) => s.setAudioElement);
  const updateProgress = usePlayerStore((s) => s.updateProgress);
  const onEnded = usePlayerStore((s) => s.onEnded);

  useEffect(() => {
    if (audioRef.current) setAudioElement(audioRef.current);
  }, [setAudioElement]);

  return (
    <audio
      ref={audioRef}
      onTimeUpdate={(e) => {
        const a = e.currentTarget;
        updateProgress(a.currentTime, a.duration);
      }}
      onEnded={onEnded}
      preload="auto"
    />
  );
}

export function GlobalPlayerBar() {
  const track = usePlayerStore((s) => s.currentTrack);
  const isPlaying = usePlayerStore((s) => s.isPlaying);
  const progress = usePlayerStore((s) => s.progress);
  const currentTime = usePlayerStore((s) => s.currentTime);
  const duration = usePlayerStore((s) => s.duration);
  const volume = usePlayerStore((s) => s.volume);
  const shuffle = usePlayerStore((s) => s.shuffle);
  const togglePlay = usePlayerStore((s) => s.togglePlay);
  const seek = usePlayerStore((s) => s.seek);
  const next = usePlayerStore((s) => s.next);
  const prev = usePlayerStore((s) => s.prev);
  const setVolume = usePlayerStore((s) => s.setVolume);
  const toggleShuffle = usePlayerStore((s) => s.toggleShuffle);
  const [prevVolume, setPrevVolume] = useState(1);

  const hasTrack = !!track;

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const pct = (e.clientX - rect.left) / rect.width;
    seek(Math.max(0, Math.min(1, pct)));
  };

  const handleMuteToggle = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 1);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setVolume(parseFloat(e.target.value));
  };

  const isMuted = volume === 0;
  const VolumeIcon = isMuted ? VolumeX : Volume2;

  return (
    <div className="fixed bottom-0 left-0 right-0 z-[100] bg-[oklch(0.08_0.02_290)] border-t border-[#b14eff]/10 backdrop-blur-xl">
      <div className="h-1 cursor-pointer group relative" onClick={handleSeek}>
        <div className="absolute inset-0 bg-white/5" />
        <div
          className="absolute inset-y-0 left-0 bg-gradient-to-r from-[#ff2d8b] via-[#b14eff] to-[#00f0ff] transition-[width] duration-100"
          style={{ width: `${progress}%` }}
        />
        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 bg-white/5 transition-opacity" />
      </div>

      <div className="flex items-center gap-3 px-3 py-2 md:px-4 md:py-2.5 md:gap-4">
        <div className="flex items-center gap-2.5 min-w-0 flex-1 md:gap-3">
          {hasTrack && track.coverUrl ? (
            <img
              src={track.coverUrl}
              alt={track.title}
              className="w-9 h-9 md:w-11 md:h-11 rounded-md object-cover border border-[#b14eff]/20 shadow-[0_0_10px_rgba(177,78,255,0.1)]"
            />
          ) : (
            <div className="w-9 h-9 md:w-11 md:h-11 rounded-md flex items-center justify-center bg-white/[0.03] border border-[#b14eff]/10">
              <Music2 size={16} className="text-muted-foreground/40" />
            </div>
          )}
          <div className="min-w-0">
            <div className="text-xs md:text-sm font-medium truncate">
              {hasTrack ? track.title : "No track selected"}
            </div>
            {hasTrack && track.username && (
              <div className="text-[10px] md:text-xs text-muted-foreground truncate">{track.username}</div>
            )}
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-2">
          <button
            onClick={toggleShuffle}
            className={`p-1 md:p-1.5 transition-colors ${shuffle ? "text-[#b14eff]" : "text-muted-foreground hover:text-white"}`}
            title="Shuffle"
          >
            <Shuffle size={13} className="md:hidden" />
            <Shuffle size={15} className="hidden md:block" />
          </button>
          <button onClick={prev} className="p-1 md:p-1.5 text-muted-foreground hover:text-white transition-colors">
            <SkipBack size={14} className="md:hidden" />
            <SkipBack size={16} className="hidden md:block" />
          </button>
          <button
            onClick={togglePlay}
            className="p-2 md:p-2.5 rounded-full bg-gradient-to-r from-[#ff2d8b] to-[#b14eff] text-white hover:opacity-90 transition-opacity shadow-[0_0_20px_rgba(177,78,255,0.2)]"
          >
            {isPlaying ? <Pause size={14} className="md:hidden" /> : <Play size={14} className="ml-0.5 md:hidden" />}
            {isPlaying ? <Pause size={16} className="hidden md:block" /> : <Play size={16} className="ml-0.5 hidden md:block" />}
          </button>
          <button onClick={next} className="p-1 md:p-1.5 text-muted-foreground hover:text-white transition-colors">
            <SkipForward size={14} className="md:hidden" />
            <SkipForward size={16} className="hidden md:block" />
          </button>
        </div>

        <div className="hidden md:flex items-center gap-3 flex-1 justify-end">
          <span className="text-xs text-muted-foreground font-mono tabular-nums">
            {formatTime(currentTime)} / {formatTime(duration)}
          </span>
          <div className="flex items-center gap-2 group/vol">
            <button onClick={handleMuteToggle} className="text-muted-foreground hover:text-white transition-colors">
              <VolumeIcon size={14} />
            </button>
            <input
              type="range"
              min={0}
              max={1}
              step={0.01}
              value={volume}
              onChange={handleVolumeChange}
              className="w-20 h-1 appearance-none bg-white/10 rounded-full cursor-pointer accent-[#b14eff]
                [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3
                [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-[#b14eff]
                [&::-webkit-slider-thumb]:shadow-[0_0_6px_rgba(177,78,255,0.5)] [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-125"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
