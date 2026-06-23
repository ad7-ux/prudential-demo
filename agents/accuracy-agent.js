/**
 * Accuracy Review Sub-Agent
 * --------------------------
 * One of three independent evaluation sub-agents. Evaluates whether the
 * knowledge chunk is factually accurate and consistent with standard
 * insurance industry practice.
 *
 * Independence requirement:
 *   This agent evaluates in complete isolation. It must not see outputs from
 *   the compliance or generalisability agents before forming its verdict.
 *   The orchestrator collects all three verdicts simultaneously.
 *   Rationale: sequential evaluation creates anchoring bias — the first
 *   verdict influences subsequent ones, producing false consensus.
 *
 * Failure mode — correlated failure:
 *   All three evaluation agents share the same underlying model.
 *   If the model has a systematic blind spot, all three may miss it
 *   and produce unanimous but incorrect consensus.
 *   Mitigation: each agent uses a distinct system prompt framing.
 *   Production mitigation: use different model variants for at least
 *   one evaluation agent to reduce correlated failure risk.
 */

import { logger } from '../tools/logger.js';
import { withRetry } from '../tools/retry-handler.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const SYSTEM_PROMPT = `You are an accuracy review sub-agent. Evaluate whether this insurance sales knowledge chunk is factually accurate and consistent with standard insurance industry practice. Focus only on factual correctness — not compliance or generalisability. Respond ONLY with valid JSON, no preamble: {"verdict":"PASS"|"FLAG","confidence":"high"|"medium"|"low","reason":"one sentence"}`;

async function runAccuracyAgent(chunk) {
  logger.info('AccuracyAgent', 'Starting independent accuracy evaluation');

  const result = await withRetry('AccuracyAgent', async () => {
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Evaluate accuracy of this knowledge chunk:\n\nText: "${chunk.text}"\nStage: ${chunk.stage}\nTechnique: ${chunk.technique}`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, false);

  if (!result.success) {
    return { agent: 'accuracy', verdict: 'FLAG', confidence: 'low', reason: 'Agent failed after retries — flagging for human review.' };
  }

  logger.info('AccuracyAgent', `Verdict: ${result.result.verdict} (${result.result.confidence} confidence)`);
  return { agent: 'accuracy', ...result.result };
}

export { runAccuracyAgent };
