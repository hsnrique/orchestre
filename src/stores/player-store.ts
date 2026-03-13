import { create } from "zustand";
import { incrementPlayCount } from "@/lib/social";

export interface PlayerTrack {
  id: string;
  title: string;
  audioUrl: string;
  coverUrl: string;
  username?: string;
  genre?: string;
}

interface PlayerState {
  currentTrack: PlayerTrack | null;
  queue: PlayerTrack[];
  isPlaying: boolean;
  progress: number;
  currentTime: number;
  duration: number;
  volume: number;
  audioElement: HTMLAudioElement | null;
}

interface PlayerActions {
  setAudioElement: (el: HTMLAudioElement) => void;
  play: (track: PlayerTrack, queue?: PlayerTrack[]) => void;
  pause: () => void;
  resume: () => void;
  togglePlay: () => void;
  seek: (pct: number) => void;
  next: () => void;
  prev: () => void;
  setVolume: (v: number) => void;
  updateProgress: (time: number, dur: number) => void;
  onEnded: () => void;
}

export const usePlayerStore = create<PlayerState & PlayerActions>((set, get) => ({
  currentTrack: null,
  queue: [],
  isPlaying: false,
  progress: 0,
  currentTime: 0,
  duration: 0,
  volume: 1,
  audioElement: null,

  setAudioElement: (el) => set({ audioElement: el }),

  play: (track, queue) => {
    const { audioElement } = get();
    if (!audioElement) return;
    audioElement.src = track.audioUrl;
    audioElement.play();
    set({
      currentTrack: track,
      isPlaying: true,
      progress: 0,
      currentTime: 0,
      ...(queue ? { queue } : {}),
    });
    incrementPlayCount(track.id).catch(() => {});
  },

  pause: () => {
    get().audioElement?.pause();
    set({ isPlaying: false });
  },

  resume: () => {
    get().audioElement?.play();
    set({ isPlaying: true });
  },

  togglePlay: () => {
    const { isPlaying } = get();
    if (isPlaying) get().pause();
    else get().resume();
  },

  seek: (pct) => {
    const { audioElement } = get();
    if (audioElement && audioElement.duration) {
      audioElement.currentTime = pct * audioElement.duration;
    }
  },

  next: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const nextTrack = queue[(idx + 1) % queue.length];
    if (nextTrack) get().play(nextTrack);
  },

  prev: () => {
    const { queue, currentTrack } = get();
    if (!currentTrack || queue.length === 0) return;
    const idx = queue.findIndex((t) => t.id === currentTrack.id);
    const prevTrack = queue[(idx - 1 + queue.length) % queue.length];
    if (prevTrack) get().play(prevTrack);
  },

  setVolume: (v) => {
    const { audioElement } = get();
    if (audioElement) audioElement.volume = v;
    set({ volume: v });
  },

  updateProgress: (time, dur) => {
    set({
      currentTime: time,
      duration: dur,
      progress: dur > 0 ? (time / dur) * 100 : 0,
    });
  },

  onEnded: () => {
    const { queue, currentTrack } = get();
    if (queue.length > 1 && currentTrack) {
      get().next();
    } else {
      set({ isPlaying: false, progress: 0, currentTime: 0 });
    }
  },
}));
