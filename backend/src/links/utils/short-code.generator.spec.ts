import { describe, it, expect } from '@jest/globals';
import {
  BASE62_ALPHABET,
  DEFAULT_SHORT_CODE_LENGTH,
  decodeBase62,
  encodeBase62,
  generateShortCode,
  isValidShortCode,
} from './short-code.generator';

describe('ShortCodeGenerator', () => {
  describe('encodeBase62 & decodeBase62', () => {
    it('should correctly encode zero to "0"', () => {
      expect(encodeBase62(0)).toBe('0');
      expect(encodeBase62(0n)).toBe('0');
      expect(decodeBase62('0')).toBe(0n);
    });

    it('should correctly encode boundary values within single-character range (0-61)', () => {
      expect(encodeBase62(1)).toBe('1');
      expect(encodeBase62(9)).toBe('9');
      expect(encodeBase62(10)).toBe('a');
      expect(encodeBase62(35)).toBe('z');
      expect(encodeBase62(36)).toBe('A');
      expect(encodeBase62(61)).toBe('Z');

      expect(decodeBase62('Z')).toBe(61n);
      expect(decodeBase62('a')).toBe(10n);
    });

    it('should correctly encode multi-digit transition boundary values (62, 63, 3844)', () => {
      // 62 is 1 * 62 + 0 -> "10"
      expect(encodeBase62(62)).toBe('10');
      expect(decodeBase62('10')).toBe(62n);

      expect(encodeBase62(63)).toBe('11');
      expect(decodeBase62('11')).toBe(63n);

      // 62^2 = 3844 -> "100"
      expect(encodeBase62(3844)).toBe('100');
      expect(decodeBase62('100')).toBe(3844n);
    });

    it('should be strictly deterministic for repeated calls with identical input', () => {
      const testVal = 123456789;
      const first = encodeBase62(testVal);
      const second = encodeBase62(testVal);
      const third = encodeBase62(testVal);

      expect(first).toBe(second);
      expect(second).toBe(third);
      expect(decodeBase62(first)).toBe(BigInt(testVal));
    });

    it('should encode large 64-bit integer values without precision loss', () => {
      const maxSafeInt = BigInt(Number.MAX_SAFE_INTEGER); // 9007199254740991
      const encodedMaxSafe = encodeBase62(maxSafeInt);
      expect(decodeBase62(encodedMaxSafe)).toBe(maxSafeInt);

      // 64-bit unsigned max: 18446744073709551615n
      const uint64Max = 18446744073709551615n;
      const encodedUint64 = encodeBase62(uint64Max);
      expect(typeof encodedUint64).toBe('string');
      for (const char of encodedUint64) {
        expect(BASE62_ALPHABET.includes(char)).toBe(true);
      }
      expect(decodeBase62(encodedUint64)).toBe(uint64Max);
    });

    it('should reject negative values and invalid inputs', () => {
      expect(() => encodeBase62(-1)).toThrow('Cannot encode negative numbers');
      expect(() => encodeBase62(-100n)).toThrow('Cannot encode negative numbers');
      expect(() => encodeBase62(NaN)).toThrow('Input must be a valid integer');
      expect(() => encodeBase62(3.1415)).toThrow('Input must be a valid integer');
    });

    it('should reject invalid characters during decoding', () => {
      expect(() => decodeBase62('')).toThrow('Input must be a non-empty string');
      expect(() => decodeBase62('abc-123')).toThrow('Invalid Base62 character');
      expect(() => decodeBase62('abc 123')).toThrow('Invalid Base62 character');
      expect(() => decodeBase62('abc_123')).toThrow('Invalid Base62 character');
    });
  });

  describe('generateShortCode', () => {
    it('should generate a short code with default length of 6', () => {
      const code = generateShortCode();
      expect(code).toBeDefined();
      expect(typeof code).toBe('string');
      expect(code.length).toBe(DEFAULT_SHORT_CODE_LENGTH);
    });

    it('should generate a short code with custom specified length', () => {
      const lengths = [1, 4, 7, 10, 16];
      for (const length of lengths) {
        const code = generateShortCode(length);
        expect(code.length).toBe(length);
      }
    });

    it('should contain only characters from the Base62 alphabet', () => {
      for (let i = 0; i < 50; i++) {
        const code = generateShortCode(8);
        for (const char of code) {
          expect(BASE62_ALPHABET.includes(char)).toBe(true);
        }
      }
    });

    it('should generate distinct codes across successive calls', () => {
      const generatedSet = new Set<string>();
      const iterations = 100;

      for (let i = 0; i < iterations; i++) {
        generatedSet.add(generateShortCode());
      }

      // With 62^6 combinations, 100 codes should be entirely distinct
      expect(generatedSet.size).toBe(iterations);
    });

    it('should throw an error if requested length is 0 or negative', () => {
      expect(() => generateShortCode(0)).toThrow(
        'Short code length must be greater than 0',
      );
      expect(() => generateShortCode(-5)).toThrow(
        'Short code length must be greater than 0',
      );
    });
  });

  describe('isValidShortCode', () => {
    it('should return true for valid Base62 alphanumeric codes', () => {
      expect(isValidShortCode('aB31xZ')).toBe(true);
      expect(isValidShortCode('0')).toBe(true);
      expect(isValidShortCode('abcdef')).toBe(true);
      expect(isValidShortCode('ABCDEF')).toBe(true);
      expect(isValidShortCode('123456')).toBe(true);
    });

    it('should return false for strings containing special characters or whitespace', () => {
      expect(isValidShortCode('aB3-xZ')).toBe(false);
      expect(isValidShortCode('aB3_xZ')).toBe(false);
      expect(isValidShortCode('aB3 xZ')).toBe(false);
      expect(isValidShortCode('aB3.xZ')).toBe(false);
      expect(isValidShortCode('aB3/xZ')).toBe(false);
    });

    it('should return false for empty or non-string inputs', () => {
      expect(isValidShortCode('')).toBe(false);
      expect(isValidShortCode(null as unknown as string)).toBe(false);
      expect(isValidShortCode(undefined as unknown as string)).toBe(false);
    });
  });
});
