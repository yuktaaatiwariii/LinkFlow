import { randomBytes } from 'crypto';

/**
 * Base62 alphabet consisting of digits (0-9), lowercase English letters (a-z),
 * and uppercase English letters (A-Z).
 * Total 62 characters, URL-safe without encoding.
 */
export const BASE62_ALPHABET =
  '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ';

export const BASE62_RADIX = BigInt(BASE62_ALPHABET.length); // 62n

export const DEFAULT_SHORT_CODE_LENGTH = 6;

/**
 * Deterministically encodes a non-negative integer (number or BigInt) into a Base62 string.
 *
 * Requirements:
 * - Deterministic: Same input always produces the identical Base62 string.
 * - Handles 0 correctly -> returns "0".
 * - Supports large 64-bit integer values without precision loss via BigInt.
 * - Rejects negative values or invalid numbers.
 *
 * @param num Non-negative integer (number or bigint)
 * @returns Base62 encoded string
 */
export function encodeBase62(num: number | bigint): string {
  if (typeof num === 'number') {
    if (!Number.isFinite(num) || isNaN(num) || !Number.isInteger(num)) {
      throw new Error('Input must be a valid integer');
    }
    if (num < 0) {
      throw new Error('Cannot encode negative numbers to Base62');
    }
  }

  let value = BigInt(num);
  if (value < 0n) {
    throw new Error('Cannot encode negative numbers to Base62');
  }

  if (value === 0n) {
    return BASE62_ALPHABET[0]; // '0'
  }

  let encoded = '';
  while (value > 0n) {
    const remainder = Number(value % BASE62_RADIX);
    encoded = BASE62_ALPHABET[remainder] + encoded;
    value = value / BASE62_RADIX;
  }

  return encoded;
}

/**
 * Deterministically decodes a Base62 string back into a BigInt integer.
 *
 * @param code Base62 encoded string
 * @returns Decoded integer as BigInt
 */
export function decodeBase62(code: string): bigint {
  if (!code || typeof code !== 'string') {
    throw new Error('Input must be a non-empty string');
  }

  let result = 0n;
  for (let i = 0; i < code.length; i++) {
    const char = code[i];
    const index = BASE62_ALPHABET.indexOf(char);
    if (index === -1) {
      throw new Error(`Invalid Base62 character found: "${char}"`);
    }
    result = result * BASE62_RADIX + BigInt(index);
  }

  return result;
}

/**
 * Generates a cryptographically secure Base62 random short code.
 *
 * Uses Node.js crypto.randomBytes and uniform indexing against BASE62_ALPHABET.
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
