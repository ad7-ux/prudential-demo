/**
 * Customer Simulation Sub-Agent
 * ------------------------------
 * Spawned fresh by the orchestrator for each training session.
 * Plays a customer with a specific profile and primary objection.
 *
 * Key design principle — disposable agents:
 *   This agent is created new for each session with a profile-specific
 *   system prompt. It is NOT reused across sessions.
 *   Rationale: a reused agent carries state and persona drift from previous
 *   sessions. A fresh agent is precisely calibrated to the requested profile.
 *   This is the orchestrator pattern's core advantage over static agents.
 *
 * Profile-specific vs randomised:
 *   SPECIFIC: orchestrator builds prompt from selected customer profile.
 *   RANDOMISED: orchestrator selects from profile library at random.
 *   Both produce a fresh, purpose-built agent — only the input differs.
 *
 * Simulation limitation (flagged explicitly):
 *   AI customer agents are built from the same knowledge base being tested.
 *   This creates a closed validation loop — agents trained on KB A are
 *   tested by a simulator also built on KB A.
 *   Real customers will present situations the KB doesn't cover.
 *   Simulation is a foundational tool, not a substitute for supervised
 *   real-world practice.
 */

import { logger } from '../tools/logger.js';
import { MODEL_CONFIG } from '../config/model-config.js';

const CUSTOMER_PROFILES = {
  price: {
    label: 'Price-sensitive family — mid-income, two children',
    name: 'Mrs Tan',
    age: 38,
    profile: 'Married with two young children. Household income moderate. First time seriously considering insurance. Seen Prudential ads but concerned about cost.',
    primary_objection: 'premium cost feels too high for the budget',
    secondary_objection: 'not sure if they need this much coverage',
  },
  competitor: {
    label: 'Competitor comparison — analytical professional',
    name: 'Mr Raj',
    age: 42,
    profile: 'Senior professional, analytical mindset. Has compared AIA and Prudential plans online. Wants to understand value differential before committing.',
    primary_objection: 'AIA plan appears cheaper for similar coverage',
    secondary_objection: 'wants specific data not general claims',
  },
  random: {
    label: 'Young professional — questioning relevance',
    name: 'Ms Lee',
    age: 29,
    profile: 'Single, no dependents, healthy. Colleague suggested insurance but unsure if it is relevant at this life stage.',
    primary_objection: 'does not see why she needs insurance at 29',
    secondary_objection: 'prefers to invest money rather than pay premiums',
  },
};

function buildSimulationPrompt(profileKey) {
  const profile = CUSTOMER_PROFILES[profileKey] || CUSTOMER_PROFILES.random;
  return {
    profile,
    systemPrompt: `You are a customer simulation sub-agent playing the role of ${profile.name}, age ${profile.age}. Background: ${profile.profile}. Your primary objection is: ${profile.primary_objection}. Your secondary objection is: ${profile.secondary_objection}. Respond as this customer — realistic, not hostile, not immediately sold. Raise your objection naturally. Keep responses to 2-3 sentences. If the agent gives a good response, show some movement but do not fully commit in one exchange.`,
  };
}

async function runSimulationAgent(profileKey, conversationHistory = []) {
  const { profile, systemPrompt } = buildSimulationPrompt(profileKey);
  logger.info('SimulationAgent', `Customer profile: ${profile.name}, ${profile.age} — objection: ${profile.primary_objection}`);

  const isOpening = conversationHistory.length === 0;
  const userMessage = isOpening
    ? 'Start the conversation as this customer. Greet the agent and naturally surface your primary concern.'
    : `Continue the conversation. The agent just said: "${conversationHistory[conversationHistory.length - 1].content}"`;

  const response = await fetch(MODEL_CONFIG.apiEndpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model: MODEL_CONFIG.model,
      max_tokens: MODEL_CONFIG.max_tokens,
      system: systemPrompt,
      messages: [...conversationHistory, { role: 'user', content: userMessage }],
    }),
  });

  const data = await response.json();
  const customerResponse = data.content[0].text;
  logger.info('SimulationAgent', 'Customer response generated');
  return { profile, response: customerResponse };
}

export { runSimulationAgent, CUSTOMER_PROFILES };
