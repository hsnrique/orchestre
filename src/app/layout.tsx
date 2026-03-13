import type { Metadata } from "next";
import { Inter, Space_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth-context";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
});

const spaceMono = Space_Mono({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-mono",
});

export const metadata: Metadata = {
  title: "Orchestre — AI Music Studio",
  description: "Create incredible music with AI. Powered by Lyria, Gemini, and your imagination.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.variable} ${spaceMono.variable} antialiased`}>
        <AuthProvider>
          <div className="scanlines" />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
