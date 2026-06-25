"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useLocale } from "../lib/useLocale";

export default function AuthButton() {
  const router = useRouter();
  const { dictionary } = useLocale();
  const [email, setEmail] = useState<string | null>(null);

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      setEmail(data.user?.email ?? null);
    });
  }, []);

  async function logout() {
    await supabase.auth.signOut();
    router.push("/");
    router.refresh();
  }

  if (!email) {
    return (
      <Link
        href="/auth"
        className="rounded-2xl border border-[#D4AF37]/60 bg-[#D4AF37]/10 px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/20"
      >
        {dictionary.auth.loginRegister}
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <Link
        href="/favorites"
        className="text-sm font-semibold text-[#F5D76E] hover:underline"
      >
        {dictionary.auth.favorites}
      </Link>

      <span className="hidden text-sm text-[#CBD5E1] lg:inline">{email}</span>

      <button
        onClick={logout}
        className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-[#F8FAFC] transition hover:bg-white/10"
      >
        {dictionary.auth.logout}
      </button>
    </div>
  );
}
