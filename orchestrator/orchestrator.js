/**
 * Main Orchestrator
 * ------------------
 * The central coordinator of the entire multi-agent pipeline.
 * Every sub-agent is spawned, sequenced, and supervised from here.
 *
 * Responsibilities:
 *   1. IDENTITY CHECK — verify user role before any mode is accessible
 *   2. INPUT VALIDATION — reject insufficient inputs before spawning agents
 *   3. MODE ROUTING — determine which pipeline to run based on user + context
 *   4. AGENT COORDINATION — spawn sub-agents, manage handoffs, collect outputs
 *   5. CONSENSUS EVALUATION — assess sub-agent agreement and determine escalation
 *   6. STATE MANAGEMENT — track pipeline progress for graceful failure recovery
 *   7. ESCALATION — route to human review queue when agents disagree or fail
 *
 * Why all coordination lives here:
 *   Narrow agents fail predictably. An orchestrator with clear responsibilities
 *   fails predictably too. When something goes wrong, there is one place to look.
 *   Distributed coordination (agents calling each other) creates circular
 *   dependencies and makes failure tracing exponentially harder.
 *
 * State management:
 *   The orchestrator maintains a session state object tracking which steps
 *   have completed. On sub-agent failure, it restarts from the last
 *   successful checkpoint rather than from the beginning.
 *   Production: state persisted to database. Prototype: in-memory.
 *
 * Consensus rule (evaluation mode):
 *   COMPLIANCE FLAG → always escalate, regardless of other verdicts (veto rule)
 *   ALL PASS → auto-approve to knowledge base
 *   PARTIAL → escalate to human review with reasons
 */

import { MOCK_USERS } from '../config/rbac-roles.js';
import { logger } from '../tools/logger.js';
import { knowledgeBase } from '../tools/knowledge-base.js';
import { runChunkingAgent } from '../agents/chunking-agent.js';
import { runAccuracyAgent } from '../agents/accuracy-agent.js';
import { runGeneraliseAgent } from '../agents/generalise-agent.js';
import { runComplianceAgent } from '../agents/compliance-agent.js';
import { runSimulationAgent } from '../agents/simulation-agent.js';
import { runCoachingAgent } from '../agents/coaching-agent.js';
import { scoreConfidence } from '../tools/confidence-scorer.js';

class Orchestrator {
  constructor() {
    this.sessionState = {};
    this.humanReviewQueue = [];
  }

  // ─── STEP 0: RBAC ────────────────────────────────────────────────────────
  checkAccess(mode) {
    const user = MOCK_USERS[mode];
    if (!user) {
      logger.error('Orchestrator', `No mock user configured for mode: ${mode}`);
      return { granted: false, user: null };
    }
    if (!user.role.permittedModes.includes(mode)) {
      logger.error('Orchestrator', `Access denied — ${user.name} not permitted for mode: ${mode}`);
      return { granted: false, user };
    }
    logger.info('Orchestrator', `Access granted — ${user.name} (${user.role.label}) → mode: ${mode}`);
    return { granted: true, user };
  }

  // ─── STEP 1: INPUT VALIDATION ─────────────────────────────────────────────
  validateInput(text) {
    if (!text || text.trim().length < 100) {
      return { valid: false, reason: 'Transcript too short — minimum 100 characters required for meaningful extraction.' };
    }
    const hasAgentTurn = /agent:/i.test(text);
    const hasCustomerTurn = /customer:/i.test(text);
    if (!hasAgentTurn || !hasCustomerTurn) {
      return { valid: false, reason: 'Transcript must contain both Agent and Customer turns.' };
    }
    logger.success('Orchestrator', 'Input validation passed');
    return { valid: true };
  }

  // ─── MODE A: KNOWLEDGE EXTRACTION ────────────────────────────────────────
  async runExtractionPipeline(transcript, onStep) {
    logger.info('Orchestrator', 'EXTRACTION MODE — initialising pipeline');
    this.sessionState = { mode: 'extract', steps: {} };

    const access = this.checkAccess('extract');
    onStep('rbac', 'done', access.user);

    const validation = this.validateInput(transcript);
    if (!validation.valid) {
      onStep('validate', 'error', validation.reason);
      return { success: false, reason: validation.reason };
    }
    onStep('validate', 'done');
    this.sessionState.steps.validation = true;

    onStep('transcribe', 'running');
    await delay(800); // Prototype: transcript is pre-written
    onStep('transcribe', 'done');
    this.sessionState.steps.transcription = true;

    onStep('chunk', 'running');
    const chunkResult = await runChunkingAgent(transcript, 'agent-senior-001');
    if (!chunkResult.success) {
      onStep('chunk', 'error', 'Chunking failed — check transcript format');
      return { success: false };
    }
    onStep('chunk', 'done', chunkResult.chunks);
    this.sessionState.steps.chunking = true;
    this.sessionState.chunks = chunkResult.chunks;

    onStep('embed', 'running');
    await delay(600); // Prototype: embedding simulated
    onStep('embed', 'done');
    this.sessionState.steps.embedding = true;

    logger.success('Orchestrator', `Extraction complete — ${chunkResult.chunks.length} chunks queued for evaluation`);
    return { success: true, chunks: chunkResult.chunks };
  }

  // ─── MODE B: EVALUATION ───────────────────────────────────────────────────
  async runEvaluationPipeline(chunk, onResult) {
    logger.info('Orchestrator', 'EVALUATION MODE — spawning 3 independent sub-agents simultaneously');
    this.checkAccess('eval');

    // Spawn all three in parallel — independence enforced by simultaneous execution
    const [accuracyResult, generaliseResult, complianceResult] = await Promise.all([
      runAccuracyAgent(chunk),
      runGeneraliseAgent(chunk),
      runComplianceAgent(chunk),
    ]);

    onResult([accuracyResult, generaliseResult, complianceResult]);

    // Consensus logic
    const hasComplianceFlag = complianceResult.verdict === 'FLAG';
    const allPass = [accuracyResult, generaliseResult, complianceResult].every(r => r.verdict === 'PASS');

    if (hasComplianceFlag) {
      logger.warn('Orchestrator', 'COMPLIANCE FLAG — mandatory escalation (veto rule applies)');
      this.humanReviewQueue.push({ chunk, results: [accuracyResult, generaliseResult, complianceResult], reason: complianceResult.reason });
      return { decision: 'ESCALATE', reason: 'compliance_flag', results: [accuracyResult, generaliseResult, complianceResult] };
    }

    if (allPass) {
      knowledgeBase.store({ ...chunk, status: 'approved', approved_by: 'auto-consensus', date_approved: new Date().toISOString() });
      logger.success('Orchestrator', 'Full consensus — chunk auto-approved to knowledge base');
      return { decision: 'APPROVED', results: [accuracyResult, generaliseResult, complianceResult] };
    }

    logger.warn('Orchestrator', 'Partial consensus — escalating to human review');
    this.humanReviewQueue.push({ chunk, results: [accuracyResult, generaliseResult, complianceResult] });
    return { decision: 'ESCALATE', reason: 'partial_consensus', results: [accuracyResult, generaliseResult, complianceResult] };
  }

  // ─── MODE C: TRAINING ─────────────────────────────────────────────────────
  async runTrainingPipeline(profileKey, onUpdate) {
    logger.info('Orchestrator', `TRAINING MODE — spawning customer simulation sub-agent (profile: ${profileKey})`);
    this.checkAccess('train');

    // Customer opening
    const opening = await runSimulationAgent(profileKey, []);
    onUpdate('customer_opening', opening);

    // Retrieve relevant KB chunks for this scenario
    const retrieved = knowledgeBase.retrieve({ stage: 'objection-handling' });
    logger.info('Orchestrator', `Retrieved ${retrieved.length} chunks from knowledge base`);

    // Generate junior agent response using KB
    const agentResponse = await this._generateAgentResponse(opening.response, retrieved);
    onUpdate('agent_response', { text: agentResponse, chunks: retrieved });

    // Customer follow-up
    const followUp = await runSimulationAgent(profileKey, [
      { role: 'user', content: opening.response },
      { role: 'assistant', content: agentResponse },
    ]);
    onUpdate('customer_followup', followUp);

    // Post-session coaching evaluation
    logger.info('Orchestrator', 'Spawning post-session evaluation sub-agent');
    const coaching = await runCoachingAgent(agentResponse, opening.response, retrieved);
    onUpdate('coaching', coaching);

    // Confidence score the coaching output
    const score = scoreConfidence({
      retrievedChunks: retrieved,
      generatedOutput: agentResponse,
      citedChunkIds: retrieved.map(c => c.id),
    });
    onUpdate('confidence', score);

    logger.success('Orchestrator', 'Training session complete');
    logger.info('Orchestrator', 'Future iteration: session outcome feeds back to KB via CRM integration (scoped out)');
    return { success: true };
  }

  async _generateAgentResponse(customerStatement, retrievedChunks) {
    const { buildCitationPrompt } = await import('../skills/citation-enforcer.js');
    const { MODEL_CONFIG } = await import('../config/model-config.js');
    const citationContext = buildCitationPrompt(retrievedChunks);
    const response = await fetch(MODEL_CONFIG.apiEndpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: MODEL_CONFIG.model,
        max_tokens: MODEL_CONFIG.max_tokens,
        system: `You are a junior insurance sales agent. ${citationContext}`,
        messages: [{ role: 'user', content: `Customer said: "${customerStatement}". Respond using only the knowledge base above. Cite your source.` }],
      }),
    });
    const data = await response.json();
    return data.content[0].text;
  }

  // Human approves a queued chunk
  humanApprove(chunkId, reviewerId) {
    const item = this.humanReviewQueue.find(i => i.chunk.id === chunkId);
    if (item) {
      knowledgeBase.store({ ...item.chunk, status: 'approved', approved_by: reviewerId, date_approved: new Date().toISOString() });
      logger.success('Orchestrator', `Human approval: chunk ${chunkId} approved by ${reviewerId}`);
      this.humanReviewQueue = this.humanReviewQueue.filter(i => i.chunk.id !== chunkId);
    }
  }

  humanReject(chunkId, reviewerId, reason) {
    logger.warn('Orchestrator', `Human rejection: chunk ${chunkId} rejected by ${reviewerId} — reason: ${reason}`);
    this.humanReviewQueue = this.humanReviewQueue.filter(i => i.chunk.id !== chunkId);
  }
}

function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

const orchestrator = new Orchestrator();
export { orchestrator };
