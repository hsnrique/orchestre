import { NextResponse } from "next/server";
import { GoogleGenAI } from "@google/genai";
import { initializeApp, getApps, cert } from "firebase-admin/app";
import { getFirestore, Firestore } from "firebase-admin/firestore";

const ai = new GoogleGenAI({ apiKey: process.env.GOOGLE_GEMINI_API_KEY! });

function getAdminDb(): Firestore {
  if (getApps().length === 0) {
    initializeApp({
      credential: cert({
        projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
        clientEmail: process.env.NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.NEXT_PUBLIC_FIREBASE_PRIVATE_KEY?.replace(/\\n/g, "\n"),
      }),
    });
  }
  return getFirestore();
}

async function isUsernameTaken(username: string): Promise<boolean> {
  const doc = await getAdminDb().collection("usernames").doc(username).get();
  return doc.exists;
}

export async function POST() {
  try {
    const prompt = `Generate a single unique, creative username for a music platform. 
The username should be inspired by music culture — think musician stage names, orchestra references, musical terms, 
or creative combinations of musical words.

Rules:
- Must be 3-18 characters
- Lowercase letters, numbers, and underscores only
- Should feel artistic and musical
- Examples of the STYLE (do NOT use these): "velvet_chord", "nocturnix", "echo_viola", "synth_aria", "bass_dante"
- Be creative, don't use common words
- Return ONLY the username, nothing else. No quotes, no explanation.`;

    let username = "";
    for (let attempt = 0; attempt < 5; attempt++) {
      const response = await ai.models.generateContent({
        model: "gemini-3.1-flash-lite-preview",
        contents: prompt + `\n\nAttempt ${attempt + 1}. Be extra creative and unique.`,
      });

      const raw = response.text?.trim().toLowerCase().replace(/[^a-z0-9_]/g, "") || "";
      if (raw.length < 3 || raw.length > 18) continue;

      const taken = await isUsernameTaken(raw);
      if (!taken) {
        username = raw;
        break;
      }
      console.log(`[USERNAME] "${raw}" already taken, retrying...`);
    }

    if (!username) {
      const fallback = "artist_" + Math.random().toString(36).substring(2, 8);
      username = fallback;
    }

    return NextResponse.json({ username });
  } catch (error) {
    console.error("[USERNAME] Error:", error);
    const fallback = "musician_" + Math.random().toString(36).substring(2, 8);
    return NextResponse.json({ username: fallback });
  }
}

