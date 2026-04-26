import { useState, useLayoutEffect, useCallback, useRef, useEffect } from "react"
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity } from "react-native"
import { useRouter, useNavigation } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { apiFetch } from "@/lib/api"
import type { Listing } from "@/types"

const STATUS_LABELS: Record<string, { label: string; color: string; bg: string }> = {
  active:  { label: "Activo",    color: "#166534", bg: "#dcfce7" },
  draft:   { label: "Borrador",  color: "#374151", bg: "#f3f4f6" },
  paused:  { label: "Pausado",   color: "#92400e", bg: "#fef3c7" },
  sold:    { label: "Vendido",   color: "#1e40af", bg: "#dbeafe" },
}

function StatusBadge({ status }: { status: string }) {
  const s = STATUS_LABELS[status] ?? { label: status, color: "#374151", bg: "#f3f4f6" }
  return (
    <View style={{ backgroundColor: s.bg, borderRadius: 999, paddingHorizontal: 8, paddingVertical: 2 }}>
      <Text style={{ color: s.color, fontSize: 11, fontWeight: "600" }}>{s.label}</Text>
    </View>
  )
}

function formatPrice(price?: number | null) {
  if (!price) return "Consultar precio"
  return `USD ${price.toLocaleString("es-AR")}`
}

function formatDate(dateStr: string) {
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function MisPublicacionesScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const scrollRef = useRef<ScrollView>(null)
  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>‹ Volver</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  const load = useCallback(() => {
    setLoading(true)
    apiFetch<{ listings: Listing[] }>("/api/mobile/my-listings")
      .then((d) => setListings(d.listings))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }) }, [])

  useFocusEffect(load)

  if (loading) {
    return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />
  }

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-gray-50">
      <View className="px-4 py-4">
        <TouchableOpacity
          onPress={() => router.push("/dashboard/nueva-publicacion")}
          className="bg-primary rounded-xl py-3 px-5 items-center mb-4"
        >
          <Text className="text-white font-bold text-sm">+ Nueva publicación</Text>
        </TouchableOpacity>

        {listings.length === 0 ? (
          <View className="bg-white rounded-xl border border-gray-200 p-12 items-center">
            <Text className="text-4xl mb-3">📋</Text>
            <Text className="text-gray-400 text-center font-medium">No tenés publicaciones aún</Text>
            <TouchableOpacity onPress={() => router.push("/dashboard/nueva-publicacion")} className="mt-3">
              <Text className="text-primary text-sm">Crear la primera</Text>
            </TouchableOpacity>
          </View>
        ) : (
          listings.map((l) => (
            <View key={l.id} className="bg-white rounded-xl border border-gray-200 p-4 mb-3">
              <View className="flex-row justify-between items-start mb-1">
                <View className="flex-1 mr-3">
                  <Text className="text-gray-900 font-semibold leading-5" numberOfLines={2}>{l.title}</Text>
                  {l.province ? <Text className="text-gray-400 text-xs mt-0.5">{l.province}</Text> : null}
                </View>
                <StatusBadge status={l.status} />
              </View>

              <View className="flex-row gap-4 mt-2">
                <Text className="text-gray-700 text-sm">{formatPrice(l.price_usd)}</Text>
                {l.surface_ha ? (
                  <Text className="text-gray-500 text-sm">{l.surface_ha.toLocaleString("es-AR")} ha</Text>
                ) : null}
              </View>

              <Text className="text-gray-400 text-xs mt-1">{formatDate(l.created_at)}</Text>

              <TouchableOpacity
                onPress={() => router.push({ pathname: "/dashboard/editar-publicacion", params: { id: l.id } })}
                className="mt-3 border border-primary rounded-lg py-2 items-center"
              >
                <Text className="text-primary text-sm font-semibold">Editar</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
