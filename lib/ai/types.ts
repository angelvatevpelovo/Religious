export type AIChatRole = "user" | "assistant";

export type AIChatMessage = {
  role: AIChatRole;
  content: string;
};

export type AIGuideLocation = {
  latitude: number;
  longitude: number;
};

export type ReligiousGuideRequest = {
  message: string;
  history: AIChatMessage[];
  userId?: string | null;
  location?: AIGuideLocation | null;
};
