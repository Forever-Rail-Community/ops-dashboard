import type { Component } from 'vue'
import { toast } from 'vue-sonner'
import { BookOpen, LayoutDashboard, Map, Route, TrainFront } from '@lucide/vue'

// The roadmap and feature requests, shared by the Roadmap and Feature requests pages, and whether you can manage them.
export function useRoadmap() {
  const { user } = useUserSession()
  const staff = computed(() => user.value?.permissions?.includes('roadmap.manage') ?? false)
  const items = useFetch<RoadmapItem[]>('/api/roadmap', { key: 'roadmap', default: () => [] })
  const requests = useFetch<FeatureRequest[]>('/api/requests', { key: 'feature-requests', default: () => [] })
  const refreshAll = () => Promise.all([items.refresh(), requests.refresh()])
  return { staff, items, requests, refreshAll }
}

// The filters under the top bar. Kept while moving between the Roadmap and Feature requests.
export function useRoadmapFilters() {
  const scope = useState<RoadmapScope | 'all'>('roadmap-scope', () => 'all')
  const bugFixesOnly = useState('roadmap-bug-fixes', () => false)
  const query = useState('roadmap-query', () => '')
  const matchesQuery = (text: string) => {
    const q = query.value.trim().toLowerCase()
    return !q || text.toLowerCase().includes(q)
  }
  return { scope, bugFixesOnly, query, matchesQuery }
}

// Votes belong to feature requests; a roadmap item that came from one shows (and takes) the request's votes.
export async function voteForRequest(requestId: number, on: boolean) {
  try {
    await $fetch(`/api/requests/${requestId}/vote`, { method: 'POST', body: { vote: on } })
    return true
  } catch (err) {
    toast.error('Vote not saved', { description: errorText(err) })
    return false
  }
}

export const scopeLabel = (scope: RoadmapScope) => ROADMAP_SCOPES.find((s) => s.value === scope)?.label ?? scope
export const SCOPE_ICON: Record<RoadmapScope, Component> = {
  dashboard: LayoutDashboard,
  railroader: TrainFront,
  run8: Route,
  map: Map,
  help: BookOpen
}

export const columnLabel = (status: RoadmapStatus) => ROADMAP_COLUMNS.find((c) => c.value === status)?.label ?? status
export const errorText = (err: any) => err?.data?.statusMessage ?? 'Try again.'
export const shortDate = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })
