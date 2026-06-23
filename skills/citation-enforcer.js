/**
 * Skill: Citation Enforcer
 * -------------------------
 * Shared skill used by both the Coaching Agent and the Chunking Agent.
 *
 * Purpose: ensures all generated advice explicitly cites the knowledge base
 * chunk it was derived from. This is the primary mitigation for
 * GENERATION HALLUCINATION — where the model extrapolates beyond retrieved
 * context and presents invented advice as established knowledge.
 *
 * Rule: if the output cannot cite a chunk, it must not generate advice.
 * Instead it returns a structured "insufficient context" signal, which
 * the orchestrator routes to human review or KB expansion queue.
 *
 * Forced citation also creates an implicit audit trail:
 * every piece of advice delivered to a junior agent can be traced
 * back to a specific approved chunk, approved by a specific reviewer.
 * This is the compliance layer at the generation level.
 */

function buildCitationPrompt(retrievedChunks) {
  if (!retrievedChunks || retrievedChunks.length === 0) {
    return `No relevant knowledge base chunks were found for this situation.
Do NOT generate advice by extrapolating from general knowledge.
Instead respond with JSON: {"insufficient_context": true, "reason": "one sentence explaining what context is missing"}`;
  }

  const chunkContext = retrievedChunks
    .map(c => `[${c.id}] Stage: ${c.stage} | Technique: ${c.technique}\n"${c.text}"`)
    .join('\n\n');

  return `You must base your response ONLY on the following knowledge base chunks.
Do not extrapolate, invent, or add information not present in these chunks.
At the end of your response, cite every chunk you used with [Source: C00X].
If the chunks do not cover the situation adequately, say so explicitly rather than guessing.

KNOWLEDGE BASE CHUNKS:
${chunkContext}`;
}

function extractCitations(text) {
  const matches = text.match(/\[Source:\s*(C\d+)\]/gi) || [];
  return matches.map(m => m.match(/C\d+/i)[0].toUpperCase());
}

function validateCitations(text, availableChunkIds) {
  const cited = extractCitations(text);
  const invalid = cited.filter(id => !availableChunkIds.includes(id));
  return {
    cited,
    valid: invalid.length === 0,
    invalidCitations: invalid,
  };
}

export { buildCitationPrompt, extractCitations, validateCitations };
