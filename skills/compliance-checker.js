/**
 * Skill: Compliance Checker
 * --------------------------
 * Shared rule patterns used by the Compliance Review Agent.
 * Also available to the Coaching Agent as a pre-send filter.
 *
 * Regulatory context:
 *   - MAS FAA (Financial Advisers Act) — Singapore
 *   - MAS Notice FAA-N16 — recommendations must be suitable for the customer
 *   - HKMA conduct requirements — Hong Kong
 *
 * This skill does NOT replace the Compliance Review Agent.
 * It provides a fast, cheap first-pass pattern match that catches
 * obvious issues before the expensive LLM evaluation runs.
 * Think of it as the linter before the compiler.
 *
 * Known limitation:
 *   Pattern matching catches explicit violations but misses contextual ones.
 *   E.g. "this plan is perfect for you" passes pattern matching but may
 *   constitute an unsuitable recommendation depending on customer profile.
 *   The Compliance Agent's LLM evaluation is the fallback for context-dependent issues.
 */

// High-risk phrases that always trigger compliance escalation
const COMPLIANCE_RED_FLAGS = [
  /guarantee[sd]?\s+return/i,         // Guaranteed returns — prohibited claim
  /best\s+plan\s+(for|in)/i,          // Superlative product claim
  /no\s+medical\s+(exam|underwriting)/i, // Waiving underwriting — requires disclosure
  /definitely\s+(cover|pay|approve)/i, // Certainty of claim approval
  /better\s+than\s+(aia|great\s+eastern|manulife|aviva)/i, // Unsubstantiated competitor comparison
  /only\s+\$?\d+\s+a\s+(day|week|month)/i, // Trivialising premium cost
];

// Medium-risk phrases — flag for review but don't auto-block
const COMPLIANCE_YELLOW_FLAGS = [
  /cheaper/i,
  /lower\s+premium/i,
  /more\s+coverage/i,
  /best\s+value/i,
  /recommend\s+this/i,
];

function checkCompliance(text) {
  const redMatches = COMPLIANCE_RED_FLAGS
    .filter(pattern => pattern.test(text))
    .map(p => p.toString());

  const yellowMatches = COMPLIANCE_YELLOW_FLAGS
    .filter(pattern => pattern.test(text))
    .map(p => p.toString());

  return {
    escalate:      redMatches.length > 0,
    review:        yellowMatches.length > 0 && redMatches.length === 0,
    redFlags:      redMatches,
    yellowFlags:   yellowMatches,
    clean:         redMatches.length === 0 && yellowMatches.length === 0,
  };
}

export { checkCompliance, COMPLIANCE_RED_FLAGS, COMPLIANCE_YELLOW_FLAGS };
