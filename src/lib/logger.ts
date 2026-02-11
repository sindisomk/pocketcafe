/**
 * Dev-only logger to avoid console noise in production.
 * Use for debug/trace; keep console.error for real errors where appropriate.
 */
const isDev = import.meta.env.DEV;

export function devLog(...args: unknown[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.log(...args);
  }
}

export function devWarn(...args: unknown[]) {
  if (isDev) {
    // eslint-disable-next-line no-console
    console.warn(...args);
  }
}
