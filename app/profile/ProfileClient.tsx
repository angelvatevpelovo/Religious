"use client";

import Link from "next/link";
import { FormEvent, useEffect, useState } from "react";
import {
  BackLink,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

type Profile = {
  id: string;
  display_name: string | null;
  favorite_religion: string | null;
  bio: string | null;
  created_at: string | null;
  updated_at: string | null;
};

const religionOptions = [
  "",
  "Christianity",
  "Islam",
  "Judaism",
  "Buddhism",
  "Hinduism",
  "Sikhism",
  "Bahai Faith",
  "Shinto",
  "Zoroastrianism",
  "Cao Dai",
  "Other",
];

export default function ProfileClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [favoriteReligion, setFavoriteReligion] = useState("");
  const [bio, setBio] = useState("");

  function applyProfile(profile: Profile) {
    setDisplayName(profile.display_name ?? "");
    setFavoriteReligion(profile.favorite_religion ?? "");
    setBio(profile.bio ?? "");
  }

  useEffect(() => {
    let isActive = true;

    async function loadProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      if (!user) {
        setUserId(null);
        setEmail("");
        setLoading(false);
        return;
      }

      setUserId(user.id);
      setEmail(user.email ?? "");

      const { data: existingProfile, error: profileError } = await supabase
        .from("profiles")
        .select("id, display_name, favorite_religion, bio, created_at, updated_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!isActive) return;

      if (profileError) {
        setError(profileError.message);
        setLoading(false);
        return;
      }

      if (existingProfile) {
        applyProfile(existingProfile as Profile);
        setLoading(false);
        return;
      }

      const { data: createdProfile, error: createError } = await supabase
        .from("profiles")
        .insert({
          id: user.id,
          display_name: user.email?.split("@")[0] ?? null,
        })
        .select("id, display_name, favorite_religion, bio, created_at, updated_at")
        .single();

      if (!isActive) return;

      if (createError) {
        setError(createError.message);
      } else if (createdProfile) {
        applyProfile(createdProfile as Profile);
      }

      setLoading(false);
    }

    void loadProfile();

    return () => {
      isActive = false;
    };
  }, []);

  async function saveProfile(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

    setSaving(true);
    setError("");
    setMessage("");

    const { data, error: saveError } = await supabase
      .from("profiles")
      .upsert(
        {
          id: userId,
          display_name: displayName.trim() || null,
          favorite_religion: favoriteReligion || null,
          bio: bio.trim() || null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      )
      .select("id, display_name, favorite_religion, bio, created_at, updated_at")
      .single();

    if (saveError) {
      setError(saveError.message);
    } else if (data) {
      applyProfile(data as Profile);
      setMessage("Profile saved.");
    }

    setSaving(false);
  }

  return (
    <PageShell className="user-page-shell">
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="user-glass-panel mt-10"
        eyebrow="Personal Space"
        title="Your Profile"
        description="Manage your RELIGIOUS identity, saved preferences and the personal spaces connected to your account."
      />

      {loading ? (
        <GlassCard className="user-glass-panel mt-8 p-6 text-[#CBD5E1]">
          Loading profile...
        </GlassCard>
      ) : !userId ? (
        <GlassCard className="user-glass-panel mt-8 p-8">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            Login required
          </h2>
          <p className="mt-3 max-w-2xl text-[#CBD5E1]">
            Please login or create an account to view and edit your profile.
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Go to Login
          </Link>
        </GlassCard>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.82fr_1.18fr]">
          <GlassCard className="user-glass-panel p-6">
            <div className="flex items-center gap-4">
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-3xl border border-[#D4AF37]/45 bg-[#D4AF37]/10 text-2xl font-bold text-[#F5D76E] shadow-lg shadow-[#D4AF37]/10">
                {(displayName || email || "U").charAt(0).toUpperCase()}
              </div>
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">
                  {displayName || "RELIGIOUS User"}
                </h2>
                <p className="mt-1 text-sm text-[#CBD5E1]">{email}</p>
              </div>
            </div>

            <div className="mt-6 grid gap-3 text-sm text-[#CBD5E1]">
              <p>
                <span className="font-bold text-[#F5D76E]">
                  Favorite religion:
                </span>{" "}
                {favoriteReligion || "Not set"}
              </p>
              <p>
                <span className="font-bold text-[#F5D76E]">Bio:</span>{" "}
                {bio || "No bio yet."}
              </p>
            </div>

            <div className="user-gold-divider mt-6" />

            <div className="mt-6 grid gap-3 sm:grid-cols-3 lg:grid-cols-1">
              {[
                { href: "/favorites", label: "Favorites" },
                { href: "/ai-history", label: "AI History" },
                { href: "/book", label: "Sacred Texts" },
              ].map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  className="rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm font-bold text-[#F5D76E] transition hover:border-[#D4AF37]/55 hover:bg-[#D4AF37]/10"
                >
                  {link.label}
                </Link>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="user-glass-panel p-6">
            <h2 className="text-2xl font-bold text-[#F8FAFC]">
              Edit Preferences
            </h2>

            <form onSubmit={saveProfile} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Display name
                <input
                  value={displayName}
                  onChange={(event) => setDisplayName(event.target.value)}
                  placeholder="Your name"
                  className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Favorite religion
                <select
                  value={favoriteReligion}
                  onChange={(event) => setFavoriteReligion(event.target.value)}
                  className="rounded-2xl border border-white/12 bg-[#0F2744] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]"
                >
                  {religionOptions.map((religion) => (
                    <option key={religion || "empty"} value={religion}>
                      {religion || "Select a preference"}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Bio
                <textarea
                  value={bio}
                  onChange={(event) => setBio(event.target.value)}
                  placeholder="A short note about your spiritual interests..."
                  rows={5}
                  className="resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Profile"}
              </button>
            </form>

            {message && (
              <p className="mt-4 rounded-2xl border border-emerald-300/20 bg-emerald-400/10 p-4 text-sm text-emerald-100">
                {message}
              </p>
            )}

            {error && (
              <p className="mt-4 rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </p>
            )}
          </GlassCard>
        </div>
      )}
    </PageShell>
  );
}
