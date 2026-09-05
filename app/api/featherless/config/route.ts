import { NextResponse } from "next/server";
import {
  getFeatherlessLocalConfigStatus,
  writeFeatherlessLocalConfig,
} from "@/lib/ai/featherless-local-config";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json(getFeatherlessLocalConfigStatus());
}

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as {
      apiKey?: string;
      selectedModel?: string;
      baseURL?: string;
    };

    const next = writeFeatherlessLocalConfig({
      apiKey: body.apiKey,
      selectedModel: body.selectedModel,
      baseURL: body.baseURL,
    });

    return NextResponse.json({
      ok: true,
      hasApiKey: Boolean(next.apiKey),
      selectedModel: next.selectedModel,
      baseURL: next.baseURL,
    });
  } catch (error) {
    return NextResponse.json(
      {
        ok: false,
        error: error instanceof Error ? error.message : "Could not save settings",
      },
      { status: 400 },
    );
  }
}
