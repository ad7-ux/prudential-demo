/**
 * Knowledge Base Interface
 * -------------------------
 * Provides store, retrieve, and search operations on the vector knowledge base.
 *
 * Production: Google Cloud Vector Search (aligns with Prudential's GCP infrastructure).
 * Prototype: in-memory array with metadata filtering + simple similarity simulation.
 *
 * Key design decisions:
 *
 * 1. METADATA FILTER FIRST — before similarity search, filter by stage/customer_signal.
 *    Rationale: reduces candidate pool, improves precision, cuts token cost.
 *    This is the primary token efficiency lever in the retrieval pipeline.
 *
 * 2. TOP-K RETRIEVAL — return max 3 chunks regardless of match count.
 *    Rationale: more context beyond K degrades generation quality.
 *    See model-config.js for configurable K value.
 *
 * 3. VERSIONING — every chunk has version + status. Only 'approved' chunks
 *    are retrievable. Retired chunks are retained for audit trail only.
 *
 * 4. NO AUTO-RETIREMENT — chunks are never automatically retired.
 *    A human reviewer must explicitly retire with a documented reason.
 *    Rationale: stale knowledge in insurance = compliance risk.
 *
 * Hallucination risk: retrieval hallucination occurs when superficially
 * similar but contextually wrong chunks are returned. Metadata pre-filtering
 * is the primary mitigation. Confidence scoring is the secondary check.
 */

import { SYNTHETIC_CHUNKS } from '../knowledge-base/synthetic-chunks.js';
import { MODEL_CONFIG } from '../config/model-config.js';
import { logger } from './logger.js';

class KnowledgeBase {
  constructor() {
    // Load seeded knowledge from top agents (cold start requirement)
    this.chunks = [...SYNTHETIC_CHUNKS];
  }

  // Store a newly approved chunk
  store(chunk) {
    const existing = this.chunks.findIndex(c => c.id === chunk.id);
    if (existing >= 0) {
      // Version bump on update
      this.chunks[existing] = { ...chunk, version: this.chunks[existing].version + 1 };
      logger.info('KnowledgeBase', `Chunk ${chunk.id} updated to version ${this.chunks[existing].version}`);
    } else {
      this.chunks.push({ ...chunk, version: 1, status: 'approved' });
      logger.success('KnowledgeBase', `Chunk ${chunk.id} stored — version 1 — status: approved`);
    }
  }

  // Retire a chunk (never delete — retain for audit)
  retire(chunkId, reason, reviewerId) {
    const chunk = this.chunks.find(c => c.id === chunkId);
    if (chunk) {
      chunk.status = 'retired';
      chunk.retire_reason = reason;
      chunk.retired_by = reviewerId;
      chunk.date_retired = new Date().toISOString();
      logger.warn('KnowledgeBase', `Chunk ${chunkId} retired by ${reviewerId} — reason: ${reason}`);
    }
  }

  /**
   * Retrieve relevant chunks for a given query context.
   * Step 1: Metadata pre-filter (stage, customer_signal)
   * Step 2: Return top K by relevance (prototype: positional; production: vector similarity)
   */
  retrieve(queryContext = {}) {
    const { stage, customer_signal, topK = MODEL_CONFIG.retrieval.topK } = queryContext;

    logger.info('KnowledgeBase', `Retrieval query — stage: ${stage || 'any'}, signal: ${customer_signal || 'any'}`);

    // Only retrieve approved chunks
    let candidates = this.chunks.filter(c => c.status === 'approved');

    // Metadata pre-filter (token efficiency lever)
    if (stage) {
      const stageMatches = candidates.filter(c => c.stage === stage);
      if (stageMatches.length > 0) candidates = stageMatches;
    }
    if (customer_signal) {
      const signalMatches = candidates.filter(c => c.customer_signal === customer_signal);
      if (signalMatches.length > 0) candidates = signalMatches;
    }

    const results = candidates.slice(0, topK);
    logger.info('KnowledgeBase', `Retrieved ${results.length} chunks (topK: ${topK}) after metadata filter`);
    return results;
  }

  getAll()     { return this.chunks; }
  getPending() { return this.chunks.filter(c => c.status === 'pending'); }
  getApproved(){ return this.chunks.filter(c => c.status === 'approved'); }
}

const knowledgeBase = new KnowledgeBase();
export { knowledgeBase };
