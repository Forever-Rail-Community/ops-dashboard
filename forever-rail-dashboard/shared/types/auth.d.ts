declare module '#auth-utils' {
  interface User {
    id: string
    username: string
    name: string
    avatar: string | null
    role: 'member' | 'dispatcher' | 'admin'
  }
}

export {}
