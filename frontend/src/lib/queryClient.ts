import { QueryClient } from '@tanstack/react-query';

// Both ApiError and AxiosError carry an HTTP status; a network failure has none
function statusOf(error: unknown): number | undefined {
  return (error as { status?: number } | null)?.status;
}

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 30_000, // data counts as fresh for 30 s, so switching pages doesn't refetch
      // Retry once for server or network failures; never for 4xx, which won't fix itself
      retry: (failureCount, error) => {
        const status = statusOf(error);
        return (status === undefined || status >= 500) && failureCount < 1;
      },
    },
  },
});
