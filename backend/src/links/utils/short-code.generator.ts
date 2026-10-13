import { randomBytes } from 'crypto';

/**
 * Base62 alphabet consisting of digits (0-9), lowercase English letters (a-z),
 * and uppercase English letters (A-Z).
 * Total 62 characters, URL-safe without encoding.
 */
export const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const DEFAULT_SHORT_CODE_LENGTH = 6;

/**
 * Generates a cryptographically secure Base62 random short code.
 *
 * Uses Node.js crypto.randomBytes and uniform modulo indexing.
 * With length = 6 and 62 possible characters, there are 62^6 = ~56.8 billion combinations.
 *
 * @param length Desired length of the short code (defaults to 6)
 * @returns Base62 encoded string of the specified length
 */
export function generateShortCode(length: number = DEFAULT_SHORT_CODE_LENGTH): string {
  if (length <= 0) {
    throw new Error('Short code length must be greater than 0');
  }

  const bytes = randomBytes(length);
  const alphabetLength = BASE62_ALPHABET.length;
  let code = '';

  for (let i = 0; i < length; i++) {
    const byte = bytes[i];
    code += BASE62_ALPHABET[byte % alphabetLength];
  }

  return code;
}

/**
 * Validates whether a candidate string is a valid Base62 short code.
 */
export function isValidShortCode(code: string): boolean {
  if (!code || typeof code !== 'string') {
    return false;
  }
  return /^[0-9a-zA-Z]+$/.test(code);
}
