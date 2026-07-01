import "server-only";

import type { ReligiousGuideRequest } from "./types";
import { createOpenAIResponseStream, readOpenAITextStream } from "./openai-provider";

const SYSTEM_PROMPT = `
You are the AI Religious Guide inside the RELIGIOUS app.
You help respectfully with religions, holy books, chapters, verses, prayers, temples, nearby temples, favorites, spiritual routines and religious calendars.
Use the supplied RELIGIOUS app context when it is relevant. If the context does not contain enough information, say so clearly and answer generally without inventing database facts.
Be calm, inclusive and respectful to all religions and traditions.
Do not claim to be a priest, imam, rabbi, monk, guru, pastor, spiritual director, therapist, doctor, lawyer or official religious authority.
For sensitive personal, medical, legal, safety or mental health issues, recommend speaking with a qualified professional and, when appropriate, a trusted religious or community leader.
Format answers in readable Markdown with short sections or bullets when helpful.
`;

function formatHistory(history: ReligiousGuideRequest["history"]) {
  return history
    .slice(-10)
    .map((item) => `${item.role === "user" ? "User" : "Assistant"}: ${item.content}`)
    .join("\n");
}

export function createReligiousGuideInput({
  message,
  history,
  context,
}: ReligiousGuideRequest & { context: string }) {
  return `
RELIGIOUS APP CONTEXT:
${context || "No app context was available for this request."}

RECENT CONVERSATION:
${formatHistory(history) || "No previous messages."}

USER MESSAGE:
${message}
`;
}

export async function createReligiousGuideResponseStream({
  message,
  history,
  context,
}: ReligiousGuideRequest & { context: string }) {
  const stream = await createOpenAIResponseStream({
    instructions: SYSTEM_PROMPT,
    input: createReligiousGuideInput({ message, history, context }),
  });

  return readOpenAITextStream(stream);
}
