import { useEffect, useState, useCallback } from "react"
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { Listing } from "@/types"

const PROVINCES = ["Buenos Aires","Córdoba","Santa Fe","Entre Ríos","La Pampa","Corrientes","Chaco","Salta","Misiones","Tucumán"]

export default function ExplorarScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ q?: string; tipo?: string }>()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.q ?? "")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const fetchListings = useCallback(async (q: string, p: number, replace = false) => {
    try {
      const qs = new URLSearchParams({ limit: "10", page: String(p) })
      if (q) qs.set("q", q)
      if (params.tipo) qs.set("tipo", params.tipo)
      const data = await apiFetch<{ listings: Listing[]; total: number }>(`/api/mobile/listings?${qs}`)
      setTotal(data.total)
      setListings((prev) => replace ? data.listings : [...prev, ...data.listings])
      setHasMore(p * 10 < data.total)
    } catch {}
  }, [params.tipo])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchListings(search, 1, true).finally(() => setLoading(false))
  }, [fetchListings])

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    await fetchListings(search, next)
    setLoadingMore(false)
  }

  function handleSearch() {
    setLoading(true)
    setPage(1)
    fetchListings(search, 1, true).finally(() => setLoading(false))
  }

  return (
    <View className="flex-1 bg-gray-50">
      {/* Search bar */}
      <View className="bg-white px-4 py-3 border-b border-gray-200 flex-row gap-2">
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, zona..."
          placeholderTextColor="#9ca3af"
          className="flex-1 bg-gray-100 rounded-lg px-4 py-2 text-sm text-gray-900"
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} className="bg-primary rounded-lg px-4 py-2 justify-center">
          <Text className="text-white font-semibold text-sm">Buscar</Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1a4731" className="mt-10" />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerClassName="p-4 gap-4"
          ListHeaderComponent={
            <Text className="text-gray-500 text-sm mb-2">
              <Text className="font-semibold text-gray-900">{total}</Text> campos encontrados
            </Text>
          }
          ListEmptyComponent={
            <View className="items-center py-16">
              <Text className="text-4xl mb-3">🔍</Text>
              <Text className="text-gray-500 font-medium">No encontramos campos con esos filtros</Text>
            </View>
          }
          renderItem={({ item: l }) => (
            <TouchableOpacity
              onPress={() => router.push(`/listing/${l.slug}`)}
              className="bg-white rounded-xl overflow-hidden border border-gray-200 shadow-sm"
            >
              {l.cover_image ? (
                <Image source={{ uri: l.cover_image }} className="w-full h-40" resizeMode="cover" />
              ) : (
                <View className="w-full h-40 bg-gray-100 items-center justify-center">
                  <Text className="text-4xl">🌾</Text>
                </View>
              )}
              <View className="p-4">
                <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>{l.title}</Text>
                <Text className="text-gray-500 text-sm mt-1">
                  {[l.locality, l.partido, l.province].filter(Boolean).join(", ")}
                </Text>
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-primary font-bold text-lg">{formatCurrency(l.price_usd)}</Text>
                  {l.surface_ha && (
                    <Text className="text-gray-500 text-sm">{formatNumber(l.surface_ha)} ha</Text>
                  )}
                </View>
                {l.field_type_name && (
                  <View className="mt-2 self-start bg-green-50 px-2 py-1 rounded-full">
                    <Text className="text-primary text-xs font-medium">{l.field_type_name}</Text>
                  </View>
                )}
              </View>
            </TouchableOpacity>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#1a4731" className="py-4" /> : null}
        />
      )}
    </View>
  )
}
