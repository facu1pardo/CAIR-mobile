import { useEffect, useState, useCallback } from "react"
import { View, Text, FlatList, TextInput, TouchableOpacity, ActivityIndicator, Image } from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { apiFetch } from "@/lib/api"
import { useFavorites } from "@/lib/favorites"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { Listing } from "@/types"

type Tab = "todos" | "favoritos"

export default function ExplorarScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ q?: string; tipo?: string }>()
  const { ids: favIds, isFav, toggle } = useFavorites()
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.q ?? "")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)
  const [activeTab, setActiveTab] = useState<Tab>("todos")

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
    if (loadingMore || !hasMore || activeTab === "favoritos") return
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    await fetchListings(search, next)
    setLoadingMore(false)
  }

  function handleSearch() {
    setActiveTab("todos")
    setLoading(true)
    setPage(1)
    fetchListings(search, 1, true).finally(() => setLoading(false))
  }

  const displayed = activeTab === "favoritos"
    ? listings.filter((l) => isFav(l.id))
    : listings

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Search bar */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", flexDirection: "row", gap: 8 }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, zona..."
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 16, paddingVertical: 8, fontSize: 14, color: "#111827" }}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity onPress={handleSearch} style={{ backgroundColor: "#1a4731", borderRadius: 8, paddingHorizontal: 16, justifyContent: "center" }}>
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Buscar</Text>
        </TouchableOpacity>
      </View>

      {/* Tabs */}
      <View style={{ flexDirection: "row", paddingHorizontal: 16, paddingVertical: 10, gap: 8, backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
        <TouchableOpacity
          onPress={() => setActiveTab("todos")}
          style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: activeTab === "todos" ? "#1a4731" : "#f3f4f6" }}
        >
          <Text style={{ color: activeTab === "todos" ? "#fff" : "#374151", fontWeight: "600", fontSize: 13 }}>Todos</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => setActiveTab("favoritos")}
          style={{ paddingHorizontal: 16, paddingVertical: 7, borderRadius: 20, backgroundColor: activeTab === "favoritos" ? "#1a4731" : "#f3f4f6", flexDirection: "row", alignItems: "center", gap: 4 }}
        >
          <Text style={{ fontSize: 13 }}>❤️</Text>
          <Text style={{ color: activeTab === "favoritos" ? "#fff" : "#374151", fontWeight: "600", fontSize: 13 }}>
            Favoritos {favIds.length > 0 ? `(${favIds.length})` : ""}
          </Text>
        </TouchableOpacity>
      </View>

      {loading ? (
        <ActivityIndicator color="#1a4731" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={displayed}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          ListHeaderComponent={
            activeTab === "todos" ? (
              <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>
                <Text style={{ fontWeight: "700", color: "#111827" }}>{total}</Text> campos encontrados
              </Text>
            ) : null
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>{activeTab === "favoritos" ? "❤️" : "🔍"}</Text>
              <Text style={{ color: "#6b7280", fontWeight: "500", fontSize: 15, textAlign: "center" }}>
                {activeTab === "favoritos"
                  ? "Todavía no tenés favoritos.\nTocá ❤️ en cualquier campo para guardarlo."
                  : "No encontramos campos con esos filtros"}
              </Text>
            </View>
          }
          renderItem={({ item: l }) => (
            <View style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}>
              <TouchableOpacity onPress={() => router.push(`/listing/${l.slug}`)} activeOpacity={0.9}>
                <View style={{ position: "relative" }}>
                  {l.cover_image ? (
                    <Image source={{ uri: l.cover_image }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
                  ) : (
                    <View style={{ width: "100%", height: 160, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
                      <Text style={{ fontSize: 40 }}>🌾</Text>
                    </View>
                  )}
                  {l.status === "sold" && (
                    <View style={{ position: "absolute", inset: 0, top: 0, left: 0, right: 0, bottom: 0, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
                      <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, transform: [{ rotate: "-8deg" }] }}>
                        <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 }}>VENDIDO</Text>
                      </View>
                    </View>
                  )}
                </View>
              </TouchableOpacity>

              {/* Heart button */}
              <TouchableOpacity
                onPress={() => toggle(l.id)}
                style={{ position: "absolute", top: 10, right: 10, width: 36, height: 36, borderRadius: 18, backgroundColor: "rgba(255,255,255,0.92)", alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 4, elevation: 4 }}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Text style={{ fontSize: 18, lineHeight: 22 }}>{isFav(l.id) ? "❤️" : "🤍"}</Text>
              </TouchableOpacity>

              <TouchableOpacity onPress={() => router.push(`/listing/${l.slug}`)} activeOpacity={0.9}>
                <View style={{ padding: 16 }}>
                  <Text style={{ fontWeight: "700", color: "#111827", fontSize: 15 }} numberOfLines={2}>{l.title}</Text>
                  <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 4 }}>
                    {[l.locality, l.partido, l.province].filter(Boolean).join(", ")}
                  </Text>
                  <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 8 }}>
                    <Text style={{ color: "#1a4731", fontWeight: "700", fontSize: 17 }}>{formatCurrency(l.price_usd)}</Text>
                    {l.surface_ha && (
                      <Text style={{ color: "#6b7280", fontSize: 13 }}>{formatNumber(l.surface_ha)} ha</Text>
                    )}
                  </View>
                  {l.field_type_name && (
                    <View style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
                      <Text style={{ color: "#1a4731", fontSize: 12, fontWeight: "500" }}>{l.field_type_name}</Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            </View>
          )}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#1a4731" style={{ paddingVertical: 16 }} /> : null}
        />
      )}
    </View>
  )
}
