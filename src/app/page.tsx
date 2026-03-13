"use client";

import { useAuth } from "@/lib/auth-context";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomePage() {
  const { user, loading } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (!loading) {
      router.push(user ? "/studio" : "/login");
    }
  }, [user, loading, router]);

  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-6 h-6 border-2 border-[#ff2d8b] border-t-transparent rounded-full animate-spin" />
    </div>
  );
}
