import "server-only";

import OpenAI from "openai";

const DEFAULT_MODEL = "gpt-5.2";

type OpenAITextStreamEvent = {
  type: string;
  delta?: string;
  message?: string;
  response?: {
    error?: {
      message?: string | null;
    } | null;
    incomplete_details?: {
      reason?: string | null;
    } | null;
  };
};

function getOpenAIModel() {
  return process.env.OPENAI_MODEL || DEFAULT_MODEL;
}

export function getOpenAIProviderDiagnostics() {
  const apiKey = process.env.OPENAI_API_KEY || "";

  return {
    hasApiKey: Boolean(apiKey),
    apiKeyLength: apiKey.length,
    apiKeyPrefix: apiKey ? apiKey.slice(0, 7) : null,
    model: getOpenAIModel(),
  };
}

export function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY;

  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  return new OpenAI({ apiKey });
}

export async function createOpenAIResponseStream({
  instructions,
  input,
}: {
  instructions: string;
  input: string;
}) {
  const client = getOpenAIClient();

  return client.responses.create({
    model: getOpenAIModel(),
    instructions,
    input,
    stream: true,
  });
}

export async function* readOpenAITextStream(stream: AsyncIterable<OpenAITextStreamEvent>) {
  for await (const event of stream) {
    if (event.type === "response.output_text.delta") {
      yield event.delta || "";
    }

    if (event.type === "error") {
      throw new Error(event.message || "The OpenAI stream returned an error event.");
    }

    if (event.type === "response.failed") {
      throw new Error(event.response?.error?.message || "The AI response failed.");
    }

    if (event.type === "response.incomplete") {
      throw new Error(
        event.response?.incomplete_details?.reason
          ? `The AI response was incomplete: ${event.response.incomplete_details.reason}`
          : "The AI response was incomplete."
      );
    }
  }
}
