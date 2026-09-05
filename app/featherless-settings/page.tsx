"use client";

import { useEffect, useState } from "react";

type ModelInfo = {
  id: string;
  name: string;
  context_length: number | null;
  max_completion_tokens: number | null;
  available_on_current_plan: boolean | null;
  is_gated: boolean | null;
  model_class: string | null;
};

type ConfigStatus = {
  hasApiKey: boolean;
  selectedModel: string;
  baseURL: string;
};

const formatTokens = (value: number | null) => {
  if (!value) return "unknown";
  if (value >= 1_000_000) return `${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `${Math.round(value / 1_000)}K`;
  return String(value);
};

export default function FeatherlessSettingsPage() {
  const [status, setStatus] = useState<ConfigStatus | null>(null);
  const [apiKey, setApiKey] = useState("");
  const [search, setSearch] = useState("");
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [selectedModel, setSelectedModel] = useState("");
  const [agentOnly, setAgentOnly] = useState(true);
  const [availableOnly, setAvailableOnly] = useState(true);
  const [page, setPage] = useState(1);
  const [hasNextPage, setHasNextPage] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const loadStatus = async () => {
    const response = await fetch("/api/featherless/config", {
      cache: "no-store",
    });
    const data = (await response.json()) as ConfigStatus;
    setStatus(data);
    setSelectedModel(data.selectedModel || "");
  };

  const loadModels = async (targetPage = 1) => {
    setLoading(true);
    setMessage("");

    try {
      const params = new URLSearchParams({
        q: search,
        page: String(targetPage),
        agentOnly: String(agentOnly),
        availableOnly: String(availableOnly),
      });

      const response = await fetch(
        `/api/featherless/models?${params.toString()}`,
        { cache: "no-store" },
      );
      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not load Featherless models.");
      }

      setModels(data.data || []);
      setPage(data.page || targetPage);
      setHasNextPage(Boolean(data.hasNextPage));
    } catch (error) {
      setModels([]);
      setMessage(
        error instanceof Error ? error.message : "Could not load models.",
      );
    } finally {
      setLoading(false);
    }
  };

  const save = async () => {
    setLoading(true);
    setMessage("");

    try {
      const response = await fetch("/api/featherless/config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiKey: apiKey.trim() || undefined,
          selectedModel,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Could not save settings.");
      }

      setApiKey("");
      setStatus({
        hasApiKey: data.hasApiKey,
        selectedModel: data.selectedModel,
        baseURL: data.baseURL,
      });
      setMessage("Saved. New requests will use these settings immediately.");
    } catch (error) {
      setMessage(
        error instanceof Error ? error.message : "Could not save settings.",
      );
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    void loadStatus();
  }, []);

  useEffect(() => {
    if (status?.hasApiKey) {
      void loadModels(1);
    }
    // Intentionally load once after the configured-key status is known.
    // Search/filter changes use the Search button.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status?.hasApiKey]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-5xl flex-col gap-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold">Featherless Settings</h1>
        <p className="text-muted-foreground mt-1 text-sm">
          Local HackerAI provider settings. The API key never comes back to
          the browser after it is saved.
        </p>
      </div>

      <section className="rounded-xl border p-4">
        <h2 className="mb-3 font-medium">API key</h2>
        <div className="flex flex-col gap-3 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            type="password"
            autoComplete="off"
            placeholder={
              status?.hasApiKey
                ? "Key configured — enter a new key only to replace it"
                : "Enter Featherless API key"
            }
            value={apiKey}
            onChange={(event) => setApiKey(event.target.value)}
          />
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm font-medium"
            onClick={save}
            disabled={loading || (!apiKey.trim() && !selectedModel)}
          >
            Save
          </button>
        </div>

        <div className="text-muted-foreground mt-2 text-xs">
          Status: {status?.hasApiKey ? "configured" : "not configured"}
        </div>
      </section>

      <section className="rounded-xl border p-4">
        <div className="mb-3">
          <h2 className="font-medium">Model</h2>
          <p className="text-muted-foreground text-sm">
            Current: {selectedModel || "none selected"}
          </p>
        </div>

        <div className="mb-3 flex flex-col gap-2 sm:flex-row">
          <input
            className="min-w-0 flex-1 rounded-md border bg-transparent px-3 py-2 text-sm"
            placeholder="Search Featherless models"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") void loadModels(1);
            }}
          />
          <button
            type="button"
            className="rounded-md border px-4 py-2 text-sm"
            onClick={() => void loadModels(1)}
            disabled={loading || !status?.hasApiKey}
          >
            {loading ? "Loading..." : "Search"}
          </button>
        </div>

        <div className="mb-4 flex flex-wrap gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={agentOnly}
              onChange={(event) => setAgentOnly(event.target.checked)}
            />
            Agent-compatible only
          </label>

          <label className="flex items-center gap-2">
            <input
              type="checkbox"
              checked={availableOnly}
              onChange={(event) => setAvailableOnly(event.target.checked)}
            />
            Available on my plan only
          </label>
        </div>

        <div className="max-h-[55vh] overflow-auto rounded-md border">
          {models.length === 0 ? (
            <div className="text-muted-foreground p-4 text-sm">
              {status?.hasApiKey
                ? "No models loaded."
                : "Configure your API key first."}
            </div>
          ) : (
            models.map((model) => {
              const active = model.id === selectedModel;

              return (
                <button
                  key={model.id}
                  type="button"
                  onClick={() => setSelectedModel(model.id)}
                  className={`flex w-full items-start justify-between gap-4 border-b p-3 text-left last:border-b-0 ${
                    active ? "bg-muted" : "hover:bg-muted/50"
                  }`}
                >
                  <span className="min-w-0">
                    <span className="block truncate text-sm font-medium">
                      {model.name}
                    </span>
                    <span className="text-muted-foreground block truncate text-xs">
                      {model.id}
                    </span>
                  </span>

                  <span className="text-muted-foreground shrink-0 text-xs">
                    {formatTokens(model.context_length)}
                  </span>
                </button>
              );
            })
          )}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={page <= 1 || loading}
            onClick={() => void loadModels(page - 1)}
          >
            Previous
          </button>

          <span className="text-muted-foreground text-xs">Page {page}</span>

          <button
            type="button"
            className="rounded-md border px-3 py-1.5 text-sm"
            disabled={!hasNextPage || loading}
            onClick={() => void loadModels(page + 1)}
          >
            Next
          </button>
        </div>

        <button
          type="button"
          className="mt-4 rounded-md border px-4 py-2 text-sm font-medium"
          onClick={save}
          disabled={loading || !selectedModel}
        >
          Use selected model
        </button>
      </section>

      {message ? (
        <div className="rounded-md border p-3 text-sm">{message}</div>
      ) : null}
    </main>
  );
}
