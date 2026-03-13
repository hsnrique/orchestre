import { NextRequest, NextResponse } from "next/server";

const SUNO_API_BASE = "https://api.sunoapi.org/api/v1";
const POLL_INTERVAL = 5000;
const MAX_POLL_TIME = 300000;

export async function POST(req: NextRequest) {
  try {
    const { prompt, lyrics, title, style } = await req.json();
    const apiKey = process.env.SUNO_API_KEY;
    if (!apiKey) {
      return NextResponse.json({ error: "SUNO_API_KEY not configured" }, { status: 500 });
    }

    const safeTitle = (title || "Untitled").slice(0, 100);
    const safeLyrics = (lyrics || "").slice(0, 5000);
    const safeStyle = (style || prompt || "").slice(0, 1000);

    console.log("[SUNO] Generating with Suno V5...");
    console.log("[SUNO] Title:", safeTitle);
    console.log("[SUNO] Style:", safeStyle.length, "chars");
    console.log("[SUNO] Lyrics:", safeLyrics.length, "chars");

    const genRes = await fetch(`${SUNO_API_BASE}/generate`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        customMode: true,
        instrumental: false,
        model: "V5",
        prompt: safeLyrics,
        style: safeStyle,
        title: safeTitle,
        callBackUrl: "https://localhost:3000/api/suno/callback",
      }),
    });

    const genData = await genRes.json();
    console.log("[SUNO] Generate response:", JSON.stringify(genData));

    if (genData.code !== 200 || !genData.data?.taskId) {
      return NextResponse.json({ error: genData.msg || "Failed to start Suno generation" }, { status: 500 });
    }

    const taskId = genData.data.taskId;
    console.log("[SUNO] Task ID:", taskId);

    const startTime = Date.now();
    while (Date.now() - startTime < MAX_POLL_TIME) {
      await new Promise((r) => setTimeout(r, POLL_INTERVAL));

      const pollRes = await fetch(`${SUNO_API_BASE}/generate/record-info?taskId=${taskId}`, {
        headers: { Authorization: `Bearer ${apiKey}` },
      });
      const pollData = await pollRes.json();
      const status = pollData.data?.status;
      console.log("[SUNO] Poll status:", status, `(${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);

      if (status === "SUCCESS" || status === "FIRST_SUCCESS") {
        const tracks = pollData.data?.response?.sunoData;
        if (tracks && tracks.length > 0) {
          const audioUrl = tracks[0].audioUrl || tracks[0].streamAudioUrl;
          console.log("[SUNO] Done! URL:", audioUrl);
          return NextResponse.json({ audioUrl });
        }
      }

      const failStatuses = ["CREATE_TASK_FAILED", "GENERATE_AUDIO_FAILED", "CALLBACK_EXCEPTION", "SENSITIVE_WORD_ERROR"];
      if (failStatuses.includes(status)) {
        const errMsg = pollData.data?.errorMessage || `Generation failed: ${status}`;
        console.error("[SUNO] Failed:", errMsg);
        return NextResponse.json({ error: errMsg }, { status: 500 });
      }
    }

    return NextResponse.json({ error: "Generation timed out after 5 minutes" }, { status: 504 });
  } catch (error: unknown) {
    console.error("[SUNO] Error:", error);
    return NextResponse.json({ error: "Failed to generate music with Suno" }, { status: 500 });
  }
}
