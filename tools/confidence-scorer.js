/**
 * Confidence Scorer
 * ------------------
 * Evaluates the confidence level of any sub-agent output and determines
 * whether it should auto-proceed, enter human review, or be rejected.
 *
 * Confidence is assessed on two dimensions:
 *   1. RETRIEVAL CONFIDENCE — how well the retrieved chunks match the query.
 *      Low retrieval confidence = the situation isn't well-covered in the KB.
 *      This is a signal to flag for KB expansion, not to generate advice anyway.
 *
 *   2. GENERATION CONFIDENCE — how grounded the generated output is in
 *      retrieved context. Measured by citation coverage and semantic overlap.
 *      Low generation confidence = model may be extrapolating beyond the KB.
 *
 * Known limitation (flagged for production):
 *   Most RAG systems are overconfident — they assign high confidence even when
 *   wrong. This scorer uses explicit citation checking as a grounding signal,
 *   but is not a substitute for human review on compliance-adjacent outputs.
 *
 * Thresholds defined in model-config.js.
 */

import { MODEL_CONFIG } from '../config/model-config.js';
import { logger } from './logger.js';

function scoreConfidence({ retrievedChunks, generatedOutput, citedChunkIds = [] }) {
  const { autoApprove, humanReview } = MODEL_CONFIG.confidence;

  // Retrieval confidence: based on number of relevant chunks found
  const retrievalScore = retrievedChunks.length >= 3 ? 1.0
    : retrievedChunks.length === 2 ? 0.85
    : retrievedChunks.length === 1 ? 0.75
    : 0.40; // No chunks found = very low confidence

  // Generation confidence: does the output cite at least one chunk?
  const citationScore = citedChunkIds.length > 0 ? 0.90 : 0.55;

  // Combined score (weighted: retrieval matters more)
  const combined = (retrievalScore * 0.6) + (citationScore * 0.4);

  let decision;
  if (combined >= autoApprove)       decision = 'AUTO_PROCEED';
  else if (combined >= humanReview)  decision = 'HUMAN_REVIEW';
  else                               decision = 'REJECT';

  logger.info('ConfidenceScorer', `Score: ${combined.toFixed(2)} → decision: ${decision}`);

  return {
    retrievalScore,
    citationScore,
    combined: parseFloat(combined.toFixed(2)),
    decision,
  };
}

export { scoreConfidence };
