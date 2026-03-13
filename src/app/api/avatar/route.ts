import { NextRequest, NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

export async function POST(req: NextRequest) {
  try {
    const { displayName } = await req.json();

    const prompt = `Create a stunning artistic portrait of a music composer or conductor.
Style: oil painting inspired by Italian and Spanish master painters like Velazquez, Caravaggio, Goya.
The portrait should feel like a classical painting but with a modern twist — someone who could be a modern musician, singer, or orchestra conductor.
Use dramatic chiaroscuro lighting, rich warm tones, deep shadows.
The person should look creative, passionate, and artistic. NOT a real person's likeness.
Name inspiration: "${displayName || "an anonymous artist"}"
Do NOT include any text in the image. Square composition, 1:1 ratio.`;

    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: prompt,
      config: { responseModalities: ["image", "text"] },
    });

    const parts = response.candidates?.[0]?.content?.parts || [];
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const imagePart = parts.find((p: any) => p.inlineData);

    if (!imagePart?.inlineData) {
      return NextResponse.json({ error: "No image generated" }, { status: 500 });
    }

    return NextResponse.json({
      image: `data:${imagePart.inlineData.mimeType || "image/png"};base64,${imagePart.inlineData.data}`,
    });
  } catch (error) {
    console.error("[AVATAR] Error:", error);
    return NextResponse.json({ error: "Failed to generate avatar" }, { status: 500 });
  }
}
