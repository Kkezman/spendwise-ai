import OpenAI from "openai";

export function getOpenAIConfiguration() {
  const apiKey = process.env.OPENAI_API_KEY;
  const model = process.env.OPENAI_MODEL?.trim();

  if (!apiKey || !model) {
    return null;
  }

  const baseURL = process.env.OPENAI_BASE_URL?.trim();
  const client = new OpenAI({
    apiKey,
    timeout: 45_000,
    maxRetries: 0,
    ...(baseURL ? { baseURL } : {}),
  });

  return { client, model };
}
