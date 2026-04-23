import AsyncStorage from "@react-native-async-storage/async-storage"
import { useState, useEffect, useCallback } from "react"

const KEY = "cair_favorites"

async function loadIds(): Promise<string[]> {
  try {
    const raw = await AsyncStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

async function saveIds(ids: string[]): Promise<void> {
  await AsyncStorage.setItem(KEY, JSON.stringify(ids))
}

export function useFavorites() {
  const [ids, setIds] = useState<string[]>([])
  const [ready, setReady] = useState(false)

  useEffect(() => {
    loadIds().then((list) => { setIds(list); setReady(true) })
  }, [])

  const toggle = useCallback(async (id: string) => {
    const next = ids.includes(id) ? ids.filter((x) => x !== id) : [...ids, id]
    setIds(next)
    await saveIds(next)
  }, [ids])

  const isFav = useCallback((id: string) => ids.includes(id), [ids])

  return { ids, isFav, toggle, ready }
}
