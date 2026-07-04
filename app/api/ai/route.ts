import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { buildReligiousGuideContext } from "../../../lib/ai/context";
import { getOpenAIProviderDiagnostics } from "../../../lib/ai/openai-provider";
import { createReligiousGuideResponseStream } from "../../../lib/ai/religious-guide-service";
import type { AIChatMessage, AIGuideLocation } from "../../../lib/ai/types";

export const runtime = "nodejs";

const MAX_MESSAGE_LENGTH = 4000;
const GENERIC_AI_ERROR = "The AI Religious Guide is temporarily unavailable.";

type RequestBody = {
  message?: unknown;
  history?: unknown;
  location?: unknown;
};

function normalizeHistory(value: unknown): AIChatMessage[] {
  if (!Array.isArray(value)) return [];

  return value
    .map((item) => {
      if (!item || typeof item !== "object") return null;

      const role = "role" in item ? item.role : null;
      const content = "content" in item ? item.content : null;

      if ((role !== "user" && role !== "assistant") || typeof content !== "string") {
        return null;
      }

      return {
        role,
        content: content.slice(0, MAX_MESSAGE_LENGTH),
      };
    })
    .filter((item): item is AIChatMessage => Boolean(item))
    .slice(-12);
}

function normalizeLocation(value: unknown): AIGuideLocation | null {
  if (!value || typeof value !== "object") return null;

  const latitude = Number("latitude" in value ? value.latitude : null);
  const longitude = Number("longitude" in value ? value.longitude : null);

  if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) return null;
  if (latitude < -90 || latitude > 90 || longitude < -180 || longitude > 180) return null;

  return { latitude, longitude };
}

function getSupabaseClient(accessToken: string | null) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error("Supabase environment variables are not configured.");
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
    global: accessToken
      ? {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        }
      : undefined,
  });
}

function getAccessToken(request: Request) {
  const authHeader = request.headers.get("authorization") || "";
  const match = authHeader.match(/^Bearer\s+(.+)$/i);

  return match?.[1] ?? null;
}

function isDevelopment() {
  return process.env.NODE_ENV !== "production";
}

function errorMessage(error: unknown) {
  return error instanceof Error ? error.message : String(error);
}

function logOriginalError(label: string, error: unknown) {
  console.error(label, error);
}

function publicErrorMessage(error: unknown) {
  return isDevelopment() ? errorMessage(error) : GENERIC_AI_ERROR;
}

function createPlaceholderAnswer(message: string, context: string) {
  const contextHint = context.trim()
    ? "I found some RELIGIOUS app context that may be relevant, but the live AI provider is not available right now."
    : "I do not have live AI provider access right now, so this is a safe placeholder response.";

  return `### Reflective guidance\n${contextHint}\n\nFor your question: "${message}"\n\n- Take a calm moment to name what you are seeking: comfort, understanding, practice, or community.\n- If your question is about a specific tradition, consider checking a trusted sacred text, commentary, or knowledgeable spiritual leader from that tradition.\n- If this touches health, safety, law, or mental health, please speak with a qualified professional.\n\nThis assistant provides informational and reflective guidance. It is not a replacement for clergy, spiritual leaders, medical, legal, or mental health professionals.`;
}

function conversationTitle(message: string) {
  return message.trim().slice(0, 70) || "AI Assistant question";
}

async function saveAIExchange({
  supabase,
  userId,
  question,
  answer,
}: {
  supabase: ReturnType<typeof getSupabaseClient>;
  userId: string | null;
  question: string;
  answer: string;
}) {
  if (!userId || !question.trim() || !answer.trim()) return;

  const { data: conversation, error: conversationError } = await supabase
    .from("ai_conversations")
    .insert({
      user_id: userId,
      title: conversationTitle(question),
    })
    .select("id")
    .single();

  if (conversationError) {
    console.error("AI history conversation save error:", conversationError);
    return;
  }

  const { error: messagesError } = await supabase.from("ai_messages").insert([
    {
      conversation_id: conversation.id,
      user_id: userId,
      role: "user",
      content: question,
    },
    {
      conversation_id: conversation.id,
      user_id: userId,
      role: "assistant",
      content: answer,
    },
  ]);

  if (messagesError) {
    console.error("AI history messages save error:", messagesError);
  }
}

export async function POST(request: Request) {
  try {
    if (isDevelopment()) {
      console.info("AI provider diagnostics:", getOpenAIProviderDiagnostics());
    }

    const body = (await request.json()) as RequestBody;
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json({ error: "Message is required." }, { status: 400 });
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json({ error: "Message is too long." }, { status: 400 });
    }

    const accessToken = getAccessToken(request);
    const supabase = getSupabaseClient(accessToken);
    const {
      data: { user },
    } = accessToken ? await supabase.auth.getUser(accessToken) : { data: { user: null } };
    const history = normalizeHistory(body.history);
    const location = normalizeLocation(body.location);
    const context = await buildReligiousGuideContext({
      supabase,
      message,
      userId: user?.id ?? null,
      location,
    });
    let aiStream: AsyncIterable<string>;

    try {
      aiStream = await createReligiousGuideResponseStream({
        message,
        history,
        userId: user?.id ?? null,
        location,
        context,
      });
    } catch (error) {
      logOriginalError("AI provider startup error:", error);

      const placeholderAnswer = createPlaceholderAnswer(message, context);

      await saveAIExchange({
        supabase,
        userId: user?.id ?? null,
        question: message,
        answer: placeholderAnswer,
      });

      return NextResponse.json({ answer: placeholderAnswer });
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        let answer = "";

        try {
          for await (const chunk of aiStream) {
            answer = `${answer}${chunk}`;
            controller.enqueue(encoder.encode(chunk));
          }

          await saveAIExchange({
            supabase,
            userId: user?.id ?? null,
            question: message,
            answer,
          });

          controller.close();
        } catch (error) {
          logOriginalError("AI streaming error:", error);
          controller.enqueue(
            encoder.encode(
              isDevelopment()
                ? `\n\n[Development AI streaming error] ${errorMessage(error)}`
                : "\n\nThe AI Religious Guide is temporarily unavailable. Please try again soon."
            )
          );
          controller.close();
        }
      },
    });

    return new Response(stream, {
      headers: {
        "Cache-Control": "no-cache, no-transform",
        "Content-Type": "text/plain; charset=utf-8",
      },
    });
  } catch (error) {
    logOriginalError("AI route error:", error);

    return NextResponse.json(
      { error: publicErrorMessage(error) },
      { status: 500 }
    );
  }
}
