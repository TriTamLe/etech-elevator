import { MutationCache, QueryCache, QueryClient } from '@tanstack/react-query'

// Failed requests are logged once here (the UI shows errorMessage()'s Vietnamese text,
// which hides technical details).
const log = (error: unknown) => console.error(error)

export function getContext() {
  const queryClient = new QueryClient({
    queryCache: new QueryCache({ onError: log }),
    mutationCache: new MutationCache({ onError: log }),
  })

  return {
    queryClient,
  }
}
