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

      return NextResponse.json(
        { error: publicErrorMessage(error) },
        { status: 500 }
      );
    }

    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of aiStream) {
            controller.enqueue(encoder.encode(chunk));
          }

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
