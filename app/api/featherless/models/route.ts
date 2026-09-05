import { NextResponse } from "next/server";
import { readFeatherlessLocalConfig } from "@/lib/ai/featherless-local-config";

export const runtime = "nodejs";

export async function GET(request: Request) {
  const config = readFeatherlessLocalConfig();

  if (!config.apiKey) {
    return NextResponse.json(
      { error: "Featherless API key is not configured." },
      { status: 400 },
    );
  }

  const incoming = new URL(request.url);
  const query = incoming.searchParams.get("q")?.trim() || "";
  const page = Math.max(
    1,
    Number.parseInt(incoming.searchParams.get("page") || "1", 10) || 1,
  );
  const agentOnly = incoming.searchParams.get("agentOnly") !== "false";
  const availableOnly =
    incoming.searchParams.get("availableOnly") !== "false";

  const url = new URL(`${config.baseURL.replace(/\/$/, "")}/models`);
  url.searchParams.set("page", String(page));
  url.searchParams.set("per_page", "100");
  url.searchParams.set("sort", "-popularity");

  if (query) url.searchParams.set("q", query);
  if (agentOnly) {
    url.searchParams.set("capabilities", "chat,tool-use");
    const configuredContextLimit = Number.parseInt(
      process.env.NEXT_PUBLIC_HACKERAI_MAX_CONTEXT_TOKENS ?? "32768",
      10,
    );
    url.searchParams.set(
      "context_length_min",
      String(
        Number.isFinite(configuredContextLimit) && configuredContextLimit > 0
          ? configuredContextLimit
          : 32768,
      ),
    );
  }
  if (availableOnly) {
    url.searchParams.set("available_on_current_plan", "true");
  }

  const response = await fetch(url, {
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    cache: "no-store",
  });

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    return NextResponse.json(
      {
        error:
          payload?.error?.message ||
          payload?.error ||
          `Featherless returned HTTP ${response.status}`,
      },
      { status: response.status },
    );
  }

  const data = Array.isArray(payload?.data) ? payload.data : [];

  return NextResponse.json({
    page,
    hasNextPage: data.length === 100,
    data: data.map((model: Record<string, unknown>) => ({
      id: model.id,
      name: model.name ?? model.id,
      context_length: model.context_length ?? null,
      max_completion_tokens: model.max_completion_tokens ?? null,
      available_on_current_plan:
        model.available_on_current_plan ?? null,
      is_gated: model.is_gated ?? null,
      model_class: model.model_class ?? null,
    })),
  });
}
