// The roadmap and feature requests, shared by the roadmap page's tabs, and whether you can manage them.
export function useRoadmap() {
  const { user } = useUserSession()
  const staff = computed(() => user.value?.permissions?.includes('roadmap.manage') ?? false)
  const items = useFetch<RoadmapItem[]>('/api/roadmap', { key: 'roadmap', default: () => [] })
  const requests = useFetch<FeatureRequest[]>('/api/requests', { key: 'feature-requests', default: () => [] })
  return { staff, items, requests }
}

export const scopeLabel = (scope: RoadmapScope) => ROADMAP_SCOPES.find((s) => s.value === scope)?.label ?? scope
// A tint per scope, so cards can be told apart at a glance.
export const SCOPE_TINT: Record<RoadmapScope, string> = {
  run8: 'bg-rose-500/15 text-rose-700 dark:text-rose-300',
  railroader: 'bg-violet-500/15 text-violet-700 dark:text-violet-300',
  dashboard: 'bg-muted text-muted-foreground'
}

export const errorText = (err: any) => err?.data?.statusMessage ?? 'Try again.'
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'long', day: 'numeric' })
