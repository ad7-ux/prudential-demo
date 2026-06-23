/**
 * Model & API Configuration
 * --------------------------
 * Centralised settings for all Claude API calls across the pipeline.
 *
 * Token efficiency notes:
 * - max_tokens capped at 1000 — sufficient for structured sub-agent outputs.
 * - System prompts are audited for brevity — every token in a system prompt
 *   is paid on every call. Bloated prompts compound in multi-agent pipelines.
 * - top_k retrieval capped at 3 chunks — more context degrades generation
 *   quality beyond a threshold while increasing cost linearly.
 *
 * Retry policy:
 * - maxRetries: 2 attempts before escalating to orchestrator.
 * - retryDelay: exponential backoff (500ms, 1000ms).
 * - Critical agents (compliance) escalate to human on any failure.
 *   Non-critical agents (embedding) queue for async retry.
 */

const MODEL_CONFIG = {
  model: 'claude-sonnet-4-6',
  max_tokens: 1000,
  apiEndpoint: 'https://api.anthropic.com/v1/messages',

  retrieval: {
    topK: 3,                    // Max chunks returned per query
    minSimilarityScore: 0.72,   // Below this → low confidence flag
    metadataFilterFirst: true,  // Pre-filter by metadata before vector search
  },

  retry: {
    maxRetries: 2,
    retryDelayMs: 500,
    backoffMultiplier: 2,
    criticalAgents: ['compliance-agent'], // Always escalate to human on failure
  },

  // Confidence thresholds
  confidence: {
    autoApprove: 0.85,   // Above this → pass without human review
    humanReview: 0.70,   // Between 0.70-0.85 → queue for human review
    autoReject: 0.70,    // Below this → reject, log reason, return to submitter
  },
};

export { MODEL_CONFIG };
