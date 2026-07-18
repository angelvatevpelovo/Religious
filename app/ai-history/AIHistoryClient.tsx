"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BackLink, GlassCard } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";

type ConversationRow = {
  id: string;
  title: string | null;
  created_at: string | null;
  updated_at: string | null;
};

type MessageRow = {
  id: string;
  conversation_id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string | null;
};

type HistoryItem = {
  id: string;
  title: string;
  question: string;
  answer: string;
  createdAt: string | null;
};

function formatDate(value: string | null) {
  if (!value) return "Saved recently";

  return new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

function buildHistoryItems(conversations: ConversationRow[], messages: MessageRow[]) {
  const messagesByConversation = new Map<string, MessageRow[]>();

  for (const message of messages) {
    const current = messagesByConversation.get(message.conversation_id) ?? [];
    current.push(message);
    messagesByConversation.set(message.conversation_id, current);
  }

  return conversations
    .map((conversation) => {
      const conversationMessages = (messagesByConversation.get(conversation.id) ?? []).sort(
        (first, second) =>
          new Date(first.created_at ?? 0).getTime() -
          new Date(second.created_at ?? 0).getTime()
      );
      const question = conversationMessages.find((message) => message.role === "user");
      const answer = conversationMessages.find(
        (message) =>
          message.role === "assistant" &&
          new Date(message.created_at ?? 0).getTime() >=
            new Date(question?.created_at ?? 0).getTime()
      );

      if (!question || !answer) return null;

      return {
        id: conversation.id,
        title: conversation.title || question.content.slice(0, 70) || "AI question",
        question: question.content,
        answer: answer.content,
        createdAt: question.created_at ?? conversation.created_at,
      };
    })
    .filter((item): item is HistoryItem => Boolean(item));
}

export default function AIHistoryClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [conversations, setConversations] = useState<ConversationRow[]>([]);
  const [messages, setMessages] = useState<MessageRow[]>([]);

  const historyItems = useMemo(
    () => buildHistoryItems(conversations, messages),
    [conversations, messages]
  );

  useEffect(() => {
    let isActive = true;

    async function loadHistory() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      setUser(currentUser);
      setAuthChecked(true);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const { data: conversationRows, error: conversationsError } = await supabase
        .from("ai_conversations")
        .select("id, title, created_at, updated_at")
        .order("updated_at", { ascending: false })
        .limit(50);

      if (!isActive) return;

      if (conversationsError) {
        setError(conversationsError.message);
        setLoading(false);
        return;
      }

      const loadedConversations = (conversationRows ?? []) as ConversationRow[];
      setConversations(loadedConversations);

      if (loadedConversations.length === 0) {
        setMessages([]);
        setLoading(false);
        return;
      }

      const { data: messageRows, error: messagesError } = await supabase
        .from("ai_messages")
        .select("id, conversation_id, role, content, created_at")
        .in(
          "conversation_id",
          loadedConversations.map((conversation) => conversation.id)
        )
        .order("created_at", { ascending: true });

      if (!isActive) return;

      if (messagesError) {
        setError(messagesError.message);
      } else {
        setMessages((messageRows ?? []) as MessageRow[]);
      }

      setLoading(false);
    }

    void loadHistory();

    return () => {
      isActive = false;
    };
  }, []);

  if (!authChecked || loading) {
    return (
      <GlassCard className="user-glass-panel mt-8 p-6 text-[#CBD5E1]">
        Loading AI history...
      </GlassCard>
    );
  }

  if (!user) {
    return (
      <section className="mt-8">
        <BackLink href="/ai">Back to AI Assistant</BackLink>
        <GlassCard className="user-glass-panel mt-6 p-8">
          <h2 className="text-2xl font-bold text-[#D4AF37]">Login to view history</h2>
          <p className="mt-3 max-w-2xl leading-7 text-[#CBD5E1]">
            You can use the AI Assistant without logging in, but saved question history is
            available only for logged-in users.
          </p>
          <Link
            href="/auth"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Go to Login
          </Link>
        </GlassCard>
      </section>
    );
  }

  return (
    <section className="mt-8">
      <BackLink href="/ai">Back to AI Assistant</BackLink>

      {error && (
        <p className="mt-6 rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100">
          {error}
        </p>
      )}

      {!error && historyItems.length === 0 && (
        <GlassCard className="user-glass-panel mt-6 p-8 text-center">
          <div className="mx-auto h-14 w-14 rounded-full border border-[#D4AF37]/50 bg-[#D4AF37]/10 shadow-lg shadow-[#D4AF37]/10" />
          <h2 className="mt-5 text-2xl font-bold text-[#F8FAFC]">
            No AI conversations yet.
          </h2>
          <p className="mx-auto mt-3 max-w-xl leading-7 text-[#CBD5E1]">
            Ask a question while logged in, and the question and answer will appear here.
          </p>
          <Link
            href="/ai"
            className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
          >
            Ask the AI Guide
          </Link>
        </GlassCard>
      )}

      {!error && historyItems.length > 0 && (
        <div className="mt-6 grid gap-5">
          {historyItems.map((item) => (
            <article
              key={item.id}
              className="rounded-[2rem] border border-white/12 bg-white/[0.055] p-5 shadow-2xl shadow-black/20 backdrop-blur-xl transition hover:border-[#D4AF37]/40 hover:bg-white/[0.075]"
            >
              <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                <h2 className="text-xl font-bold text-[#D4AF37]">{item.title}</h2>
                <p className="text-sm text-[#CBD5E1]">{formatDate(item.createdAt)}</p>
              </div>

              <div className="mt-5 grid gap-4 lg:grid-cols-2">
                <div className="rounded-2xl border border-[#D4AF37]/25 bg-[#D4AF37]/10 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                    Question
                  </p>
                  <p className="mt-3 leading-7 text-[#F8FAFC]">{item.question}</p>
                </div>

                <div className="rounded-2xl border border-white/10 bg-[#0F2744]/75 p-4">
                  <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                    Answer
                  </p>
                  <p className="mt-3 whitespace-pre-wrap leading-7 text-[#CBD5E1]">
                    {item.answer}
                  </p>
                </div>
              </div>
            </article>
          ))}
        </div>
      )}
    </section>
  );
}
