import { toErrorMessage } from './errors';

export interface MutationResult<T> {
  data: T | null;
  error: string | null;
}

/**
 * Runs a data mutation, normalizes any thrown error, and surfaces it through a
 * high-trust notification callback (e.g. a toast). Returns the error string too
 * so callers can render inline messaging alongside the toast.
 */
export async function withErrorNotification<T>(
  operation: () => Promise<T>,
  notifyError: (message: string) => void,
): Promise<MutationResult<T>> {
  try {
    const data = await operation();
    return { data, error: null };
  } catch (err) {
    const message = toErrorMessage(err);
    notifyError(message);
    return { data: null, error: message };
  }
}
