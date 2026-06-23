/**
 * Chunking Strategy Configuration
 * --------------------------------
 * Defines how raw transcripts are segmented into knowledge chunks.
 *
 * Key design decisions documented here:
 *
 * 1. SEMANTIC BOUNDARIES — chunks cut at topic/speaker shifts, not word count.
 *    Rationale: a mid-objection cut destroys the meaning of both halves.
 *
 * 2. OVERLAP — last 1-2 sentences of chunk N are included in chunk N+1.
 *    Rationale: preserves conversational continuity at boundaries.
 *    Tradeoff: ~15% storage overhead. Accepted for retrieval quality.
 *
 * 3. TARGET SIZE — 150-250 tokens per chunk.
 *    Too small: loses context. Too large: retrieval imprecision.
 *
 * 4. METADATA SCHEMA — every chunk carries structured tags.
 *    Rationale: enables metadata pre-filtering before similarity search,
 *    dramatically improving retrieval precision and reducing token cost.
 *
 * Production note: boundary detection is automated via NLP.
 * Prototype: Claude is prompted to detect boundaries directly.
 */

const CHUNKING_STRATEGY = {
  targetTokenMin: 150,
  targetTokenMax: 250,
  overlapSentences: 2,

  // Semantic boundary triggers — signals a new chunk should start
  boundarySignals: [
    'speaker_turn',       // Agent → Customer or Customer → Agent
    'topic_shift',        // New subject introduced
    'objection_raised',   // Customer raises a concern
    'objection_response', // Agent responds to concern
    'value_statement',    // Agent makes a product claim
    'close_attempt',      // Agent moves toward commitment
    'follow_up',          // Next steps discussed
  ],

  // Metadata schema — applied to every chunk at extraction time
  metadataSchema: {
    id:               'string  — unique chunk ID e.g. C001',
    version:          'integer — increments on edit, starts at 1',
    status:           'enum    — pending | approved | retired',
    stage:            'enum    — rapport | discovery | objection-handling | value-demonstration | affordability | close | follow-up',
    technique:        'string  — e.g. value-reframe, risk-reframe, graduated-commitment',
    customer_signal:  'string  — e.g. price-sensitive, competitor-comparison, budget-constraint',
    outcome:          'enum    — receptive | resistant | neutral',
    source_agent_id:  'string  — anonymised ID of contributing top agent',
    product_context:  'string  — product type discussed e.g. multi-cover, term-life',
    date_extracted:   'ISO8601 timestamp',
    approved_by:      'string  — reviewer ID, null until approved',
    date_approved:    'ISO8601 timestamp, null until approved',
    retire_reason:    'string  — populated on retirement e.g. product discontinued',
  },
};

export { CHUNKING_STRATEGY };
