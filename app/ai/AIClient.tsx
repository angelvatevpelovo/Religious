"use client";

import Link from "next/link";
import type { FormEvent, ReactNode } from "react";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { User } from "@supabase/supabase-js";
import { BackLink, EmptyState, GlassCard } from "../../components/DesignSystem";
import { supabase } from "../../lib/supabase";
import type { AIGuideLocation, AIChatRole } from "../../lib/ai/types";

type Conversation = {
  id: string;
  user_id: string;
  title: string;
  created_at: string;
  updated_at: string;
};

type ChatMessage = {
  id: string;
  conversation_id?: string;
  user_id?: string;
  role: AIChatRole;
  content: string;
  created_at?: string;
  pending?: boolean;
};

const suggestedPrompts = [
  "Explain today's spiritual focus using a verse and a prayer.",
  "Find sacred places near me and suggest a calm visit plan.",
  "Compare how Christianity, Islam and Judaism approach daily prayer.",
  "Help me build a respectful evening spiritual routine.",
];

function createLocalMessage(role: AIChatRole, content: string, pending = false): ChatMessage {
  return {
    id: `${role}-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    role,
    content,
    pending,
  };
}

function conversationTitle(message: string) {
  return message.trim().slice(0, 70) || "New AI Guide conversation";
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
  const lines = content.split("\n");
  const nodes: ReactNode[] = [];

  lines.forEach((line, index) => {
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

    if (trimmed.startsWith("## ")) {
      nodes.push(
        <h2 key={`heading-${index}`} className="mt-5 text-xl font-bold text-[#F8FAFC] first:mt-0">
          {renderInlineMarkdown(trimmed.slice(3))}
        </h2>
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

function TypingIndicator() {
  return (
    <div className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/[0.06] px-4 py-2 text-sm text-[#CBD5E1]">
      <span>Guide is composing</span>
      <span className="flex gap-1">
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37] [animation-delay:120ms]" />
        <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-[#D4AF37] [animation-delay:240ms]" />
      </span>
    </div>
  );
}

export default function AIClient() {
  const [user, setUser] = useState<User | null>(null);
  const [authChecked, setAuthChecked] = useState(false);
  const [conversation, setConversation] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const [streaming, setStreaming] = useState(false);
  const [error, setError] = useState("");
  const [location, setLocation] = useState<AIGuideLocation | null>(null);
  const [locationStatus, setLocationStatus] = useState("");
  const streamedContentRef = useRef("");

  const historyForRequest = useMemo(
    () =>
      messages
        .filter((message) => !message.pending && message.content.trim())
        .slice(-12)
        .map((message) => ({
          role: message.role,
          content: message.content,
        })),
    [messages]
  );

  const loadMessages = useCallback(async (conversationId: string) => {
    const { data, error: messagesError } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, user_id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .order("created_at", { ascending: true });

    if (messagesError) {
      console.error("AI messages load error:", messagesError);
      throw messagesError;
    }

    setMessages((data ?? []) as ChatMessage[]);
  }, []);

  const loadLatestConversation = useCallback(async (currentUser: User) => {
    setLoading(true);
    setError("");

    const { data, error: conversationError } = await supabase
      .from("ai_conversations")
      .select("id, user_id, title, created_at, updated_at")
      .eq("user_id", currentUser.id)
      .order("updated_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (conversationError) {
      console.error("AI conversation load error:", conversationError);
      setError(
        `${conversationError.message}. If this is your first AI Guide run, execute scripts/create-ai-guide.sql in Supabase.`
      );
      setLoading(false);
      return;
    }

    if (data) {
      const loadedConversation = data as Conversation;
      setConversation(loadedConversation);
      await loadMessages(loadedConversation.id);
    }

    setLoading(false);
  }, [loadMessages]);

  useEffect(() => {
    let isActive = true;

    async function loadUser() {
      const {
        data: { user: currentUser },
      } = await supabase.auth.getUser();

      if (!isActive) return;

      setUser(currentUser);
      setAuthChecked(true);

      if (currentUser) {
        await loadLatestConversation(currentUser);
      } else {
        setLoading(false);
      }
    }

    void loadUser();

    return () => {
      isActive = false;
    };
  }, [loadLatestConversation]);

  async function ensureConversation(currentUser: User, firstMessage: string) {
    if (conversation) return conversation;

    const { data, error: insertError } = await supabase
      .from("ai_conversations")
      .insert({
        user_id: currentUser.id,
        title: conversationTitle(firstMessage),
      })
      .select("id, user_id, title, created_at, updated_at")
      .single();

    if (insertError) {
      console.error("AI conversation save error:", insertError);
      throw insertError;
    }

    const createdConversation = data as Conversation;
    setConversation(createdConversation);

    return createdConversation;
  }

  async function saveMessage(conversationId: string, currentUser: User, message: ChatMessage) {
    const { data, error: insertError } = await supabase
      .from("ai_messages")
      .insert({
        conversation_id: conversationId,
        user_id: currentUser.id,
        role: message.role,
        content: message.content,
      })
      .select("id, conversation_id, user_id, role, content, created_at")
      .single();

    if (insertError) {
      console.error("AI message save error:", insertError);
      throw insertError;
    }

    return data as ChatMessage;
  }

  async function touchConversation(conversationId: string, currentUser: User) {
    const { error: touchError } = await supabase
      .from("ai_conversations")
      .update({ updated_at: new Date().toISOString() })
      .eq("id", conversationId)
      .eq("user_id", currentUser.id);

    if (touchError) {
      console.error("AI conversation timestamp update error:", touchError);
    }
  }

  async function streamAnswer({
    cleanMessage,
    currentUser,
    currentConversation,
    localAssistantId,
    requestHistory,
  }: {
    cleanMessage: string;
    currentUser: User;
    currentConversation: Conversation;
    localAssistantId: string;
    requestHistory: Array<{ role: AIChatRole; content: string }>;
  }) {
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
        message: cleanMessage,
        history: requestHistory,
        location,
      }),
    });

    if (!response.ok || !response.body) {
      const fallback = await response.text();
      throw new Error(fallback || "The AI Religious Guide could not answer.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    streamedContentRef.current = "";

    while (true) {
      const { done, value } = await reader.read();

      if (done) break;

      streamedContentRef.current = `${streamedContentRef.current}${decoder.decode(value, {
        stream: true,
      })}`;
      setMessages((current) =>
        current.map((message) =>
          message.id === localAssistantId
            ? { ...message, content: streamedContentRef.current, pending: false }
            : message
        )
      );
    }

    streamedContentRef.current = `${streamedContentRef.current}${decoder.decode()}`;
    const assistantContent = streamedContentRef.current;

    if (!assistantContent.trim()) {
      throw new Error("The AI Religious Guide returned an empty answer.");
    }

    const savedAssistant = await saveMessage(currentConversation.id, currentUser, {
      id: localAssistantId,
      role: "assistant",
      content: assistantContent,
    });

    setMessages((current) =>
      current.map((message) => (message.id === localAssistantId ? savedAssistant : message))
    );
    await touchConversation(currentConversation.id, currentUser);
  }

  async function sendMessage(messageText?: string) {
    const cleanMessage = (messageText ?? input).trim();

    if (!cleanMessage || streaming || !user) return;

    setError("");
    setInput("");
    setStreaming(true);

    const userMessage = createLocalMessage("user", cleanMessage);
    const assistantMessage = createLocalMessage("assistant", "", true);
    const requestHistory = [...historyForRequest, { role: "user" as const, content: cleanMessage }];

    setMessages((current) => [...current, userMessage, assistantMessage]);

    try {
      const currentConversation = await ensureConversation(user, cleanMessage);
      const savedUserMessage = await saveMessage(currentConversation.id, user, userMessage);

      setMessages((current) =>
        current.map((message) => (message.id === userMessage.id ? savedUserMessage : message))
      );

      await streamAnswer({
        cleanMessage,
        currentUser: user,
        currentConversation,
        localAssistantId: assistantMessage.id,
        requestHistory,
      });
    } catch (caughtError) {
      console.error("AI send failed:", caughtError);
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "The AI Religious Guide is temporarily unavailable.";

      setError(errorMessage);
      setMessages((current) => current.filter((message) => message.id !== assistantMessage.id));
    } finally {
      setStreaming(false);
    }
  }

  async function regenerateMessage(assistantMessage: ChatMessage) {
    if (!user || !conversation || streaming) return;

    const assistantIndex = messages.findIndex((message) => message.id === assistantMessage.id);
    const previousUserMessage = [...messages]
      .slice(0, assistantIndex)
      .reverse()
      .find((message) => message.role === "user");

    if (!previousUserMessage) return;

    setError("");
    setStreaming(true);

    const replacement = createLocalMessage("assistant", "", true);
    const requestHistory = messages
      .slice(0, assistantIndex)
      .filter((message) => !message.pending && message.content.trim())
      .slice(-12)
      .map((message) => ({ role: message.role, content: message.content }));

    setMessages((current) =>
      current.map((message) => (message.id === assistantMessage.id ? replacement : message))
    );

    if (assistantMessage.conversation_id) {
      const { error: deleteError } = await supabase
        .from("ai_messages")
        .delete()
        .eq("id", assistantMessage.id)
        .eq("user_id", user.id);

      if (deleteError) {
        console.error("AI message delete before regenerate failed:", deleteError);
      }
    }

    try {
      await streamAnswer({
        cleanMessage: previousUserMessage.content,
        currentUser: user,
        currentConversation: conversation,
        localAssistantId: replacement.id,
        requestHistory,
      });
    } catch (caughtError) {
      console.error("AI regenerate failed:", caughtError);
      const errorMessage =
        caughtError instanceof Error
          ? caughtError.message
          : "The AI Religious Guide could not regenerate this answer.";

      setError(errorMessage);
      setMessages((current) => current.filter((message) => message.id !== replacement.id));
    } finally {
      setStreaming(false);
    }
  }

  function submitMessage(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void sendMessage();
  }

  function requestLocation() {
    if (!navigator.geolocation) {
      setLocationStatus("Geolocation is not available in this browser.");
      return;
    }

    setLocationStatus("Requesting location...");
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setLocation({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
        setLocationStatus("Nearby temple context is enabled.");
      },
      () => {
        setLocationStatus("Location access was not granted.");
      },
      { enableHighAccuracy: false, maximumAge: 300000, timeout: 10000 }
    );
  }

  async function startNewConversation() {
    if (!user || streaming) return;

    setConversation(null);
    setMessages([]);
    setError("");
  }

  if (!authChecked || loading) {
    return (
      <GlassCard className="mt-8 p-6 text-[#CBD5E1]">
        Loading AI Religious Guide...
      </GlassCard>
    );
  }

  if (!user) {
    return (
      <GlassCard className="mt-8 p-8">
        <h2 className="text-2xl font-bold text-[#F8FAFC]">Login required</h2>
        <p className="mt-3 max-w-2xl text-[#CBD5E1]">
          Please login to use saved AI conversations and personalized favorites context.
        </p>
        <Link
          href="/auth"
          className="mt-6 inline-flex rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E]"
        >
          Go to Login
        </Link>
      </GlassCard>
    );
  }

  return (
    <section className="mt-8">
      <BackLink>Back Home</BackLink>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <GlassCard className="flex min-h-[68vh] flex-col overflow-hidden">
          <div className="flex flex-col gap-3 border-b border-white/12 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div>
              <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#F5D76E]">
                {conversation?.title ?? "New conversation"}
              </p>
              <p className="mt-1 text-sm text-[#CBD5E1]">
                Streaming guide with Supabase conversation history
              </p>
            </div>
            <button
              type="button"
              onClick={startNewConversation}
              disabled={streaming}
              className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-2 text-sm font-bold text-[#F5D76E] transition hover:border-[#D4AF37]/60 hover:bg-white/10 disabled:opacity-50"
            >
              New chat
            </button>
          </div>

          <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-6">
            {messages.length === 0 ? (
              <EmptyState
                title="Ask your first question"
                description="The guide can use prayers, verses, holy books, temples, nearby places and saved favorites when available."
              />
            ) : (
              messages.map((message) => (
                <article
                  key={message.id}
                  className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}
                >
                  <div
                    className={`max-w-[94%] rounded-[1.5rem] px-5 py-4 text-sm sm:max-w-[78%] ${
                      message.role === "user"
                        ? "bg-[#D4AF37] text-[#071A2F]"
                        : "border border-white/12 bg-white/[0.06] text-[#F8FAFC]"
                    }`}
                  >
                    {message.pending && !message.content ? (
                      <TypingIndicator />
                    ) : (
                      <MarkdownContent content={message.content} />
                    )}

                    {message.role === "assistant" && !message.pending && message.content && (
                      <button
                        type="button"
                        onClick={() => regenerateMessage(message)}
                        disabled={streaming}
                        className="mt-4 rounded-full border border-[#D4AF37]/35 px-3 py-1 text-xs font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/10 disabled:opacity-50"
                      >
                        Regenerate
                      </button>
                    )}
                  </div>
                </article>
              ))
            )}
          </div>

          {error && (
            <p className="mx-4 mb-4 rounded-2xl border border-red-300/25 bg-red-500/10 p-4 text-sm text-red-100 sm:mx-6">
              {error}
            </p>
          )}

          <form onSubmit={submitMessage} className="border-t border-white/12 p-4 sm:p-5">
            <label htmlFor="ai-guide-message" className="sr-only">
              Ask the AI Religious Guide
            </label>
            <textarea
              id="ai-guide-message"
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Ask about scripture, prayers, sacred places, nearby temples or spiritual routines..."
              rows={4}
              className="w-full resize-none rounded-[1.5rem] border border-white/12 bg-[#071A2F]/80 px-5 py-4 text-[#F8FAFC] outline-none transition placeholder:text-[#CBD5E1]/60 focus:border-[#D4AF37]"
            />
            <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <p className="text-xs text-[#CBD5E1]">
                Not an official religious, medical, legal or mental health authority.
              </p>
              <button
                type="submit"
                disabled={streaming || !input.trim()}
                className="rounded-2xl bg-[#D4AF37] px-5 py-3 text-sm font-bold text-[#071A2F] transition hover:bg-[#F5D76E] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {streaming ? "Sending..." : "Send"}
              </button>
            </div>
          </form>
        </GlassCard>

        <aside className="space-y-5">
          <GlassCard className="p-5">
            <h2 className="text-xl font-bold text-[#F8FAFC]">Suggested prompts</h2>
            <div className="mt-4 grid gap-3">
              {suggestedPrompts.map((prompt) => (
                <button
                  key={prompt}
                  type="button"
                  onClick={() => sendMessage(prompt)}
                  disabled={streaming}
                  className="rounded-2xl border border-white/12 bg-white/[0.06] px-4 py-3 text-left text-sm leading-6 text-[#CBD5E1] transition hover:border-[#D4AF37]/60 hover:bg-white/10 hover:text-[#F8FAFC] disabled:opacity-50"
                >
                  {prompt}
                </button>
              ))}
            </div>
          </GlassCard>

          <GlassCard className="p-5">
            <h2 className="text-xl font-bold text-[#F8FAFC]">Nearby context</h2>
            <p className="mt-3 text-sm leading-6 text-[#CBD5E1]">
              Enable location to let the guide include nearby temples from your Supabase temple data.
            </p>
            <button
              type="button"
              onClick={requestLocation}
              className="mt-4 w-full rounded-2xl border border-[#D4AF37]/40 bg-[#D4AF37]/10 px-4 py-3 text-sm font-bold text-[#F5D76E] transition hover:bg-[#D4AF37]/20"
            >
              Use my location
            </button>
            {locationStatus && (
              <p className="mt-3 text-sm text-[#CBD5E1]">{locationStatus}</p>
            )}
          </GlassCard>
        </aside>
      </div>
    </section>
  );
}
