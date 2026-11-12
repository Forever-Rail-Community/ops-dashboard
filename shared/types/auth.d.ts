declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    name: string
    avatar: string | null
    roles: string[]
    permissions: string[] // refreshed from the database whenever the session is fetched, and used only to decide what to show; the server re-checks on every request
  }
}

export {}
