import type { InjectionKey } from 'vue'

// A PageSection with a row height hands it to each PageRow inside, so every row is the same height.
export const PAGE_ROW_HEIGHT: InjectionKey<number> = Symbol('page section row height')

// What a PagePill's color means: green for good or done, amber for needs attention, red for a problem or "no",
// blue for new or under review, violet for highlights, gray for neutral.
export type PillTone = 'green' | 'amber' | 'red' | 'blue' | 'violet' | 'gray'
