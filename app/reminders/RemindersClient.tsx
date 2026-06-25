"use client";

import Link from "next/link";
import { FormEvent, useEffect, useMemo, useState } from "react";
import {
  BackLink,
  EmptyState,
  GlassCard,
  HeroPanel,
  PageShell,
} from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

type ReminderType = "prayer" | "event" | "custom";

type Reminder = {
  id: string;
  user_id: string;
  title: string;
  description: string | null;
  reminder_type: ReminderType;
  reminder_time: string;
  is_completed: boolean | null;
  created_at: string | null;
};

const reminderTypes: { value: ReminderType; label: string }[] = [
  { value: "prayer", label: "Prayer" },
  { value: "event", label: "Event" },
  { value: "custom", label: "Custom" },
];

function formatReminderTime(value: string) {
  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function getDefaultDateTime() {
  const date = new Date();
  date.setMinutes(date.getMinutes() - date.getTimezoneOffset() + 60);
  return date.toISOString().slice(0, 16);
}

export default function RemindersClient() {
  const [userId, setUserId] = useState<string | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [reminderType, setReminderType] = useState<ReminderType>("prayer");
  const [reminderTime, setReminderTime] = useState(getDefaultDateTime);

  async function loadReminders(currentUserId: string) {
    setLoading(true);
    setError("");

    const { data, error: remindersError } = await supabase
      .from("reminders")
      .select(
        "id, user_id, title, description, reminder_type, reminder_time, is_completed, created_at"
      )
      .eq("user_id", currentUserId)
      .order("reminder_time", { ascending: true });

    if (remindersError) {
      setReminders([]);
      setError(remindersError.message);
    } else {
      setReminders((data ?? []) as unknown as Reminder[]);
    }

    setLoading(false);
  }

  useEffect(() => {
    let isActive = true;

    async function loadUserAndReminders() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      setUserId(user?.id ?? null);
      setAuthChecked(true);

      if (user?.id) {
        await loadReminders(user.id);
      } else {
        setLoading(false);
      }
    }

    void loadUserAndReminders();

    return () => {
      isActive = false;
    };
  }, []);

  const upcomingCount = useMemo(
    () => reminders.filter((reminder) => !reminder.is_completed).length,
    [reminders]
  );

  async function createReminder(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!userId) return;

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
      user_id: userId,
      title: cleanTitle,
      description: description.trim() || null,
      reminder_type: reminderType,
      reminder_time: new Date(reminderTime).toISOString(),
      is_completed: false,
    });

    if (insertError) {
      setError(insertError.message);
    } else {
      setTitle("");
      setDescription("");
      setReminderType("prayer");
      setReminderTime(getDefaultDateTime());
      setMessage("Reminder created.");
      await loadReminders(userId);
    }

    setSaving(false);
  }

  async function toggleCompleted(reminder: Reminder) {
    if (!userId) return;

    setError("");
    setMessage("");

    const { error: updateError } = await supabase
      .from("reminders")
      .update({ is_completed: !reminder.is_completed })
      .eq("id", reminder.id)
      .eq("user_id", userId);

    if (updateError) {
      setError(updateError.message);
    } else {
      await loadReminders(userId);
    }
  }

  async function deleteReminder(id: string) {
    if (!userId) return;

    setError("");
    setMessage("");

    const { error: deleteError } = await supabase
      .from("reminders")
      .delete()
      .eq("id", id)
      .eq("user_id", userId);

    if (deleteError) {
      setError(deleteError.message);
    } else {
      setMessage("Reminder deleted.");
      await loadReminders(userId);
    }
  }

  return (
    <PageShell>
      <BackLink>Back Home</BackLink>

      <HeroPanel
        className="mt-10"
        eyebrow="Smart Reminders"
        title="Prayer and Event Reminders"
        description="Create gentle reminders for prayers, religious events or personal spiritual routines."
      />

      {!authChecked || loading ? (
        <GlassCard className="mt-8 p-6 text-[#CBD5E1]">
          Loading reminders...
        </GlassCard>
      ) : !userId ? (
        <GlassCard className="mt-8 p-8">
          <h2 className="text-2xl font-bold text-[#F8FAFC]">
            Login required
          </h2>
          <p className="mt-3 max-w-2xl text-[#CBD5E1]">
            Please login or create an account to manage your reminders.
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
            <div className="flex items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-[#F8FAFC]">
                  New Reminder
                </h2>
                <p className="mt-2 text-sm text-[#CBD5E1]">
                  {upcomingCount} active reminders
                </p>
              </div>
              <span className="rounded-full border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F5D76E]">
                Smart
              </span>
            </div>

            <form onSubmit={createReminder} className="mt-6 grid gap-4">
              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Title
                <input
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  placeholder="Morning prayer, Vesak, Family reflection..."
                  className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/55 focus:border-[#D4AF37]"
                />
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Type
                <select
                  value={reminderType}
                  onChange={(event) =>
                    setReminderType(event.target.value as ReminderType)
                  }
                  className="rounded-2xl border border-white/12 bg-[#0F2744] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]"
                >
                  {reminderTypes.map((type) => (
                    <option key={type.value} value={type.value}>
                      {type.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="grid gap-2 text-sm font-semibold text-[#F5D76E]">
                Date and time
                <input
                  type="datetime-local"
                  value={reminderTime}
                  onChange={(event) => setReminderTime(event.target.value)}
                  className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-base text-[#F8FAFC] outline-none transition focus:border-[#D4AF37]"
                />
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
                {saving ? "Saving..." : "Create Reminder"}
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

          <section className="grid gap-4">
            {reminders.length === 0 ? (
              <EmptyState
                title="No reminders yet"
                description="Create your first prayer, event or custom reminder."
              />
            ) : (
              reminders.map((reminder) => (
                <article
                  key={reminder.id}
                  className={`rounded-[2rem] border p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition ${
                    reminder.is_completed
                      ? "border-white/10 bg-white/[0.035] opacity-75"
                      : "border-white/12 bg-white/[0.06]"
                  }`}
                >
                  <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                    <div>
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="rounded-full border border-[#D4AF37]/35 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-[#F5D76E]">
                          {reminder.reminder_type}
                        </span>
                        {reminder.is_completed && (
                          <span className="rounded-full border border-emerald-300/25 bg-emerald-400/10 px-3 py-1 text-xs font-bold uppercase tracking-wide text-emerald-100">
                            Completed
                          </span>
                        )}
                      </div>

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

                    <div className="flex shrink-0 flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => toggleCompleted(reminder)}
                        className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:border-[#D4AF37]/60 hover:bg-white/10"
                      >
                        {reminder.is_completed ? "Reopen" : "Complete"}
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteReminder(reminder.id)}
                        className="rounded-2xl border border-red-300/30 bg-red-500/10 px-4 py-2 text-sm font-bold text-red-100 transition hover:bg-red-500/20"
                      >
                        Delete
                      </button>
                    </div>
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
