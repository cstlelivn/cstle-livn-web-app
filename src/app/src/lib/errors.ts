/**
 * Error handling utilities for Supabase operations
 */

export function failIf(error: any, context?: string) {
  if (error) {
    const message = error.message || 'Unexpected error';
    const fullMessage = context ? `${context}: ${message}` : message;
    // Only log non-network errors to avoid console spam
    if (!message.includes('Failed to fetch') && !message.includes('Network error')) {
      console.error('Database error:', fullMessage);
    }
    throw new Error(fullMessage);
  }
}

export class DatabaseError extends Error {
  constructor(message: string, public originalError?: any) {
    super(message);
    this.name = 'DatabaseError';
  }
}

export function handleSupabaseError(error: any, operation: string): never {
  const message = error.message || 'Unknown error';
  // Only log non-network errors
  if (!message.includes('Failed to fetch') && !message.includes('Network error')) {
    console.error(`Database error during ${operation}:`, message);
  }
  throw new DatabaseError(`Failed to ${operation}`, error);
}
