import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { title, genre, mood, style } = await req.json();

    const prompt = `Generate a stunning album cover art for a song.

Song Title: "${title}"
Genre: ${genre}
Mood: ${mood}
Style Direction: ${style || "cinematic, abstract, high contrast"}

Create a visually striking, professional album cover. Make it artistic and evocative.
The image should NOT contain any text. Focus on abstract or symbolic imagery that captures the mood and genre.
Style: dark, moody, high contrast, with subtle neon accents. Think vinyl record cover art meets modern digital art.`;

    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-image-preview",
      contents: prompt,
      config: {
        responseModalities: ["image", "text"],
      },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    const base64Image = imagePart.inlineData.data;
    const mimeType = imagePart.inlineData.mimeType || "image/png";

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64Image}`,
      mimeType,
    });
  } catch (error) {
    console.error("Cover generation error:", error);
    return NextResponse.json({ error: "Failed to generate cover art" }, { status: 500 });
  }
}
