/**
 * JWT Token Refresh Utility
 * 
 * Provides centralized token refresh logic with automatic retry
 * for handling expired JWT tokens in Supabase queries.
 */

import { createClient } from '../../utils/supabase/client.tsx';

const supabase = createClient();

/**
 * Checks if an error is a JWT expiration error
 */
export function isJWTExpiredError(error: any): boolean {
  if (!error || !error.message) return false;
  
  const message = error.message.toLowerCase();
  return (
    message.includes('jwt expired') || 
    message.includes('session expired') || 
    message.includes('invalid jwt') ||
    (message.includes('invalid') && message.includes('token'))
  );
}

/**
 * Refreshes the JWT token and retries a function
 * 
 * @param fn - The function to retry after token refresh
 * @param context - Context string for logging (e.g., "fetch clients")
 * @returns The result of the retried function
 */
export async function refreshAndRetry<T>(
  fn: () => Promise<T>,
  context: string = 'operation'
): Promise<T> {
  console.warn(`⚠️ JWT expired (${context}) - attempting token refresh`);
  
  try {
    const { data, error: refreshError } = await supabase.auth.refreshSession();
    
    if (refreshError || !data?.session) {
      console.error('❌ Token refresh failed:', refreshError?.message || 'No session returned');
      
      // Token can't be refreshed - force logout
      await supabase.auth.signOut();
      window.location.href = '/';
      throw new Error('Session expired. Please log in again.');
    }
    
    console.log(`✅ Token refreshed successfully - retrying ${context}`);
    
    // Add a small delay to ensure new token is ready
    await new Promise(resolve => setTimeout(resolve, 100));
    
    // Retry the operation with fresh token
    return await fn();
  } catch (error: any) {
    console.error('❌ Refresh and retry failed:', error);
    
    // Don't redirect on network errors - just throw
    if (error.message?.includes('fetch') || error.message?.includes('network')) {
      throw new Error(`Network error during ${context}. Please check your connection.`);
    }
    
    throw error;
  }
}

/**
 * Wraps a Supabase query with automatic JWT refresh on expiration
 * 
 * Usage:
 * ```typescript
 * const { data, error } = await withJWTRefresh(
 *   () => supabase.from('clients').select('*'),
 *   'fetch clients'
 * );
 * ```
 */
export async function withJWTRefresh<T>(
  queryFn: () => Promise<{ data: T | null; error: any }>,
  context: string = 'query'
): Promise<{ data: T | null; error: any }> {
  try {
    // First attempt
    const result = await queryFn();
    
    // If JWT expired, refresh and retry ONCE
    if (result.error && isJWTExpiredError(result.error)) {
      console.warn(`⚠️ JWT expired (${context}) - attempting token refresh`);
      
      const { data: refreshData, error: refreshError } = await supabase.auth.refreshSession();
      
      if (refreshError || !refreshData?.session) {
        console.error('❌ Token refresh failed:', refreshError?.message || 'No session returned');
        // Return the error instead of throwing
        return {
          data: null,
          error: new Error('Session expired. Please log in again.')
        };
      }
      
      console.log(`✅ Token refreshed successfully - retrying ${context}`);
      
      // Add small delay to ensure token is propagated
      await new Promise(resolve => setTimeout(resolve, 100));
      
      // Retry the query with fresh token
      return await queryFn();
    }
    
    return result;
  } catch (error: any) {
    console.error(`❌ Error in ${context}:`, error);
    
    // Return error in Supabase format
    return {
      data: null,
      error: error
    };
  }
}