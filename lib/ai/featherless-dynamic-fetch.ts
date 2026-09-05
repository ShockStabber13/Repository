import { readFeatherlessLocalConfig } from "@/lib/ai/featherless-local-config";

export const featherlessDynamicFetch: typeof fetch = async (url, init) => {
  const config = readFeatherlessLocalConfig();

  if (!config.apiKey) {
    throw new Error(
      "Featherless API key is not configured. Open /featherless-settings.",
    );
  }

  if (!config.selectedModel) {
    throw new Error(
      "No Featherless model is selected. Open /featherless-settings.",
    );
  }

  const headers = new Headers(init?.headers);
  headers.set("Authorization", `Bearer ${config.apiKey}`);

  let body = init?.body;

  if (typeof body === "string") {
    try {
      const parsed = JSON.parse(body) as Record<string, unknown>;
      parsed.model = config.selectedModel;
      body = JSON.stringify(parsed);
    } catch {
      // Keep non-JSON bodies unchanged.
    }
  }

  return globalThis.fetch(url, {
    ...init,
    headers,
    body,
  });
};
