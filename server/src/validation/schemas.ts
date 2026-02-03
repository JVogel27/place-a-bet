import { z } from 'zod';

/**
 * Input validation schemas for Place-A-Bet API
 *
 * All schemas export type inference for TypeScript type safety.
 */

// ============================================================================
// Party Schemas
// ============================================================================

export const createPartySchema = z.object({
  name: z.string().min(1, 'Party name is required').max(100, 'Party name must be 100 characters or less'),
  date: z.string().datetime('Invalid date format'),
  description: z.string().max(500, 'Description must be 500 characters or less').optional(),
  hostPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits')
});

export type CreatePartyInput = z.infer<typeof createPartySchema>;

// ============================================================================
// Bet Schemas
// ============================================================================

export const createBetSchema = z.object({
  type: z.enum(['yes_no', 'multi_option'], {
    errorMap: () => ({ message: 'Bet type must be "yes_no" or "multi_option"' })
  }),
  question: z.string().min(1, 'Question is required').max(500, 'Question must be 500 characters or less'),
  createdBy: z.string().min(1, 'Creator name is required').max(50, 'Creator name must be 50 characters or less'),
  options: z.array(
    z.string().min(1, 'Option label cannot be empty').max(100, 'Option label must be 100 characters or less')
  )
    .min(2, 'At least 2 options are required')
    .max(10, 'Maximum 10 options allowed')
});

export type CreateBetInput = z.infer<typeof createBetSchema>;

export const closeBetSchema = z.object({
  hostPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits').optional()
});

export type CloseBetInput = z.infer<typeof closeBetSchema>;

export const settleBetSchema = z.object({
  winningOptionId: z.number().int('Winning option ID must be an integer').positive('Winning option ID must be positive'),
  hostPin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits').optional()
});

export type SettleBetInput = z.infer<typeof settleBetSchema>;

// ============================================================================
// Wager Schemas
// ============================================================================

export const createWagerSchema = z.object({
  userName: z.string().min(1, 'User name is required').max(50, 'User name must be 50 characters or less'),
  optionId: z.number().int('Option ID must be an integer').positive('Option ID must be positive'),
  amount: z.number()
    .int('Amount must be whole dollars (no cents)')
    .positive('Amount must be greater than 0')
    .max(10000, 'Amount cannot exceed $10,000')
});

export type CreateWagerInput = z.infer<typeof createWagerSchema>;

// ============================================================================
// Host PIN Verification Schema
// ============================================================================

export const verifyPinSchema = z.object({
  pin: z.string().length(4, 'PIN must be exactly 4 digits').regex(/^\d{4}$/, 'PIN must contain only digits')
});

export type VerifyPinInput = z.infer<typeof verifyPinSchema>;

// ============================================================================
// Query Parameter Schemas
// ============================================================================

export const betStatusFilterSchema = z.enum(['open', 'closed', 'settled']).optional();

export type BetStatusFilter = z.infer<typeof betStatusFilterSchema>;

// ============================================================================
// Helper function to format Zod validation errors
// ============================================================================

export function formatZodError(error: z.ZodError): string[] {
  return error.errors.map(err => {
    const path = err.path.length > 0 ? `${err.path.join('.')}: ` : '';
    return `${path}${err.message}`;
  });
}
