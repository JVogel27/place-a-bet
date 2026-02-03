import { describe, it, expect } from 'vitest';
import {
  createPartySchema,
  createBetSchema,
  createWagerSchema,
  settleBetSchema,
  verifyPinSchema,
  closeBetSchema,
  formatZodError
} from '../schemas';

describe('Validation Schemas', () => {
  describe('createPartySchema', () => {
    it('should accept valid party data', () => {
      const validData = {
        name: 'Super Bowl 2026',
        date: '2026-02-01T18:00:00Z',
        description: 'Annual Super Bowl party',
        hostPin: '1234'
      };

      const result = createPartySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept party without description', () => {
      const validData = {
        name: 'Game Night',
        date: '2026-03-15T19:00:00Z',
        hostPin: '9876'
      };

      const result = createPartySchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty name', () => {
      const invalidData = {
        name: '',
        date: '2026-02-01T18:00:00Z',
        hostPin: '1234'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject name over 100 characters', () => {
      const invalidData = {
        name: 'a'.repeat(101),
        date: '2026-02-01T18:00:00Z',
        hostPin: '1234'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid date format', () => {
      const invalidData = {
        name: 'Party',
        date: '2026-02-01',
        hostPin: '1234'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PIN that is not 4 digits', () => {
      const invalidData = {
        name: 'Party',
        date: '2026-02-01T18:00:00Z',
        hostPin: '123'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PIN with non-numeric characters', () => {
      const invalidData = {
        name: 'Party',
        date: '2026-02-01T18:00:00Z',
        hostPin: 'abcd'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject description over 500 characters', () => {
      const invalidData = {
        name: 'Party',
        date: '2026-02-01T18:00:00Z',
        description: 'a'.repeat(501),
        hostPin: '1234'
      };

      const result = createPartySchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createBetSchema', () => {
    it('should accept valid yes/no bet', () => {
      const validData = {
        type: 'yes_no' as const,
        question: 'Will there be overtime?',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      const result = createBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept valid multi-option bet', () => {
      const validData = {
        type: 'multi_option' as const,
        question: 'Which team wins?',
        createdBy: 'Bob',
        options: ['Chiefs', 'Eagles', 'Tie']
      };

      const result = createBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid bet type', () => {
      const invalidData = {
        type: 'invalid',
        question: 'Question?',
        createdBy: 'Alice',
        options: ['A', 'B']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty question', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: '',
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject question over 500 characters', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'a'.repeat(501),
        createdBy: 'Alice',
        options: ['Yes', 'No']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty creator name', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'Question?',
        createdBy: '',
        options: ['Yes', 'No']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject creator name over 50 characters', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'Question?',
        createdBy: 'a'.repeat(51),
        options: ['Yes', 'No']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject less than 2 options', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'Question?',
        createdBy: 'Alice',
        options: ['Only One']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject more than 10 options', () => {
      const invalidData = {
        type: 'multi_option' as const,
        question: 'Question?',
        createdBy: 'Alice',
        options: Array(11).fill('Option')
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject empty option labels', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'Question?',
        createdBy: 'Alice',
        options: ['Yes', '']
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject option labels over 100 characters', () => {
      const invalidData = {
        type: 'yes_no' as const,
        question: 'Question?',
        createdBy: 'Alice',
        options: ['Yes', 'a'.repeat(101)]
      };

      const result = createBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('createWagerSchema', () => {
    it('should accept valid wager', () => {
      const validData = {
        userName: 'Alice',
        optionId: 1,
        amount: 25
      };

      const result = createWagerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject empty user name', () => {
      const invalidData = {
        userName: '',
        optionId: 1,
        amount: 25
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject user name over 50 characters', () => {
      const invalidData = {
        userName: 'a'.repeat(51),
        optionId: 1,
        amount: 25
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject non-integer option ID', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 1.5,
        amount: 25
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative option ID', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: -1,
        amount: 25
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero option ID', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 0,
        amount: 25
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject decimal amounts (must be whole dollars)', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 1,
        amount: 25.50
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero amount', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 1,
        amount: 0
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative amount', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 1,
        amount: -10
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject amount over $10,000', () => {
      const invalidData = {
        userName: 'Alice',
        optionId: 1,
        amount: 10001
      };

      const result = createWagerSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should accept max amount of $10,000', () => {
      const validData = {
        userName: 'Alice',
        optionId: 1,
        amount: 10000
      };

      const result = createWagerSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });
  });

  describe('settleBetSchema', () => {
    it('should accept valid settlement data', () => {
      const validData = {
        winningOptionId: 1,
        hostPin: '1234'
      };

      const result = settleBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept settlement without PIN (for creator)', () => {
      const validData = {
        winningOptionId: 1
      };

      const result = settleBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject non-integer winning option ID', () => {
      const invalidData = {
        winningOptionId: 1.5,
        hostPin: '1234'
      };

      const result = settleBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject negative winning option ID', () => {
      const invalidData = {
        winningOptionId: -1,
        hostPin: '1234'
      };

      const result = settleBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject zero winning option ID', () => {
      const invalidData = {
        winningOptionId: 0,
        hostPin: '1234'
      };

      const result = settleBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject invalid PIN format', () => {
      const invalidData = {
        winningOptionId: 1,
        hostPin: '123'
      };

      const result = settleBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('closeBetSchema', () => {
    it('should accept valid close data with PIN', () => {
      const validData = {
        hostPin: '1234'
      };

      const result = closeBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept empty object (for creator)', () => {
      const validData = {};

      const result = closeBetSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject invalid PIN format', () => {
      const invalidData = {
        hostPin: 'abcd'
      };

      const result = closeBetSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('verifyPinSchema', () => {
    it('should accept valid 4-digit PIN', () => {
      const validData = { pin: '1234' };
      const result = verifyPinSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should accept PIN with leading zeros', () => {
      const validData = { pin: '0001' };
      const result = verifyPinSchema.safeParse(validData);
      expect(result.success).toBe(true);
    });

    it('should reject 3-digit PIN', () => {
      const invalidData = { pin: '123' };
      const result = verifyPinSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject 5-digit PIN', () => {
      const invalidData = { pin: '12345' };
      const result = verifyPinSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PIN with letters', () => {
      const invalidData = { pin: 'abcd' };
      const result = verifyPinSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });

    it('should reject PIN with special characters', () => {
      const invalidData = { pin: '12#4' };
      const result = verifyPinSchema.safeParse(invalidData);
      expect(result.success).toBe(false);
    });
  });

  describe('formatZodError', () => {
    it('should format validation errors with paths', () => {
      const result = createWagerSchema.safeParse({
        userName: '',
        optionId: -1,
        amount: 0
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted.length).toBeGreaterThan(0);
        expect(formatted[0]).toContain('User name is required');
      }
    });

    it('should format nested path errors', () => {
      const result = createBetSchema.safeParse({
        type: 'yes_no',
        question: 'Q?',
        createdBy: 'Alice',
        options: ['']
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        const formatted = formatZodError(result.error);
        expect(formatted.some(err => err.includes('options'))).toBe(true);
      }
    });
  });
});
