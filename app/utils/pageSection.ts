import type { InjectionKey } from 'vue'

// A PageSection with a row height hands it to each PageRow inside, so every row is the same height.
export const PAGE_ROW_HEIGHT: InjectionKey<number> = Symbol('page section row height')
