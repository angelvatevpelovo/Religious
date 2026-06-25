"use client";

import { FormEvent, useState } from "react";
import {
  BackLink,
  EmptyState,
  GlassCard,
  GoldButton,
} from "../../components/DesignSystem";

type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

function newMessage(role: ChatMessage["role"], content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

export default function AssistantClient() {
  const [message, setMessage] = useState("");
  const [history, setHistory] = useState<ChatMessage[]>([
    newMessage(
      "assistant",
      "Welcome. I can help with prayers, holy books, spiritual routines, religious calendars and sacred places. I will answer respectfully across traditions and I am not a replacement for a trusted religious leader or qualified professional."
    ),
  ]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function sendMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const cleanMessage = message.trim();
    if (!cleanMessage || loading) return;

    const userMessage = newMessage("user", cleanMessage);
    setHistory((current) => [...current, userMessage]);
    setMessage("");
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: cleanMessage,
          history: history.slice(-8),
        }),
      });

      const result = (await response.json()) as {
        answer?: string;
        error?: string;
      };

      if (!response.ok || !result.answer) {
        throw new Error(result.error || "The assistant could not answer.");
      }

      setHistory((current) => [
        ...current,
        newMessage("assistant", result.answer ?? ""),
      ]);
    } catch (caughtError) {
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "The assistant is temporarily unavailable.";

      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="mt-10">
      <BackLink>Back Home</BackLink>

      <div className="mt-8 grid gap-6 lg:grid-cols-[0.72fr_0.28fr]">
        <GlassCard className="flex min-h-[620px] flex-col p-4 sm:p-6">
          <div className="flex-1 space-y-4 overflow-hidden">
            {history.length === 0 ? (
              <EmptyState title="Ask your first question" />
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className={`flex ${
                    item.role === "user" ? "justify-end" : "justify-start"
                  }`}
                >
                  <div
                    className={`max-w-[92%] rounded-[1.5rem] px-5 py-4 text-sm leading-7 sm:max-w-[78%] ${
                      item.role === "user"
                        ? "bg-[#D4AF37] text-[#071A2F]"
                        : "border border-white/12 bg-white/[0.06] text-[#F8FAFC]"
                    }`}
                  >
                    <p className="whitespace-pre-line">{item.content}</p>
                  </div>
                </div>
              ))
            )}

            {loading && (
              <div className="rounded-[1.5rem] border border-white/12 bg-white/[0.06] px-5 py-4 text-sm text-[#CBD5E1]">
                Thinking...
              </div>
            )}
          </div>

          {error && (
            <p className="mt-4 rounded-2xl border border-red-300/30 bg-red-500/10 p-4 text-sm text-red-100">
              {error}
            </p>
          )}

          <form onSubmit={sendMessage} className="mt-5 grid gap-3">
            <label htmlFor="assistant-message" className="sr-only">
              Ask the AI Religious Assistant
            </label>
            <textarea
              id="assistant-message"
              value={message}
              onChange={(event) => setMessage(event.target.value)}
              placeholder="Ask about prayer, scripture, holy days, sacred places or spiritual routines..."
              className="min-h-32 w-full resize-none rounded-[1.5rem] border border-[#D4AF37]/40 bg-[#071A2F]/70 px-5 py-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/60 focus:border-[#D4AF37]"
            />
            <button
              type="submit"
              disabled={loading || !message.trim()}
              className="inline-flex items-center justify-center rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] shadow-lg shadow-[#D4AF37]/15 transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-50"
            >
              {loading ? "Sending..." : "Send"}
            </button>
          </form>
        </GlassCard>

        <GlassCard className="p-6">
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#F5D76E]">
            Gentle Guidance
          </p>
          <div className="mt-5 space-y-4 text-sm leading-7 text-[#CBD5E1]">
            <p>Ask about prayers, scripture themes, holy days or sacred places.</p>
            <p>
              For personal crisis, medical, legal or mental health concerns,
              please speak with a qualified professional or trusted community
              leader.
            </p>
          </div>

          <div className="mt-6">
            <GoldButton href="/calendar" className="w-full">
              Open Calendar
            </GoldButton>
          </div>
        </GlassCard>
      </div>
    </section>
  );
}
