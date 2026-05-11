/**
 * Site Configuration
 *
 * Update these values before deploying:
 * - Calendly slug (create a 60min event type)
 * - Cloudflare Worker URL (after deploying the worker)
 */

export const SITE_CONFIG = {
  /** Your Calendly username */
  calendly: "mauriciotellezdev",

  /** Cloudflare Worker URL */
  workerUrl: "https://english-tutor-mexico-worker.mauriciotellezdev.workers.dev",
} as const;
