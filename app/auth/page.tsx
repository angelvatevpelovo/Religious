"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import {
  BackLink,
  GlassCard,
  PageShell,
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
    <PageShell className="user-page-shell">
      <BackLink>Back Home</BackLink>

      <section className="mx-auto mt-12 grid max-w-6xl gap-8 lg:grid-cols-[0.92fr_0.78fr] lg:items-center">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.24em] text-[#F5D76E]">
            {t.accountEyebrow}
          </p>
          <h1 className="mt-4 max-w-3xl text-4xl font-bold tracking-normal text-[#F8FAFC] sm:text-5xl lg:text-6xl">
            Sign in to RELIGIOUS
          </h1>
          <p className="mt-5 max-w-2xl text-base leading-8 text-[#CBD5E1] sm:text-lg">
            Sign in to save favorites, manage your profile, review AI history,
            and prepare for future spiritual reminders.
          </p>
          <div className="user-gold-divider mt-8 max-w-md" />
          <p className="mt-6 max-w-xl text-sm leading-7 text-[#CBD5E1]/80">
            Public pages remain open without an account. Your personal spaces
            are available only after authentication.
          </p>
        </div>

        <GlassCard className="user-glass-panel p-6 sm:p-8">
          <h2 className="text-3xl font-bold text-[#F8FAFC]">{t.welcomeBack}</h2>
          <p className="mt-3 leading-7 text-[#CBD5E1]">{t.continueMessage}</p>

          <div className="mt-8 grid gap-4">
            <label
              htmlFor="auth-email"
              className="grid gap-2 text-sm font-semibold text-[#F5D76E]"
            >
              {t.email}
              <input
                id="auth-email"
                type="email"
                placeholder={t.email}
                autoComplete="email"
                className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37] focus:bg-white/[0.08]"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>

            <label
              htmlFor="auth-password"
              className="grid gap-2 text-sm font-semibold text-[#F5D76E]"
            >
              {t.password}
              <input
                id="auth-password"
                type="password"
                placeholder={t.password}
                autoComplete="current-password"
                className="rounded-2xl border border-white/12 bg-white/[0.06] p-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37] focus:bg-white/[0.08]"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>

            <button
              type="button"
              onClick={signIn}
              disabled={loading}
              className="rounded-2xl bg-[#D4AF37] p-4 font-bold text-[#071A2F] shadow-lg shadow-[#D4AF37]/15 transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {loading ? t.loading : t.login}
            </button>

            <button
              type="button"
              onClick={signUp}
              disabled={loading}
              className="rounded-2xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 p-4 font-bold text-[#F5D76E] transition hover:border-[#D4AF37]/70 hover:bg-[#D4AF37]/15 disabled:cursor-not-allowed disabled:opacity-60"
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
