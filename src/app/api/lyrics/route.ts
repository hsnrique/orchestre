import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { genre, mood, theme } = await req.json();

    const prompt = `You are a world-class songwriter. Write a complete, original song in the same language as prompted.

Genre: ${genre}
Mood: ${mood}
Theme/Description: ${theme}

Requirements:
- Create a compelling title
- Write full lyrics with clear structure markers: [Verse 1], [Chorus], [Verse 2], [Bridge], [Outro]
- Make the lyrics emotionally resonant and poetic
- Keep it between 3-5 minutes of singing length
- Suggest 1 to 5 music style/mood/instrument tags (inspirations) that best describe this song. Be creative, they can be anything.

Respond ONLY in this JSON format:
{
  "title": "Song Title",
  "lyrics": "Full lyrics with structure markers",
  "structure": ["Verse 1", "Chorus", "Verse 2", "Chorus", "Bridge", "Chorus", "Outro"],
  "inspirations": ["tag1", "tag2"]
}`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-pro-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        temperature: 1.0,
      },
    });

    const text = response.text || "";
    const parsed = JSON.parse(text);

    return NextResponse.json(parsed);
  } catch (error) {
    console.error("Lyrics generation error:", error);
    return NextResponse.json({ error: "Failed to generate lyrics" }, { status: 500 });
  }
}
