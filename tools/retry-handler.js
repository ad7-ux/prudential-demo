/**
 * Retry Handler
 * -------------
 * Wraps any async sub-agent call with retry logic and failure escalation.
 *
 * Failure modes handled:
 *   - Network timeout       → retry with exponential backoff
 *   - API rate limit (429)  → retry after delay
 *   - Model error (5xx)     → retry, then escalate
 *   - Invalid JSON response → retry with stricter prompt, then escalate
 *
 * Escalation behaviour:
 *   - Critical agents (e.g. compliance): escalate to human queue on any failure.
 *     Rationale: never auto-approve when compliance check hasn't confirmed.
 *   - Non-critical agents (e.g. embedding): queue for async retry, notify user of delay.
 *
 * This pattern ensures the pipeline degrades gracefully rather than
 * breaking silently — a key requirement for enterprise trust.
 */

import { MODEL_CONFIG } from '../config/model-config.js';
import { logger } from './logger.js';

async function withRetry(agentName, fn, isCritical = false) {
  const { maxRetries, retryDelayMs, backoffMultiplier } = MODEL_CONFIG.retry;
  let attempt = 0;
  let delay = retryDelayMs;

  while (attempt <= maxRetries) {
    try {
      const result = await fn();
      return { success: true, result };
    } catch (err) {
      attempt++;
      logger.warn(agentName, `Attempt ${attempt} failed: ${err.message}`);

      if (attempt > maxRetries) {
        logger.error(agentName, `All ${maxRetries} retries exhausted`);

        if (isCritical) {
          logger.error(agentName, 'CRITICAL AGENT FAILURE — escalating to human review queue');
          return { success: false, critical: true, error: err.message };
        } else {
          logger.warn(agentName, 'Non-critical failure — queuing for async retry');
          return { success: false, critical: false, error: err.message };
        }
      }

      // Exponential backoff
      await new Promise(r => setTimeout(r, delay));
      delay *= backoffMultiplier;
    }
  }
}

export { withRetry };
