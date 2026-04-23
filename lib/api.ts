import Constants from "expo-constants"
import * as SecureStore from "expo-secure-store"

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "https://cair-app.vercel.app"

async function getToken(): Promise<string | null> {
  return SecureStore.getItemAsync("session_token")
}

export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const token = await getToken()
  const res = await fetch(`${API_URL}${path}`, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error((err as { error?: string }).error ?? `Error ${res.status}`)
  }
  return res.json()
}

export async function login(email: string, password: string) {
  const res = await fetch(`${API_URL}/api/mobile/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  })
  if (!res.ok) throw new Error("Credenciales incorrectas")
  const data = await res.json()
  await SecureStore.setItemAsync("session_token", data.token)
  await SecureStore.setItemAsync("session_user", JSON.stringify(data.user))
  return data.user
}


export async function logout() {
  await SecureStore.deleteItemAsync("session_token")
  await SecureStore.deleteItemAsync("session_user")
}

export async function getStoredUser() {
  const raw = await SecureStore.getItemAsync("session_user")
  return raw ? JSON.parse(raw) : null
}
