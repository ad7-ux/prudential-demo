/**
 * Chunking & Labelling Sub-Agent
 * --------------------------------
 * Spawned by orchestrator during extraction mode.
 * Takes raw transcript text and produces semantically segmented,
 * metadata-labelled chunks ready for embedding.
 *
 * Chunking strategy: see config/chunking-strategy.js for full rationale.
 * Summary: cut at semantic boundaries (topic shift + speaker turn),
 * not at fixed word/token counts. Apply 2-sentence overlap at boundaries.
 *
 * Failure modes specific to chunking:
 *
 *   OVER-CHUNKING: cutting too finely strips context.
 *   A chunk that says "I completely understand" is meaningless without
 *   the customer statement that preceded it.
 *
 *   UNDER-CHUNKING: chunks too large → imprecise retrieval.
 *   A 400-word chunk retrieved for a 30-word question buries the
 *   relevant section in noise, degrading coaching output quality.
 *
 *   BOUNDARY SPLIT: an objection starts at the end of one chunk and
 *   the agent's response is in the next. The 2-sentence overlap
 *   mitigation in chunking-strategy.js addresses this directly.
 *
 * Output: array of formatChunk()-normalised objects (see skills/chunk-formatter.js).
 */

import { formatChunk } from '../skills/chunk-formatter.js';
import { CHUNKING_STRATEGY } from '../config/chunking-strategy.js';
import { logger } from '../tools/logger.js';
import { withRetry } from '../tools/retry-handler.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const SYSTEM_PROMPT = `You are a chunking and labelling sub-agent in an insurance sales knowledge extraction pipeline. Segment the transcript into 4-6 semantic chunks at meaningful conversation boundaries (topic shift, objection raised, value statement, close attempt). Apply 2-sentence overlap at chunk boundaries to preserve continuity. Label each chunk with metadata. Respond ONLY with valid JSON, no preamble: {"chunks":[{"id":"C001","text":"...","stage":"rapport|discovery|objection-handling|value-demonstration|affordability|close|follow-up","technique":"...","customer_signal":"...","outcome":"receptive|resistant|neutral","product_context":"..."}]}`;

async function runChunkingAgent(transcriptText, sourceAgentId = 'anonymous') {
  logger.info('ChunkingAgent', `Starting semantic chunking — target: ${CHUNKING_STRATEGY.targetTokenMin}-${CHUNKING_STRATEGY.targetTokenMax} tokens per chunk`);

  const result = await withRetry('ChunkingAgent', async () => {
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: SYSTEM_PROMPT,
        messages: [{
          role: 'user',
          content: `Chunk and label this insurance sales transcript:\n\n${transcriptText}`,
        }],
      }),
    });
    const data = await response.json();
    const text = data.content[0].text.replace(/```json|```/g, '').trim();
    return JSON.parse(text);
  }, false);

  if (!result.success) {
    logger.error('ChunkingAgent', 'Chunking failed after retries');
    return { success: false, chunks: [] };
  }

  const rawChunks = result.result.chunks || [];
  const formattedChunks = rawChunks.map(c =>
    formatChunk({ ...c, source_agent_id: sourceAgentId, status: 'pending' })
  );

  logger.success('ChunkingAgent', `${formattedChunks.length} chunks created and formatted with metadata schema`);
  return { success: true, chunks: formattedChunks };
}

export { runChunkingAgent };
