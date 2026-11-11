declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    name: string
    avatar: string | null
    roles: string[]
    permissions: string[] // a snapshot taken at sign-in, used only to decide what to show; the server re-checks
  }
}

export {}
