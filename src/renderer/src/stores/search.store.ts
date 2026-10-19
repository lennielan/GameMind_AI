import { create } from 'zustand'

interface SearchState {
  query: string
  isSearching: boolean
  results: { localGames: any[], storeGames: any[], isInvalidQuery?: boolean } | null
  error: string | null
  hasSearched: boolean
  
  setQuery: (query: string) => void
  setIsSearching: (isSearching: boolean) => void
  setResults: (results: { localGames: any[], storeGames: any[], isInvalidQuery?: boolean } | null) => void
  setError: (error: string | null) => void
  setHasSearched: (hasSearched: boolean) => void
}

export const useSearchStore = create<SearchState>((set) => ({
  query: '',
  isSearching: false,
  results: null,
  error: null,
  hasSearched: false,
  
  setQuery: (query) => set({ query }),
  setIsSearching: (isSearching) => set({ isSearching }),
  setResults: (results) => set({ results }),
  setError: (error) => set({ error }),
  setHasSearched: (hasSearched) => set({ hasSearched })
}))
