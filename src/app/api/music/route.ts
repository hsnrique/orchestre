import { NextRequest, NextResponse } from "next/server";
import { fal } from "@fal-ai/client";

fal.config({ credentials: process.env.FAL_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics } = await req.json();

    const safePrompt = (prompt || "").slice(0, 300);
    const safeLyrics = (lyrics || "").slice(0, 3000);

    console.log("[MUSIC] Generating with MiniMax Music v2...");
    console.log("[MUSIC] Prompt:", safePrompt.length, "chars");
    console.log("[MUSIC] Lyrics:", safeLyrics.length, "chars");

    const result = await fal.subscribe("fal-ai/minimax-music/v2", {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      input: {
        prompt: safePrompt,
        lyrics_prompt: safeLyrics,
        audio_setting: {
          sample_rate: 44100 as never,
          bitrate: 256000 as never,
          format: "mp3",
        },
      },
      logs: true,
      onQueueUpdate: (update) => {
        console.log("[MUSIC] Queue:", update.status);
      },
    });

    const audio = (result.data as { audio?: { url?: string } })?.audio;
    console.log("[MUSIC] Done! URL:", audio?.url);

    return NextResponse.json({ audioUrl: audio?.url || null });
  } catch (error: unknown) {
    const body = (error as { body?: unknown })?.body;
    console.error("[MUSIC] Error:", JSON.stringify(body || error, null, 2));
    return NextResponse.json({ error: "Failed to generate music" }, { status: 500 });
  }
}
