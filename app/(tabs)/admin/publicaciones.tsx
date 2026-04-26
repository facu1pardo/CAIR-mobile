import { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, ActivityIndicator, Alert } from "react-native"
import { apiFetch } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

interface Listing {
  id: string
  title: string
  slug: string
  status: string
  province: string
  price_usd: number | null
  surface_ha: number | null
  featured: boolean
  sold_via: string | null
  created_at: string
  company_name: string | null
  full_name: string
  for_sale?: boolean
  for_rent?: boolean
}

const STATUS_COLORS: Record<string, { bg: string; text: string; label: string }> = {
  active:  { bg: "#dcfce7", text: "#16a34a", label: "Activa" },
  paused:  { bg: "#fef3c7", text: "#d97706", label: "Pausada" },
  draft:   { bg: "#f3f4f6", text: "#6b7280", label: "Borrador" },
  sold:    { bg: "#ede9fe", text: "#7c3aed", label: "Vendida" },
}

export default function AdminPublicacionesScreen() {
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [updating, setUpdating] = useState<string | null>(null)

  async function load() {
    setLoading(true)
    try {
      const data = await apiFetch<{ listings: Listing[] }>("/api/mobile/admin/publicaciones")
      setListings(data.listings)
    } catch {
      Alert.alert("Error", "No se pudieron cargar las publicaciones")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function changeStatus(listing: Listing, newStatus: string) {
    const label = STATUS_COLORS[newStatus]?.label ?? newStatus
    Alert.alert(
      `Cambiar a "${label}"`,
      `¿Confirmar el cambio de estado de "${listing.title}"?`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Confirmar",
          onPress: async () => {
            setUpdating(listing.id)
            try {
              await apiFetch("/api/mobile/admin/publicaciones", {
                method: "PATCH",
                body: JSON.stringify({ id: listing.id, status: newStatus }),
              })
              await load()
            } catch {
              Alert.alert("Error", "No se pudo cambiar el estado")
            } finally {
              setUpdating(null)
            }
          },
        },
      ]
    )
  }

  async function toggleFeatured(listing: Listing) {
    setUpdating(listing.id)
    try {
      await apiFetch("/api/mobile/admin/publicaciones", {
        method: "PATCH",
        body: JSON.stringify({ id: listing.id, featured: !listing.featured }),
      })
      setListings((prev) => prev.map((l) => l.id === listing.id ? { ...l, featured: !l.featured } : l))
    } catch {
      Alert.alert("Error", "No se pudo actualizar")
    } finally {
      setUpdating(null)
    }
  }

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      {/* Header */}
      <View style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#e5e7eb", paddingHorizontal: 12, paddingVertical: 12 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>
          Todas las publicaciones ({listings.length})
        </Text>
      </View>

      {loading ? (
        <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 60 }} />
      ) : (
        <ScrollView contentContainerStyle={{ padding: 12, paddingBottom: 40, gap: 10 }}>
          {listings.length === 0 && (
            <View style={{ alignItems: "center", paddingVertical: 60 }}>
              <Text style={{ fontSize: 36, marginBottom: 8 }}>📋</Text>
              <Text style={{ color: "#6b7280", fontSize: 14 }}>No hay publicaciones</Text>
            </View>
          )}

          {listings.map((listing) => {
            const badge = STATUS_COLORS[listing.status] ?? STATUS_COLORS.active
            return (
            <View key={listing.id} style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", overflow: "hidden" }}>
              <View style={{ padding: 14 }}>
                <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 6 }}>
                  <View style={{ flex: 1, marginRight: 8 }}>
                    <Text style={{ fontWeight: "700", fontSize: 14, color: "#111827" }} numberOfLines={2}>{listing.title}</Text>
                    <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 2 }}>{listing.province}</Text>
                    {listing.company_name && (
                      <Text style={{ fontSize: 12, color: "#1a4731", fontWeight: "600", marginTop: 1 }}>{listing.company_name}</Text>
                    )}
                  </View>
                  <View style={{ paddingHorizontal: 8, paddingVertical: 4, borderRadius: 12, backgroundColor: badge.bg }}>
                    <Text style={{ fontSize: 11, fontWeight: "600", color: badge.text }}>{badge.label}</Text>
                  </View>
                </View>

                <View style={{ flexDirection: "row", gap: 12, marginBottom: 8 }}>
                  {listing.price_usd != null && (
                    <Text style={{ fontSize: 13, fontWeight: "600", color: "#111827" }}>{formatCurrency(listing.price_usd)}</Text>
                  )}
                  {listing.surface_ha != null && (
                    <Text style={{ fontSize: 13, color: "#6b7280" }}>{listing.surface_ha} ha</Text>
                  )}
                  {listing.sold_via && (
                    <Text style={{ fontSize: 11, color: "#7c3aed", fontWeight: "600" }}>
                      via {listing.sold_via === "cair" ? "CAIR" : "Externa"}
                    </Text>
                  )}
                </View>

                {/* Badges de modalidad */}
                <View style={{ flexDirection: "row", gap: 6, marginBottom: 10 }}>
                  {listing.for_sale !== false && (
                    <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#16a34a" }}>VENTA</Text>
                    </View>
                  )}
                  {listing.for_rent && (
                    <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", paddingHorizontal: 8, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ fontSize: 10, fontWeight: "700", color: "#2563eb" }}>ARREND.</Text>
                    </View>
                  )}
                </View>

                {/* Actions */}
                {updating === listing.id ? (
                  <ActivityIndicator color="#1a4731" style={{ alignSelf: "flex-start" }} />
                ) : (
                  <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
                    <TouchableOpacity
                      onPress={() => toggleFeatured(listing)}
                      style={{ borderWidth: 1, borderColor: "#d97706", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: listing.featured ? "#fef3c7" : "#fff" }}
                    >
                      <Text style={{ fontSize: 12, fontWeight: "600", color: "#d97706" }}>
                        {listing.featured ? "⭐ Destacado" : "☆ Destacado"}
                      </Text>
                    </TouchableOpacity>

                    {listing.status !== "paused" && listing.status !== "sold" && (
                      <TouchableOpacity
                        onPress={() => changeStatus(listing, "paused")}
                        style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6 }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#374151" }}>Pausar</Text>
                      </TouchableOpacity>
                    )}

                    {listing.status === "paused" && (
                      <TouchableOpacity
                        onPress={() => changeStatus(listing, "active")}
                        style={{ borderWidth: 1, borderColor: "#16a34a", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, backgroundColor: "#f0fdf4" }}
                      >
                        <Text style={{ fontSize: 12, fontWeight: "600", color: "#16a34a" }}>Activar</Text>
                      </TouchableOpacity>
                    )}
                  </View>
                )}
              </View>
            </View>
            )
          })}
        </ScrollView>
      )}
    </View>
  )
}
