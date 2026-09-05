import { FREE_MAX_CONTEXT_TOKENS } from "@/lib/rate-limit/free-config";
import type { ChatMode, SubscriptionTier } from "@/types";

export const MAX_TOKENS_FREE = FREE_MAX_CONTEXT_TOKENS;
export const MAX_TOKENS_PAID = 200000;

/**
 * Percentage of context window budget allocated to file uploads in Ask mode.
 * Leaves remaining budget for conversation history, system prompt, and model output.
 */
export const FILE_TOKEN_PERCENT = 0.5;

const getConfiguredProviderMaxContextTokens = (): number | null => {
  const configured = Number.parseInt(
    process.env.NEXT_PUBLIC_HACKERAI_MAX_CONTEXT_TOKENS ?? "",
    10,
  );

  return Number.isFinite(configured) && configured > 0
    ? Math.floor(configured)
    : null;
};

export const getMaxTokensForSubscription = (
  subscription?: SubscriptionTier,
  _opts?: { mode?: ChatMode },
): number => {
  // Local provider forks can have a smaller context ceiling than HackerAI's
  // upstream plans. Honor an explicit provider ceiling on both server and
  // client so upload validation and compaction use the same budget.
  const providerLimit = getConfiguredProviderMaxContextTokens();
  if (providerLimit !== null) return providerLimit;

  if (subscription === "free") return MAX_TOKENS_FREE;
  return MAX_TOKENS_PAID;
};

/**
 * Maximum total tokens allowed across all uploaded files in Ask mode.
 * Scales with the subscription's context window budget.
 */
export const getMaxFileTokens = (
  subscription: SubscriptionTier,
  opts?: { mode?: ChatMode },
): number => {
  return Math.floor(
    getMaxTokensForSubscription(subscription, opts) * FILE_TOKEN_PERCENT,
  );
};
