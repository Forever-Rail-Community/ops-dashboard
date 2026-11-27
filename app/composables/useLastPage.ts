// The last page visited outside of tickets (set by plugins/lastPage.client.ts).
export const useLastPage = () => useState<string | undefined>('last-page', () => undefined)
