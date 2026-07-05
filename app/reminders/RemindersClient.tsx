"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import {
  BackLink,
  EmptyState,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

type Frequency = "once" | "daily" | "weekly" | "monthly";

type Reminder = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_time: string;
  frequency: Frequency;
  created_at: string | null;
};

const frequencyOptions: { value: Frequency; label: string }[] = [
  { value: "once", label: "Once" },
  { value: "daily", label: "Daily" },
  { value: "weekly", label: "Weekly" },
  { value: "monthly", label: "Monthly" },
];

function getDefaultDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + 60);

  return date.toISOString().slice(0, 16);
}

function formatReminderTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function frequencyLabel(value: Frequency) {
  return frequencyOptions.find((option) => option.value === value)?.label ?? value;
}

export default function RemindersClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderTime, setReminderTime] = useState(getDefaultDateTime);
  const [frequency, setFrequency] = useState<Frequency>("once");

  const nextReminder = useMemo(
    () =>
      reminders
        .filter((reminder) => new Date(reminder.reminder_time).getTime() >= Date.now())
        .sort(
          (first, second) =>
            new Date(first.reminder_time).getTime() -
            new Date(second.reminder_time).getTime()
        )[0] ?? null,
    [reminders]
  );

  async function loadReminders(currentUserId: string) {
    setLoading(true);
    setError("");

    const { data, error: remindersError } = await supabase
      .from("reminders")
      .select("id, user_id, title, description, reminder_time, frequency, created_at")
      .eq("user_id", currentUserId)
      .order("reminder_time", { ascending: true });

    if (remindersError) {
      setReminders([]);
      setError(
        `${remindersError.message}. If the reminders table is not migrated yet, run scripts/create-reminders.sql in Supabase.`
      );
    } else {
      setReminders((data ?? []) as Reminder[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadUserAndReminders() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      setUser(currentUser);
      setAuthChecked(true);

      if (currentUser) {
        await loadReminders(currentUser.id);
      } else {
        setLoading(false);
      }
    }

    void loadUserAndReminders();

    return () => {
      isActive = false;
    };
  }, []);

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const {
      data: { user: authenticatedUser },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !authenticatedUser) {
      setUser(null);
      setError("Please login again before creating a reminder.");
      return;
    }

    setUser(authenticatedUser);

    const cleanTitle = title.trim();

    if (!cleanTitle) {
      setError("Please enter a reminder title.");
      return;
    }

    if (!reminderTime) {
      setError("Please choose a reminder date and time.");
      return;
    }

    setSaving(true);
    setError("");
    setMessage("");

    const { error: insertError } = await supabase.from("reminders").insert({
      user_id: authenticatedUser.id,
      title: cleanTitle,
      description: description.trim() || null,
      reminder_time: new Date(reminderTime).toISOString(),
      frequency,
    });

    if (insertError) {
      setError(
        `${insertError.message}. If the reminders table is not migrated yet, run scripts/create-reminders.sql in Supabase.`
      );
    } else {
      setTitle("");
      setDescription("");
      setReminderTime(getDefaultDateTime());
      setFrequency("once");
      setMessage("Reminder created.");
      await loadReminders(authenticatedUser.id);
    }

    setSaving(false);
  }

  async function deleteReminder(id: string) {
    if (!user) return;

    setDeletingId(id);
    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Reminder deleted.");
      await loadReminders(user.id);
    }

    setDeletingId(null);
  }

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Personal Reminders"
        title="Reminders"
        description="Create simple private reminders for prayer, reflection, study or sacred events. Notifications and email delivery will come later."
      />

      {!authChecked || loading ? (
        <GlassCard className="mt-8 p-6 text-[#CBD5E1]">
          Loading reminders...
        </GlassCard>
      ) : !user ? (
        <GlassCard className="mt-8 p-8">
          <h2 className="text-2xl font-bold text-[#D4AF37]">
            Login to manage reminders
          </h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#CBD5E1]">
            Reminders are personal, so you need to login before creating or
            viewing them.
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Go to Login
          </Link>
        </GlassCard>
      ) : (
        <div className="mt-8 grid gap-8 lg:grid-cols-[0.9fr_1.1fr]">
          <GlassCard className="p-6">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">
                  New reminder
                </h2>
                <p className="mt-2 text-sm leading-6 text-[#CBD5E1]">
                  {reminders.length} saved reminders
                  {nextReminder
                    ? `, next on ${formatReminderTime(nextReminder.reminder_time)}`
                    : ""}
                </p>
              </div>
              <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F5D76E]">
                MVP
              </span>
            </div>

            <form onSubmit={createReminder} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Morning prayer, scripture reading, quiet reflection..."
                  className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Date and time
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                  className="min-h-12 rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Frequency
                <select
                  value={frequency}
                  onChange={(event) => setFrequency(event.target.value as Frequency)}
                  className="min-h-12 rounded-2xl border border-white/12 bg-[#0F2744] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]"
                >
                  {frequencyOptions.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Description
                <textarea
                  value={description}
                  onChange={(event) => setDescription(event.target.value)}
                  placeholder="Optional note for this reminder..."
                  rows={4}
                  className="resize-none rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
                />
              </label>

              <button
                type="submit"
                disabled={saving}
                className="rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-60"
              >
                {saving ? "Saving..." : "Create reminder"}
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

          <section className="grid gap-4 content-start">
            {reminders.length === 0 ? (
              <EmptyState
                title="No reminders yet"
                description="Create your first personal prayer, reflection or study reminder."
              />
            ) : (
              reminders.map((reminder) => (
                <article
                  key={reminder.id}
                  className="rounded-[2rem] border border-white/12 bg-white/[0.06] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl"
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F5D76E]">
                        {frequencyLabel(reminder.frequency)}
                      </span>

                      <h2 className="mt-4 text-2xl font-bold text-[#F8FAFC]">
                        {reminder.title}
                      </h2>
                      <p className="mt-2 font-semibold text-[#F5D76E]">
                        {formatReminderTime(reminder.reminder_time)}
                      </p>
                      {reminder.description && (
                        <p className="mt-4 leading-7 text-[#CBD5E1]">
                          {reminder.description}
                        </p>
                      )}
                    </div>

                    <button
                      type="button"
                      onClick={() => deleteReminder(reminder.id)}
                      disabled={deletingId === reminder.id}
                      className="shrink-0 rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/20 disabled:cursor-not-allowed disabled:opacity-60"
                    >
                      {deletingId === reminder.id ? "Deleting..." : "Delete"}
                    </button>
                  </div>
                </article>
              ))
            )}
          </section>
        </div>
      )}
    </PageShell>
  );
}
