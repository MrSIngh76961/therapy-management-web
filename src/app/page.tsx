"use client";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { portalHome, useAuth } from "@/components/auth/auth-provider";

export default function Home() {
  const { user, ready } = useAuth();
  const router = useRouter();
  useEffect(() => { if (ready) router.replace(user ? portalHome[user.role] : "/login"); }, [ready, user, router]);
  return <div className="grid min-h-screen place-items-center"><div className="skeleton h-10 w-40" /></div>;
}
