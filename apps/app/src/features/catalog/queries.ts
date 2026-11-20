import { useQuery } from '@tanstack/react-query'
import { catalogApi } from '@/lib/api/endpoints'

export const catalogKeys = {
  categories: ['catalog', 'categories'] as const,
  bestSellers: (slug: string) => ['catalog', 'best-sellers', slug] as const,
  search: (q: string, page: number) => ['catalog', 'search', q, page] as const,
}

/** The 28 categories are a fixed list: cache them for the whole visit. */
export function useCategories() {
  return useQuery({
    queryKey: catalogKeys.categories,
    queryFn: catalogApi.categories,
    staleTime: Infinity,
  })
}

/** Categories shown on the home page. */
export const FEATURED_CATEGORIES = [
  'computers',
  'phones',
  'video-games',
  'electronics',
  'appliances',
  'home-and-garden',
]
