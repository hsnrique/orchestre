<div align="center">

# 🎵 Orchestre

**AI-powered music studio — generate lyrics, cover art, and full tracks from a text prompt.**

Built with Next.js 16, Firebase, Zustand, and AI models (Gemini, MiniMax, Suno).

[Getting Started](#-getting-started) · [Features](#-features) · [Architecture](#-architecture) · [Contributing](#-contributing)

</div>

---

## ✨ Features

- **AI Music Generation** — Two engines available:
  - **Lyria** (MiniMax Music v2) — Fast generation (~2 min)
  - **Maestro** (Suno V5) — Premium quality (~3 min)
- **AI Lyrics** — Gemini generates original song lyrics based on mood, genre, and theme
- **AI Cover Art** — Automatic album cover generation matching the song's vibe
- **Global Player** — Persistent player bar with play/pause, skip, seek, volume, and shuffle
- **Library** — Browse and manage all your generated tracks
- **Profiles** — Public artist profiles with follow system
- **Social Feed** — Discover music from other creators with likes and play counts
- **State Persistence** — Volume, shuffle, and last played track survive page reloads
- **Access Gate** — Optional master password to restrict access (private beta mode)

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| Framework | Next.js 16 (App Router) |
| Language | TypeScript |
| Styling | Tailwind CSS 4 + custom synth theme |
| State | Zustand (with persist middleware) |
| Auth | Firebase Auth (Google OAuth) |
| Database | Cloud Firestore |
| Storage | Firebase Storage |
| AI — Lyrics | Google Gemini |
| AI — Music | MiniMax Music v2 (via fal.ai) / Suno V5 |
| AI — Cover Art | Google Gemini (image generation) |
| Animations | GSAP |

## 🚀 Getting Started

### Prerequisites

- Node.js 18+
- npm, yarn, or pnpm
- Firebase project with Auth, Firestore, and Storage enabled
- API keys for Gemini, fal.ai, and optionally Suno

### 1. Clone the repo

```bash
git clone https://github.com/hsnrique/orchestre.git
cd orchestre
```

### 2. Install dependencies

```bash
npm install
```

### 3. Set up environment variables

Copy the example file and fill in your keys:

```bash
cp .env.example .env.local
```

| Variable | Description |
|---|---|
| `GOOGLE_GEMINI_API_KEY` | Gemini API key for lyrics and cover art generation |
| `NEXT_PUBLIC_FIREBASE_API_KEY` | Firebase project API key |
| `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` | Firebase auth domain |
| `NEXT_PUBLIC_FIREBASE_PROJECT_ID` | Firebase project ID |
| `NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET` | Firebase storage bucket |
| `NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID` | Firebase messaging sender ID |
| `NEXT_PUBLIC_FIREBASE_APP_ID` | Firebase app ID |
| `NEXT_PUBLIC_FIREBASE_CLIENT_EMAIL` | Firebase Admin SDK service account email |
| `NEXT_PUBLIC_FIREBASE_PRIVATE_KEY` | Firebase Admin SDK private key (PEM format, wrapped in quotes) |
| `FAL_KEY` | fal.ai API key for MiniMax Music generation |
| `SUNO_API_KEY` | Suno API key for premium music generation (optional) |
| `MASTER_PASS_NET` | Master password for site access gate (leave empty to disable) |

### 4. Firebase setup

1. Create a Firebase project at [console.firebase.google.com](https://console.firebase.google.com)
2. Enable **Authentication** → Google sign-in provider
3. Enable **Cloud Firestore** in production mode
4. Enable **Firebase Storage**
5. Create Firestore indexes:
   - `tracks` collection: `userId` ASC, `createdAt` DESC
   - `tracks` collection: `isPublic` ASC, `createdAt` DESC
6. Set Firestore security rules to allow authenticated read/write on `users`, `tracks`, `usernames`, and `followers` collections

### 5. Run locally

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) — if `MASTER_PASS_NET` is set, you'll see the access gate first.

### 6. Build for production

```bash
npm run build
npm start
```

## 📁 Architecture

```
src/
├── app/
│   ├── (app)/              # Authenticated app routes
│   │   ├── layout.tsx      # Sidebar + mobile nav + main content area
│   │   ├── page.tsx        # Home feed
│   │   ├── studio/         # AI music generation studio
│   │   ├── library/        # User's track library
│   │   └── [username]/     # Public artist profiles
│   ├── api/
│   │   ├── auth/gate/      # Access gate password validation
│   │   ├── lyrics/         # Gemini lyrics generation
│   │   ├── cover/          # Gemini cover art generation
│   │   ├── music/          # MiniMax (Lyria) music generation
│   │   ├── suno/           # Suno (Maestro) music generation
│   │   ├── avatar/         # AI avatar generation
│   │   └── username/       # Username availability check
│   ├── login/              # Login page
│   ├── onboarding/         # New user setup (username, avatar)
│   └── layout.tsx          # Root layout with AccessGate wrapper
├── components/
│   ├── access-gate.tsx     # Master password gate component
│   ├── global-player.tsx   # Audio provider + player bar UI
│   └── ui/                 # Reusable UI primitives (shadcn)
├── lib/
│   ├── auth-context.tsx    # Firebase auth + user profile context
│   ├── firebase.ts         # Firebase client config
│   ├── firebase-admin.ts   # Firebase Admin SDK config
│   └── social.ts           # Follow, like, and play count functions
└── stores/
    └── player-store.ts     # Zustand store for global player state
```

## 🎵 How Generation Works

```
User describes a song
        │
        ▼
┌─── Gemini AI ───┐
│  Generates title │
│  and full lyrics │
└────────┬────────┘
         │
    ┌────┴────┐
    ▼         ▼
┌────────┐ ┌──────────────┐
│ Gemini │ │ Lyria/Maestro │
│ Cover  │ │ Music Engine  │
│ Art    │ │               │
└───┬────┘ └──────┬───────┘
    │              │
    └──────┬───────┘
           ▼
   Saved to Firebase
   (Storage + Firestore)
           │
           ▼
   Plays in Global Player
```

1. **Lyrics** — Gemini writes original lyrics based on genre, mood, and theme
2. **Cover Art + Music** — Generated in parallel:
   - Cover art via Gemini image generation
   - Music via Lyria (MiniMax, ~2 min) or Maestro (Suno V5, ~3 min)
3. **Storage** — Audio and cover art uploaded to Firebase Storage, metadata saved to Firestore
4. **Playback** — Track automatically loads into the global player bar

## 🌐 Deployment

Deploy to [Vercel](https://vercel.com) (recommended):

```bash
npm i -g vercel
vercel
```

Set all environment variables in the Vercel dashboard under Settings → Environment Variables.

## 🤝 Contributing

1. Fork the repo
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is open source under the [MIT License](LICENSE).

---

<div align="center">
  <sub>Built with ♪ by <a href="https://github.com/hsnrique">Henrique</a></sub>
</div>
