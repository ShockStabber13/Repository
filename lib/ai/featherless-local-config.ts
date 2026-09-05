import fs from "node:fs";
import path from "node:path";

export type FeatherlessLocalConfig = {
  apiKey: string;
  selectedModel: string;
  baseURL: string;
};

const configuredFile = process.env.HACKERAI_FEATHERLESS_CONFIG_PATH?.trim();
const CONFIG_FILE = configuredFile
  ? path.resolve(configuredFile)
  : path.join(process.cwd(), ".hackerai-local", "featherless.json");
const CONFIG_DIR = path.dirname(CONFIG_FILE);

const defaultConfig = (): FeatherlessLocalConfig => ({
  apiKey: process.env.FEATHERLESS_API_KEY?.trim() || "",
  selectedModel: process.env.FEATHERLESS_MODEL_ID?.trim() || "",
  baseURL:
    process.env.FEATHERLESS_BASE_URL?.trim() ||
    "https://api.featherless.ai/v1",
});

export function readFeatherlessLocalConfig(): FeatherlessLocalConfig {
  const fallback = defaultConfig();

  try {
    if (!fs.existsSync(CONFIG_FILE)) return fallback;

    const parsed = JSON.parse(
      fs.readFileSync(CONFIG_FILE, "utf8"),
    ) as Partial<FeatherlessLocalConfig>;

    return {
      apiKey: parsed.apiKey?.trim() || fallback.apiKey,
      selectedModel: parsed.selectedModel?.trim() || fallback.selectedModel,
      baseURL: parsed.baseURL?.trim() || fallback.baseURL,
    };
  } catch {
    return fallback;
  }
}

export function writeFeatherlessLocalConfig(
  update: Partial<FeatherlessLocalConfig>,
): FeatherlessLocalConfig {
  const current = readFeatherlessLocalConfig();
  const next: FeatherlessLocalConfig = {
    apiKey:
      typeof update.apiKey === "string" && update.apiKey.trim()
        ? update.apiKey.trim()
        : current.apiKey,
    selectedModel:
      typeof update.selectedModel === "string"
        ? update.selectedModel.trim()
        : current.selectedModel,
    baseURL:
      typeof update.baseURL === "string" && update.baseURL.trim()
        ? update.baseURL.trim()
        : current.baseURL,
  };

  fs.mkdirSync(CONFIG_DIR, { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify(next, null, 2), {
    encoding: "utf8",
    mode: 0o600,
  });

  try {
    fs.chmodSync(CONFIG_FILE, 0o600);
  } catch {
    // Windows ACLs are inherited from the user's profile/workspace.
  }

  return next;
}

export function getFeatherlessLocalConfigStatus() {
  const config = readFeatherlessLocalConfig();

  return {
    hasApiKey: Boolean(config.apiKey),
    selectedModel: config.selectedModel,
    baseURL: config.baseURL,
  };
}
