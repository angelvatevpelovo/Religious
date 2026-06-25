"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BackLink,
  GlassCard,
  PageShell,
  SectionHeader,
} from "../../components/DesignSystem";
import { useLocale } from "../../lib/useLocale";
import { supabase } from "../../lib/supabase";

export default function AuthPage() {
  const router = useRouter();
  const { dictionary } = useLocale();
  const t = dictionary.auth;
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  async function signUp() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(t.registrationSuccess);
    }

    setLoading(false);
  }

  async function signIn() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setMessage(error.message);
    } else {
      setMessage(t.loginSuccess);
      router.push("/");
      router.refresh();
    }

    setLoading(false);
  }

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <section className="mx-auto mt-10 grid max-w-5xl gap-8 lg:grid-cols-[1fr_0.86fr] lg:items-center">
        <SectionHeader
          eyebrow={t.accountEyebrow}
          title={t.accountTitle}
          description={t.accountDescription}
        />

        <GlassCard className="p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-[#F8FAFC]">
            {t.welcomeBack}
          </h2>
          <p className="mt-3 text-[#CBD5E1]">
            {t.continueMessage}
          </p>

          <div className="mt-8 grid gap-4">
            <input
              type="email"
              placeholder={t.email}
              className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
            />

            <input
              type="password"
              placeholder={t.password}
              className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
            />

            <button
              onClick={signIn}
              disabled={loading}
              className="rounded-2xl bg-[#D4AF37] p-4 font-bold text-[#071A2F] transition hover:bg-[#F5D76E] disabled:opacity-60"
            >
              {loading ? t.loading : t.login}
            </button>

            <button
              onClick={signUp}
              disabled={loading}
              className="rounded-2xl border border-[#D4AF37]/50 bg-[#D4AF37]/10 p-4 font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/15 disabled:opacity-60"
            >
              {t.register}
            </button>

            {message && (
              <p className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-sm text-[#CBD5E1]">
                {message}
              </p>
            )}
          </div>
        </GlassCard>
      </section>
    </PageShell>
  );
}
