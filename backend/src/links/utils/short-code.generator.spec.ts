import { describe, it, expect } from '@jest/globals';
import {
  BASE62_ALPHABET,
  DEFAULT_SHORT_CODE_LENGTH,
  generateShortCode,
  isValidShortCode,
} from './short-code.generator';

describe('ShortCodeGenerator', () => {
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
