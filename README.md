# Prudential AI — Sales Knowledge Pipeline
### Multi-Agent Prototype · Built by Ankan Das

A working prototype of an orchestrator-driven multi-agent AI system that extracts tacit sales knowledge from top Prudential agents, validates it through multi-agent consensus evaluation, and makes it available to junior agents as an AI coaching tool.

---

## The Problem

The knowledge that converts customers lives in the heads of top agents — instincts, objection-handling techniques, timing judgements built over years. When a top agent leaves or retires, that knowledge leaves with them. Junior agents have no structured way to access it.

**This system solves the knowledge transfer problem using a RAG-based multi-agent pipeline.**

---

## Architecture Overview

```
MAIN ORCHESTRATOR
│
├── MODE A: KNOWLEDGE EXTRACTION
│   ├── RBAC Agent          → identity & access check
│   ├── Validation Agent    → input quality gate
│   ├── Transcription Agent → audio/text → raw transcript
│   ├── Chunking Agent      → semantic segmentation + metadata labelling
│   └── Embedding Agent     → vectors → knowledge base
│
├── MODE B: EVALUATION (multi-agent consensus)
│   ├── Accuracy Agent      ─┐
│   ├── Generalisability Agent ├─ independent, simultaneous
│   └── Compliance Agent    ─┘
│       │
│       ├── Full consensus → auto-approve to knowledge base
│       ├── Compliance flag → mandatory escalation (veto rule)
│       └── Partial consensus → human review queue
│
└── MODE C: TRAINING
    ├── Customer Simulation Agent (profile-specific, disposable)
    ├── Coaching Agent (KB-grounded, forced citation)
    └── Post-session Evaluation Agent
```

---

## File Structure

```
prudential-demo/
│
├── orchestrator/
│   └── orchestrator.js         Central coordinator — all pipeline logic lives here
│
├── agents/
│   ├── accuracy-agent.js       Evaluates factual accuracy of knowledge chunks
│   ├── generalise-agent.js     Evaluates generalisability across customer profiles
│   ├── compliance-agent.js     MAS/HKMA compliance review (veto power in consensus)
│   ├── chunking-agent.js       Semantic segmentation + metadata labelling
│   ├── simulation-agent.js     Customer simulation for training sessions
│   └── coaching-agent.js       Post-session coaching with KB citation enforcement
│
├── tools/
│   ├── knowledge-base.js       Vector store interface — store, retrieve, version
│   ├── logger.js               Centralised observability logging
│   ├── retry-handler.js        Error handling + exponential backoff
│   └── confidence-scorer.js    Retrieval + generation confidence assessment
│
├── skills/
│   ├── citation-enforcer.js    Shared: forces all advice to cite KB source
│   ├── chunk-formatter.js      Shared: normalises chunk metadata schema
│   └── compliance-checker.js   Shared: MAS/HKMA pattern matching pre-filter
│
├── config/
│   ├── rbac-roles.js           Role definitions + permitted pipeline modes
│   ├── chunking-strategy.js    Chunk size, overlap, boundary rules, metadata schema
│   └── model-config.js         Model settings, token limits, retry policy
│
├── knowledge-base/
│   └── synthetic-chunks.js     Seeded KB from top agent role-plays (cold start)
│
└── index.html                  Live demo UI
```

---

## Key Design Decisions

### Why RAG, not fine-tuning?
Fine-tuning modifies model weights — expensive ($10M+ at scale), slow to update, and impossible to audit. RAG stores knowledge externally and retrieves it at query time. Knowledge can be updated, versioned, and retired without touching the model. In a regulated industry, auditability is non-negotiable.

### Why an orchestrator pattern?
Narrow agents fail predictably. An orchestrator with clear responsibilities fails predictably too. When something goes wrong, there is one place to look. Distributed coordination (agents calling each other) creates circular dependencies and untraceable failures.

### Why disposable sub-agents?
Sub-agents are created fresh for each task and discarded when done. A customer simulation agent built for a 45-year-old price-sensitive customer is precisely calibrated for that profile — not a generic agent awkwardly pretending. Fresh agents for fresh contexts.

### Why simultaneous evaluation?
Sequential evaluation creates anchoring bias — the first verdict influences subsequent ones, producing false consensus. All three evaluation agents run in parallel and report independently before the orchestrator checks for consensus.

### Why is compliance a veto?
A 2/3 majority that includes a compliance pass is not sufficient in regulated financial services. One compliance flag blocks auto-approval regardless of other verdicts. This is a hard rule, not a majority vote.

---

## Failure Modes & Hallucination Risks

### Three hallucination flavours

**Retrieval hallucination** — superficially similar but contextually wrong chunks are retrieved. Mitigation: metadata pre-filtering before similarity search.

**Generation hallucination** — the coaching agent extrapolates beyond retrieved context. Mitigation: grounding constraint in system prompt + forced citation requirement.

**Evaluation hallucination** — evaluation agents approve something they lack context to properly judge. Mitigation: knowledge versioning + scheduled human review cycles.

### Key failure modes by stage
| Stage | Failure | Mitigation |
|---|---|---|
| Chunking | Boundary splits mid-objection | 2-sentence overlap between chunks |
| Embedding | Domain jargon poorly represented | Insurance-specific embeddings (production) |
| Evaluation | Correlated failure across agents | Distinct system prompts per agent |
| Human review | Reviewer fatigue → rubber stamping | Track avg review time as fatigue signal |
| Training | Simulation creates false confidence | Frame as foundation tool, not final test |

---

## Token Efficiency Levers

- **Metadata pre-filter**: filter by stage/signal before vector search → smaller candidate pool
- **Top-K retrieval**: max 3 chunks returned regardless of match count
- **Prompt auditing**: system prompts kept minimal — every token is paid on every call
- **Embedding cache**: chunks embedded once, never recomputed unless chunk changes
- **Fail-fast**: orchestrator validates input before spawning any sub-agents

---

## Prototype Scope vs Production

| Component | Prototype | Production |
|---|---|---|
| RBAC | Hardcoded mock users | SSO/OAuth identity provider |
| Transcription | Pre-written transcript | Google Speech-to-Text |
| Vector DB | In-memory array | Google Cloud Vector Search |
| Embeddings | General purpose | Insurance domain fine-tuned |
| Evaluation agents | Same model, different prompts | Different model variants |
| Feedback loop | Described — future iteration | CRM integration + outcome labelling |
| Observability | Console log | Google Cloud Logging + dashboard |
| Knowledge versioning | Status field | Full version control + audit trail |

---

## Change Management (Implementation)

### Phase 1: Knowledge seeding (top agents)
Positioning: "Help us preserve Prudential's sales culture for the next generation of agents."
Method: structured role-play sessions (not interviews — role-play removes the editing instinct).
Incentive: recognition as a knowledge contributor, early access to the tool, peer status.
Output: seeded knowledge base sufficient for cold start.

### Phase 2: Junior agent rollout
Positioning: "An AI coach that helps you close — tied directly to your commission."
Onboarding: supervised sessions with manager present for first two weeks.
Cold start requirement: seed KB must be rich enough to provide useful advice from day one.

### Phase 3: Flywheel activation (future iteration)
As junior agent interactions accumulate, outcomes are pulled from CRM system of record.
Successful interaction patterns enter the knowledge base via the same extraction + evaluation pipeline.
The system becomes self-improving without requiring ongoing top agent contribution.

### Attribution bias mitigation
Risk: agents blame AI when deals fail, credit themselves when deals close.
Mitigations:
- Rate advice relevance separately from deal outcome
- Show anonymised peer benchmarks as learning tool (not performance ranking)
- Frame AI as advisor — agent is always the decision-maker
- Track engagement drop-off as leading indicator of attribution bias taking hold

---

## Built With
- Claude claude-sonnet-4-6 (Anthropic) — all agent calls
- Vanilla JS + HTML — no framework dependencies
- GitHub Pages — deployment

---

*Prototype built to demonstrate enterprise multi-agent architecture thinking.
All data is synthetic. No real Prudential customer or agent data is used.*
