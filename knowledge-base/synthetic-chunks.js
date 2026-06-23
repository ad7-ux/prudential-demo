/**
 * Synthetic Knowledge Base — Seeded Top Agent Knowledge
 * -------------------------------------------------------
 * This is the cold-start knowledge base populated from structured
 * role-play sessions with senior Prudential agents before junior
 * agent rollout.
 *
 * Cold start rationale:
 *   The system must provide useful advice from day one — before the
 *   flywheel has generated any real interaction data. Without this seed,
 *   junior agents receive generic or empty responses and abandon the tool
 *   before trust is established.
 *
 * Data note:
 *   All chunks below are SYNTHETIC. In production, these would be extracted
 *   from real top agent role-play sessions via the extraction pipeline,
 *   reviewed by compliance, and versioned before activation.
 *
 * Knowledge source: anonymised composite of senior agent personas.
 * Extraction method: structured role-play + semantic chunking pipeline.
 * Review status: all chunks marked 'approved' for prototype demonstration.
 */

const SYNTHETIC_CHUNKS = [
  {
    id: 'C001',
    version: 1,
    status: 'approved',
    text: 'Can I ask, when you say expensive, are you comparing it to something specific, or is it more that the total amount feels large? Understanding the nature of the objection changes the entire response.',
    stage: 'objection-handling',
    technique: 'objection-clarification',
    customer_signal: 'price-sensitive',
    outcome: 'neutral',
    product_context: 'general',
    source_agent_id: 'agent-senior-001',
    date_extracted: '2025-01-10T09:00:00Z',
    approved_by: 'reviewer-compliance-001',
    date_approved: '2025-01-11T14:00:00Z',
    retire_reason: null,
  },
  {
    id: 'C002',
    version: 1,
    status: 'approved',
    text: 'A lower premium often means a narrower coverage window or higher exclusions. What I\'d like to do is show you exactly what you\'re getting for each dollar — would that be useful?',
    stage: 'objection-handling',
    technique: 'value-reframe',
    customer_signal: 'competitor-comparison',
    outcome: 'receptive',
    product_context: 'multi-cover',
    source_agent_id: 'agent-senior-001',
    date_extracted: '2025-01-10T09:00:00Z',
    approved_by: 'reviewer-compliance-001',
    date_approved: '2025-01-11T14:00:00Z',
    retire_reason: null,
  },
  {
    id: 'C003',
    version: 1,
    status: 'approved',
    text: 'The risk isn\'t just death — it\'s also the scenario where you\'re alive but unable to work. For families with young children, total disability is statistically the more common financial catastrophe. That\'s the gap most people don\'t plan for.',
    stage: 'value-demonstration',
    technique: 'risk-reframe',
    customer_signal: 'family-protection-focus',
    outcome: 'receptive',
    product_context: 'multi-cover',
    source_agent_id: 'agent-senior-002',
    date_extracted: '2025-01-10T10:30:00Z',
    approved_by: 'reviewer-compliance-001',
    date_approved: '2025-01-11T14:30:00Z',
    retire_reason: null,
  },
  {
    id: 'C004',
    version: 1,
    status: 'approved',
    text: 'A plan you can keep is always better than a plan you lapse. Start with core coverage today and build in a guaranteed insurability option — that way you can upgrade without a new medical exam when your income grows.',
    stage: 'affordability',
    technique: 'graduated-commitment',
    customer_signal: 'budget-constraint',
    outcome: 'receptive',
    product_context: 'term-life',
    source_agent_id: 'agent-senior-001',
    date_extracted: '2025-01-10T09:00:00Z',
    approved_by: 'reviewer-compliance-001',
    date_approved: '2025-01-11T14:00:00Z',
    retire_reason: null,
  },
  {
    id: 'C005',
    version: 1,
    status: 'approved',
    text: 'When a customer asks to think about it, never push for an immediate close. Offer a concrete next step instead: "I\'ll send a summary document this afternoon — would a call on Thursday give you enough time to review it with your family?"',
    stage: 'follow-up',
    technique: 'soft-close-with-next-step',
    customer_signal: 'needs-time',
    outcome: 'neutral',
    product_context: 'general',
    source_agent_id: 'agent-senior-002',
    date_extracted: '2025-01-10T10:30:00Z',
    approved_by: 'reviewer-compliance-001',
    date_approved: '2025-01-11T14:30:00Z',
    retire_reason: null,
  },
];

export { SYNTHETIC_CHUNKS };
