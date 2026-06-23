/**
 * RBAC Role Definitions
 * ---------------------
 * Defines permitted pipeline modes per role.
 * In production: integrates with Prudential's identity provider (SSO/OAuth).
 * In prototype: roles are hardcoded and selected via UI.
 *
 * Enterprise note: role changes require compliance sign-off and audit logging.
 */

const ROLES = {
  SENIOR_AGENT: {
    id: 'SENIOR_AGENT',
    label: 'Senior Agent (Knowledge Contributor)',
    permittedModes: ['extract'],
    description: 'Can submit knowledge for extraction. Cannot approve or train.',
  },
  COMPLIANCE_REVIEWER: {
    id: 'COMPLIANCE_REVIEWER',
    label: 'Compliance Reviewer',
    permittedModes: ['eval'],
    description: 'Can review and approve/reject flagged knowledge chunks.',
  },
  JUNIOR_AGENT: {
    id: 'JUNIOR_AGENT',
    label: 'Junior Agent (Trainee)',
    permittedModes: ['train'],
    description: 'Can access training mode only. No access to raw knowledge base.',
  },
  ADMIN: {
    id: 'ADMIN',
    label: 'System Administrator',
    permittedModes: ['extract', 'eval', 'train'],
    description: 'Full access. Audit trail required for all actions.',
  },
};

// Prototype: mock user sessions — in production these come from the identity provider
const MOCK_USERS = {
  extract: { name: 'Sarah Tan', role: ROLES.SENIOR_AGENT },
  eval:    { name: 'David Lim', role: ROLES.COMPLIANCE_REVIEWER },
  train:   { name: 'James Wong', role: ROLES.JUNIOR_AGENT },
};

export { ROLES, MOCK_USERS };
