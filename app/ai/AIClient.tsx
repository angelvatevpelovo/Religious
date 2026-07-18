"use client";

import type { FormEvent, ReactNode } from "react";
import { useMemo, useState } from "react";
import Link from "next/link";
import { BackLink } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import type { AIChatMessage, AIChatRole } from "../../lib/ai/types";

type ChatMessage = AIChatMessage & {
  id: string;
};

const disclaimer =
  "This guide is for reflection and education. It is not a replacement for religious leaders, professional counseling, medical advice, or emergency help.";

const suggestedQuestions = [
  "Explain this passage simply",
  "Compare two traditions respectfully",
  "Help me reflect on forgiveness",
  "Suggest a prayer theme",
];

function createMessage(role: AIChatRole, content: string): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
  };
}

function renderInlineMarkdown(text: string) {
  const parts = text.split(/(\*\*[^*]+\*\*|`[^`]+`)/g);

  return parts.map((part, index) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return (
        <strong key={`${part}-${index}`} className="font-bold text-[#F8FAFC]">
          {part.slice(2, -2)}
        </strong>
      );
    }

    if (part.startsWith("`") && part.endsWith("`")) {
      return (
        <code
          key={`${part}-${index}`}
          className="rounded-md border border-white/12 bg-[#071A2F]/70 px-1.5 py-0.5 text-[#F5D76E]"
        >
          {part.slice(1, -1)}
        </code>
      );
    }

    return <span key={`${part}-${index}`}>{part}</span>;
  });
}

function MarkdownContent({ content }: { content: string }) {
  const nodes: ReactNode[] = [];

  content.split("\n").forEach((line, index) => {
    const trimmed = line.trim();

    if (!trimmed) {
      nodes.push(<div key={`space-${index}`} className="h-3" />);
      return;
    }

    if (trimmed.startsWith("### ")) {
      nodes.push(
        <h3 key={`heading-${index}`} className="mt-4 text-lg font-bold text-[#F5D76E] first:mt-0">
          {renderInlineMarkdown(trimmed.slice(4))}
        </h3>
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmed)) {
      nodes.push(
        <li key={`list-${index}`} className="ml-5 list-disc leading-7">
          {renderInlineMarkdown(trimmed.replace(/^[-*]\s+/, ""))}
        </li>
      );
      return;
    }

    nodes.push(
      <p key={`paragraph-${index}`} className="leading-7">
        {renderInlineMarkdown(trimmed)}
      </p>
    );
  });

  return <div className="space-y-1">{nodes}</div>;
}

async function readTextResponse(response: Response) {
  const contentType = response.headers.get("content-type") || "";

  if (contentType.includes("application/json")) {
    const data = (await response.json()) as { answer?: string; error?: string };

    if (!response.ok) {
      throw new Error(data.error || "The assistant could not answer right now.");
    }

    return data.answer || "";
  }

  const text = await response.text();

  if (!response.ok) {
    throw new Error(text || "The assistant could not answer right now.");
  }

  return text;
}

export default function AIClient() {
  const [question, setQuestion] = useState("");
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const history = useMemo(
    () =>
      messages.slice(-8).map((message) => ({
        role: message.role,
        content: message.content,
      })),
    [messages]
  );

  async function askAssistant(questionText?: string) {
    const cleanQuestion = (questionText ?? question).trim();

    if (!cleanQuestion || loading) return;

    setLoading(true);
    setError("");
    setAnswer("");
    setQuestion("");

    const userMessage = createMessage("user", cleanQuestion);
    setMessages((current) => [...current, userMessage]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify({
          message: cleanQuestion,
          history: [...history, { role: "user", content: cleanQuestion }],
        }),
      });
      const assistantAnswer = await readTextResponse(response);
      const cleanAnswer = assistantAnswer.trim();

      if (!cleanAnswer) {
        throw new Error("The assistant returned an empty answer.");
      }

      setAnswer(cleanAnswer);
      setMessages((current) => [...current, createMessage("assistant", cleanAnswer)]);
    } catch (caughtError) {
      const message =
        caughtError instanceof Error
          ? caughtError.message
          : "The assistant is temporarily unavailable.";

      setError(message);
    } finally {
      setLoading(false);
    }
  }

  function submitQuestion(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void askAssistant();
  }

  return (
    <section className="mt-8">
      <BackLink>Back Home</BackLink>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/24 backdrop-blur-2xl sm:p-6">
          <form onSubmit={submitQuestion}>
            <label htmlFor="ai-question" className="text-sm font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
              Your question
            </label>
            <textarea
              id="ai-question"
              value={question}
              onChange={(event) => setQuestion(event.target.value)}
              placeholder="Ask about a sacred text, tradition, prayer practice, or reflective question..."
              rows={7}
              className="mt-3 w-full resize-none rounded-[1.5rem] border border-white/12 bg-[#030817]/72 px-5 py-4 text-base leading-7 text-[#F8FAFC] outline-none transition placeholder:text-[#7890AA] focus:border-[#D4AF37]/70"
            />

            <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="max-w-2xl text-sm leading-6 text-[#AFC0D4]">
                {disclaimer}
              </p>
              <button
                type="submit"
                disabled={loading || !question.trim()}
                className="min-h-12 rounded-2xl bg-[#D4AF37] px-6 py-3 text-sm font-black text-[#071A2F] transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading ? "Thinking..." : "Ask"}
              </button>
            </div>
          </form>

          <div className="mt-6 rounded-[1.5rem] border border-white/12 bg-[#030817]/58 p-5 shadow-xl shadow-black/20" aria-live="polite">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <h2 className="text-2xl font-black text-[#F8FAFC]">Answer</h2>
              <span className="rounded-full border border-[#D4AF37]/30 bg-[#D4AF37]/10 px-3 py-1 text-xs font-bold uppercase tracking-[0.14em] text-[#F5D76E]">
                Reflective
              </span>
            </div>

            {loading && <p className="mt-4 text-[#CBD5E1]">Preparing a thoughtful answer...</p>}

            {!loading && error && (
              <p className="mt-4 rounded-xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
                {error}
              </p>
            )}

            {!loading && !error && answer && (
              <div className="mt-4 text-[#F8FAFC]">
                <MarkdownContent content={answer} />
              </div>
            )}

            {!loading && !error && !answer && (
              <p className="mt-4 text-[#CBD5E1]">
                Ask a question to begin your reflection.
              </p>
            )}
          </div>
        </div>

        <aside className="space-y-5">
          <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <h2 className="text-xl font-black text-[#F8FAFC]">Try asking</h2>
            <div className="mt-4 grid gap-3">
              {suggestedQuestions.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => askAssistant(prompt)}
                  disabled={loading}
                  className="rounded-2xl border border-white/12 bg-[#030817]/50 px-4 py-3 text-left text-sm leading-6 text-[#CBD5E1] transition hover:border-[#D4AF37]/60 hover:bg-white/[0.07] hover:text-[#F8FAFC] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </div>

          <div className="rounded-[2rem] border border-white/12 bg-white/[0.045] p-5 shadow-2xl shadow-black/20 backdrop-blur-2xl">
            <h2 className="text-xl font-black text-[#F8FAFC]">Private history</h2>
            <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
              This version works without login. If you are logged in, your questions and answers are saved to your private history.
            </p>
            <Link
              href="/ai-history"
              className="mt-4 inline-flex rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/20"
            >
              View AI history
            </Link>
          </div>
        </aside>
      </div>
    </section>
  );
}
