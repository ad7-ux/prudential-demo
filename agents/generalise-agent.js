/**
 * Generalisability Review Sub-Agent
 * -----------------------------------
 * One of three independent evaluation sub-agents. Evaluates whether the
 * knowledge chunk represents broadly applicable sales technique, or whether
 * it was a one-off situational response that shouldn't be taught as principle.
 *
 * This agent addresses a specific failure mode in knowledge extraction:
 *   A top agent's brilliant response to a very specific customer situation
 *   gets extracted and taught as universal technique. Junior agents apply it
 *   in wrong contexts and it fails. They blame the AI.
 *
 * Example of low generalisability:
 *   An agent who closed a deal by referencing a shared alma mater with the
 *   customer. Highly effective in that moment. Not extractable as technique.
 *
 * Example of high generalisability:
 *   Asking a clarifying question before responding to a price objection.
 *   Works across customer profiles, products, and markets.
 */

import { logger } from '../tools/logger.js';
import { withRetry } from '../tools/retry-handler.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const SYSTEM_PROMPT = `You are a generalisability review sub-agent. Evaluate whether this insurance sales technique would work broadly across different customer profiles and situations, or whether it appears specific to one unique scenario. A technique is generalisable if it could be taught to any junior agent and applied reliably. Respond ONLY with valid JSON, no preamble: {"verdict":"PASS"|"FLAG","confidence":"high"|"medium"|"low","reason":"one sentence"}`;

async function runGeneraliseAgent(chunk) {
  logger.info('GeneraliseAgent', 'Starting independent generalisability evaluation');

  const result = await withRetry('GeneraliseAgent', async () => {
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Evaluate generalisability of this knowledge chunk:\n\nText: "${chunk.text}"\nStage: ${chunk.stage}\nTechnique: ${chunk.technique}\nCustomer signal: ${chunk.customer_signal}`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, false);

  if (!result.success) {
    return { agent: 'generalise', verdict: 'FLAG', confidence: 'low', reason: 'Agent failed after retries — flagging for human review.' };
  }

  logger.info('GeneraliseAgent', `Verdict: ${result.result.verdict} (${result.result.confidence} confidence)`);
  return { agent: 'generalise', ...result.result };
}

export { runGeneraliseAgent };
