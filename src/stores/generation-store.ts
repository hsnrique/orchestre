import { create } from "zustand";

interface GenerationProgress {
  lyrics: boolean;
  cover: boolean;
  music: boolean;
}

interface GenerationResult {
  title: string;
  lyrics: string;
  coverImage: string;
  audioUrl: string;
}

interface GenerationParams {
  description: string;
  stylePrompt: string;
  genre: string;
  mood: string;
  instruments: string[];
  bpm: number;
  engine: "minimax" | "suno";
  inspirations: string[];
  describeMode: "simple" | "advanced";
}

interface GenerationState {
  isGenerating: boolean;
  phase: string;
  progress: GenerationProgress;
  result: GenerationResult | null;
  error: string | null;
  params: GenerationParams | null;
  saved: boolean;
}

interface GenerationActions {
  startGeneration: (params: GenerationParams, userId: string, saveToFirebase: (t: string, l: string, c: string, a: string) => Promise<void>) => void;
  reset: () => void;
}

const initialState: GenerationState = {
  isGenerating: false,
  phase: "",
  progress: { lyrics: false, cover: false, music: false },
  result: null,
  error: null,
  params: null,
  saved: false,
};

export const useGenerationStore = create<GenerationState & GenerationActions>((set, get) => ({
  ...initialState,

  startGeneration: async (params, _userId, saveToFirebase) => {
    set({
      isGenerating: true,
      phase: "Composing lyrics...",
      progress: { lyrics: false, cover: false, music: false },
      result: null,
      error: null,
      params,
      saved: false,
    });

    try {
      const theme = params.describeMode === "simple"
        ? [params.description, params.inspirations.length > 0 ? `Style: ${params.inspirations.join(", ")}` : ""].filter(Boolean).join(". ")
        : params.description;
      const genre = params.describeMode === "simple" ? params.inspirations[0] || "" : params.genre;
      const mood = params.describeMode === "simple" ? params.inspirations[1] || "" : params.mood;

      const lyricsRes = await fetch("/api/lyrics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ genre, mood, theme }),
      });
      const lyricsData = await lyricsRes.json();
      const genTitle = lyricsData.title || "Untitled";
      const genLyrics = lyricsData.lyrics || "";

      set((s) => ({
        progress: { ...s.progress, lyrics: true },
        result: { title: genTitle, lyrics: genLyrics, coverImage: "", audioUrl: "" },
        phase: "Producing your track...",
      }));

      let genCover = "";
      let genAudio = "";

      const coverPromise = fetch("/api/cover", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: genTitle, genre, mood }),
      }).then((r) => r.json()).then((data) => {
        genCover = data.image || "";
        set((s) => ({
          progress: { ...s.progress, cover: true },
          result: s.result ? { ...s.result, coverImage: genCover } : null,
        }));
      });

      const musicEndpoint = params.engine === "suno" ? "/api/suno" : "/api/music";
      const musicBody = params.engine === "suno"
        ? { prompt: params.stylePrompt, lyrics: genLyrics, title: genTitle, style: params.stylePrompt }
        : { prompt: params.stylePrompt, lyrics: genLyrics };

      const musicPromise = fetch(musicEndpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(musicBody),
      }).then((r) => r.json()).then((data) => {
        if (data.audioUrl) {
          genAudio = data.audioUrl;
          set((s) => ({
            progress: { ...s.progress, music: true },
            result: s.result ? { ...s.result, audioUrl: genAudio } : null,
          }));
        } else {
          throw new Error(data.error || "Music generation failed");
        }
      });

      await Promise.all([coverPromise, musicPromise]);

      set({ phase: "Saving to library..." });
      await saveToFirebase(genTitle, genLyrics, genCover, genAudio);
      set({ isGenerating: false, phase: "", saved: true });
    } catch (err) {
      set({
        error: err instanceof Error ? err.message : "Something went wrong",
        phase: "",
        isGenerating: false,
      });
    }
  },

  reset: () => set(initialState),
}));
