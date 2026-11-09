/**
 * Input sanitization utilities for query safety and ReDoS prevention.
 */

/**
 * Escapes all regular expression metacharacters in a string so it can be
 * safely used in a RegExp or MongoDB $regex query as literal text.
 * Prevents Regular Expression Denial of Service (ReDoS) and query injection.
 *
 * @param {string} string - The raw user search string.
 * @returns {string} - Escaped string safe for regex compilation.
 */
export const escapeRegex = (string) => {
  if (!string || typeof string !== 'string') return '';
  return string.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

