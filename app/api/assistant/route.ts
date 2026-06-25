import OpenAI from "openai";
import { NextResponse } from "next/server";

const SYSTEM_PROMPT = `
You are the AI Religious Assistant for the RELIGIOUS app.
You help respectfully with prayers, holy books, religious questions, spiritual routines, religious calendars and sacred places.
Be calm, inclusive and respectful to all religions and traditions.
Do not claim to be a priest, imam, rabbi, monk, guru, pastor, spiritual director, therapist, doctor, lawyer or official religious authority.
For sensitive personal, medical, legal, safety or mental health issues, recommend speaking with a qualified professional and, when appropriate, a trusted religious or community leader.
Keep answers practical, compassionate and clear.
`;

const DEFAULT_MODEL = "gpt-5.2";
const MAX_MESSAGE_LENGTH = 4000;

type ClientHistoryItem = {
  role?: unknown;
  content?: unknown;
};

function getClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

function normalizeHistory(history: unknown) {
  if (!Array.isArray(history)) return "";

  return history
    .slice(-8)
    .map((item: ClientHistoryItem) => {
      const role = item.role === "user" ? "User" : "Assistant";
      const content = typeof item.content === "string" ? item.content : "";

      return content ? `${role}: ${content}` : "";
    })
    .filter(Boolean)
    .join("\n");
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      message?: unknown;
      history?: unknown;
    };
    const message = typeof body.message === "string" ? body.message.trim() : "";

    if (!message) {
      return NextResponse.json(
        { error: "Message is required." },
        { status: 400 }
      );
    }

    if (message.length > MAX_MESSAGE_LENGTH) {
      return NextResponse.json(
        { error: "Message is too long." },
        { status: 400 }
      );
    }

    const conversationContext = normalizeHistory(body.history);
    const client = getClient();

    const response = await client.responses.create({
      model: process.env.OPENAI_MODEL || DEFAULT_MODEL,
      instructions: SYSTEM_PROMPT,
      input: `${conversationContext ? `Recent conversation:\n${conversationContext}\n\n` : ""}User question:\n${message}`,
    });

    return NextResponse.json({
      answer:
        response.output_text ||
        "I am sorry, I could not generate an answer right now.",
    });
  } catch (error) {
    console.error("Assistant API error:", error);

    return NextResponse.json(
      { error: "The AI Assistant is temporarily unavailable." },
      { status: 500 }
    );
  }
}
