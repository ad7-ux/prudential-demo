/**
 * Coaching Sub-Agent
 * -------------------
 * Spawned by orchestrator during training mode, post-session.
 * Evaluates the junior agent's responses against the knowledge base
 * and generates structured coaching feedback with citations.
 *
 * Anti-hallucination measures:
 *
 *   1. GROUNDING CONSTRAINT — system prompt explicitly forbids extrapolation.
 *      The agent may only generate feedback based on retrieved KB chunks.
 *      If chunks don't cover the situation, it must say so rather than invent.
 *
 *   2. FORCED CITATION — every piece of feedback must cite the chunk it came from.
 *      Output without a valid [Source: C00X] tag is flagged as potentially hallucinated.
 *      See skills/citation-enforcer.js for citation validation logic.
 *
 *   3. GAP SIGNALLING — when the KB doesn't cover a situation adequately,
 *      the agent returns an insufficient_context signal rather than guessing.
 *      This feeds the KB expansion queue (future iteration).
 *
 * Attribution bias mitigation:
 *   Feedback is framed as technique analysis, not outcome judgement.
 *   "Your clarifying question aligned with C001" not "You failed to close."
 *   Rationale: outcome attribution ("AI gave bad advice → lost sale") is the
 *   primary adoption risk. Technique framing keeps the agent as the decision-maker.
 */

import { buildCitationPrompt, validateCitations } from '../skills/citation-enforcer.js';
import { logger } from '../tools/logger.js';
import { withRetry } from '../tools/retry-handler.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const SYSTEM_PROMPT = `You are a post-session coaching sub-agent for Prudential insurance sales training. Evaluate the junior agent's response technique against the knowledge base chunks provided. You must ONLY reference techniques present in the provided chunks. Do not invent techniques not in the knowledge base. Generate structured coaching feedback. Respond ONLY with valid JSON, no preamble: {"strength":"what the agent did well [Source: C00X]","gap":"what was missing or could improve","tip":"one specific actionable tip for next time","source_chunk":"C00X","insufficient_context":false}`;

async function runCoachingAgent(agentResponse, customerStatement, retrievedChunks) {
  logger.info('CoachingAgent', `Generating coaching feedback — ${retrievedChunks.length} KB chunks in context`);

  const citationContext = buildCitationPrompt(retrievedChunks);

  const result = await withRetry('CoachingAgent', async () => {
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `${citationContext}\n\nCustomer said: "${customerStatement}"\nJunior agent responded: "${agentResponse}"\n\nEvaluate the agent's technique against the knowledge base only.`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, false);

  if (!result.success) {
    return { success: false, feedback: null };
  }

  const feedback = result.result;

  // Validate citations — check cited chunks actually exist in KB
  const availableIds = retrievedChunks.map(c => c.id);
  const citationCheck = validateCitations(feedback.strength || '', availableIds);
  if (!citationCheck.valid) {
    logger.warn('CoachingAgent', `Invalid citation detected: ${citationCheck.invalidCitations.join(', ')} — flagging for review`);
    feedback._citationWarning = true;
  }

  logger.success('CoachingAgent', 'Coaching feedback generated with KB citation');
  return { success: true, feedback };
}

export { runCoachingAgent };
