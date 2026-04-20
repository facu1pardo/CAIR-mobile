import { createContext, useContext, useEffect, useState } from "react"
import { getStoredUser, logout as apiLogout } from "./api"

interface User {
  id: string
  email: string
  full_name: string
  role: "admin" | "seller" | "buyer"
}

interface AuthContextType {
  user: User | null
  loading: boolean
  setUser: (u: User | null) => void
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  loading: true,
  setUser: () => {},
  logout: async () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    getStoredUser().then((u) => {
      setUser(u)
      setLoading(false)
    })
  }, [])

  async function logout() {
    await apiLogout()
    setUser(null)
  }

  return (
    <AuthContext.Provider value={{ user, loading, setUser, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
