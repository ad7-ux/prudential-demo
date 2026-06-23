/**
 * Skill: Chunk Formatter
 * -----------------------
 * Shared skill used by the Chunking Agent and the Knowledge Base store.
 *
 * Normalises raw chunk data into the canonical metadata schema defined
 * in chunking-strategy.js. Ensures every chunk that enters the pipeline
 * carries a complete, consistent metadata signature regardless of
 * which agent created it or what input modality produced it.
 *
 * Why this is a shared skill rather than logic inside one agent:
 * The same formatting requirement applies at extraction time (Chunking Agent)
 * and at feedback loop ingestion time (future: when junior agent interactions
 * are promoted to the knowledge base). Centralising it here means the
 * schema is enforced consistently and any schema change only needs to
 * happen in one place.
 */

function formatChunk(raw) {
  return {
    id:               raw.id              || generateChunkId(),
    version:          raw.version         || 1,
    status:           raw.status          || 'pending',
    text:             raw.text            || '',
    stage:            raw.stage           || 'unknown',
    technique:        raw.technique       || 'unknown',
    customer_signal:  raw.customer_signal || 'unknown',
    outcome:          raw.outcome         || 'neutral',
    product_context:  raw.product_context || 'general',
    source_agent_id:  raw.source_agent_id || 'anonymous',
    date_extracted:   raw.date_extracted  || new Date().toISOString(),
    approved_by:      raw.approved_by     || null,
    date_approved:    raw.date_approved   || null,
    retire_reason:    raw.retire_reason   || null,
  };
}

function generateChunkId() {
  const n = Math.floor(Math.random() * 9000) + 1000;
  return `C${n}`;
}

export { formatChunk };
