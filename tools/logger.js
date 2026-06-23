/**
 * Observability Logger
 * ---------------------
 * Centralised logging for all orchestrator and sub-agent activity.
 *
 * Every event is timestamped and typed. This log is the audit trail
 * for compliance purposes and the signal source for the observability
 * dashboard (production).
 *
 * Log types:
 *   INFO    — routine orchestrator decisions and handoffs
 *   SUCCESS — sub-agent completed successfully
 *   WARN    — escalation triggered, confidence below threshold
 *   ERROR   — sub-agent failed after retries
 *
 * Production: events stream to centralised logging (e.g. Google Cloud Logging).
 * Prototype: events rendered in the UI log panel in real time.
 *
 * Key metric to monitor: reviewer decision time.
 * If avg review time drops below 30s → potential fatigue signal → investigate.
 */

class Logger {
  constructor() {
    this.entries = [];
    this.listeners = [];
  }

  _log(type, source, message) {
    const entry = {
      timestamp: new Date().toISOString(),
      type,
      source,
      message,
    };
    this.entries.push(entry);
    this.listeners.forEach(fn => fn(entry));
    return entry;
  }

  info(source, message)    { return this._log('INFO',    source, message); }
  success(source, message) { return this._log('SUCCESS', source, message); }
  warn(source, message)    { return this._log('WARN',    source, message); }
  error(source, message)   { return this._log('ERROR',   source, message); }

  // Subscribe to live log entries (used by UI log panel)
  subscribe(fn) { this.listeners.push(fn); }

  getAll()   { return [...this.entries]; }
  clear()    { this.entries = []; }
}

// Singleton — shared across all agents in the pipeline
const logger = new Logger();
export { logger };
