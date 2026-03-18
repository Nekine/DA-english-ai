
import { useState, useCallback } from 'react';
import { useToast } from '@/hooks/use-toast';

interface ApiResponse<T> {
  data: T;
  message: string;
  status: number;
  success: boolean;
}

interface UseApiOptions<T> {
  onSuccess?: (data: T) => void;
  onError?: (error: Error) => void;
  successMessage?: string;
  errorMessage?: string;
  skipToast?: boolean;
}

export function useApi<T>() {
  const [data, setData] = useState<T | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const { success, error: showError } = useToast();

  const request = useCallback(
    async <R = T>(
      apiFunction: () => Promise<R | ApiResponse<R>>,
      options?: UseApiOptions<R>
    ): Promise<R | null> => {
      setIsLoading(true);
      setError(null);

      try {
        const result = await apiFunction();

        // Check if result is an ApiResponse
        const responseData = (result as ApiResponse<R>)?.data
          ? (result as ApiResponse<R>).data
          : result as R;

        setData(responseData as unknown as T);

        if (!options?.skipToast && options?.successMessage) {
          success('Thành công', options.successMessage);
        }

        if (options?.onSuccess) {
          options.onSuccess(responseData);
        }

        return responseData;
      } catch (err) {
        const errorObject = err instanceof Error ? err : new Error('Unknown error');
        setError(errorObject);

        if (!options?.skipToast) {
          if (options?.errorMessage) {
            showError('Lỗi', options.errorMessage);
          } else {
            showError('Lỗi', errorObject.message);
          }
        }

        if (options?.onError) {
          options.onError(errorObject);
        }

        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [success, showError]
  );

  return { data, error, isLoading, request };
}
