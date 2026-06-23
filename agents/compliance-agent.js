/**
 * Compliance Review Sub-Agent
 * ----------------------------
 * One of three independent evaluation sub-agents. Spawned by the orchestrator
 * during evaluation mode. Evaluates in isolation — does NOT see outputs from
 * accuracy or generalisability agents before forming its verdict.
 *
 * Regulatory scope: MAS FAA (Singapore), HKMA conduct requirements (HK).
 *
 * Critical design rule:
 *   ANY compliance flag blocks auto-approval regardless of other agent verdicts.
 *   This is a hard rule — not a majority vote. One compliance flag = escalation.
 *   Rationale: in regulated financial services, a 2/3 majority that includes
 *   a compliance pass is not sufficient. Compliance is a veto, not a vote.
 *
 * Failure mode — evaluation hallucination:
 *   This agent may approve a chunk that contains a contextually unsuitable
 *   recommendation, because it lacks full customer profile context.
 *   Mitigation: compliance-checker.js pattern matching runs first as a
 *   cheap pre-filter. The LLM evaluation is the second pass for nuanced cases.
 *
 * Failure handling: CRITICAL agent — any API failure escalates to human
 *   review queue rather than defaulting to approval. Never auto-approve
 *   when compliance check has not completed.
 */

import { checkCompliance } from '../skills/compliance-checker.js';
import { logger } from '../tools/logger.js';
import { withRetry } from '../tools/retry-handler.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const SYSTEM_PROMPT = `You are a compliance review sub-agent for Prudential, operating under MAS FAA guidelines (Singapore) and HKMA conduct requirements (Hong Kong). Evaluate whether the provided insurance sales knowledge chunk could constitute: unsuitable product recommendations, unsubstantiated product claims, misleading competitor comparisons, or regulatory risk. Be strict — any reasonable doubt should result in a FLAG. Respond ONLY with valid JSON, no preamble: {"verdict":"PASS"|"FLAG","confidence":"high"|"medium"|"low","reason":"one sentence citing specific regulatory concern if flagging"}`;

async function runComplianceAgent(chunk, apiKey) {
  logger.info('ComplianceAgent', 'Starting independent compliance evaluation');

  // Fast pre-filter: pattern matching before expensive LLM call
  const patternCheck = checkCompliance(chunk.text);
  if (patternCheck.escalate) {
    logger.warn('ComplianceAgent', `Pattern match red flag detected — escalating without LLM call`);
    return {
      agent: 'compliance',
      verdict: 'FLAG',
      confidence: 'high',
      reason: `Red flag pattern detected: ${patternCheck.redFlags[0]}. Escalating per MAS FAA guidelines.`,
    };
  }

  const result = await withRetry('ComplianceAgent', async () => {
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Evaluate this knowledge chunk for compliance:\n\nText: "${chunk.text}"\nStage: ${chunk.stage}\nTechnique: ${chunk.technique}\nProduct context: ${chunk.product_context}`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, true); // isCritical = true

  if (!result.success) {
    // Critical failure — must not auto-approve
    return { agent: 'compliance', verdict: 'FLAG', confidence: 'low', reason: 'Agent failed after retries — mandatory human review per critical agent policy.' };
  }

  logger.info('ComplianceAgent', `Verdict: ${result.result.verdict} (${result.result.confidence} confidence)`);
  return { agent: 'compliance', ...result.result };
}

export { runComplianceAgent };
