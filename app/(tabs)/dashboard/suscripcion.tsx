import { useEffect, useState } from "react"
import { ScrollView, View, Text, ActivityIndicator, Linking, TouchableOpacity } from "react-native"
import { apiFetch } from "@/lib/api"

type SubscriptionStatus = "pending" | "active" | "expired" | "suspended"

interface Subscription {
  status: SubscriptionStatus
  starts_at: string | null
  expires_at: string | null
  created_at: string
}

const STATUS_MAP: Record<SubscriptionStatus, { label: string; color: string; bg: string }> = {
  active:    { label: "Activa",      color: "#166534", bg: "#dcfce7" },
  pending:   { label: "Pendiente",   color: "#92400e", bg: "#fef3c7" },
  expired:   { label: "Vencida",     color: "#991b1b", bg: "#fee2e2" },
  suspended: { label: "Suspendida",  color: "#991b1b", bg: "#fee2e2" },
}

function formatDate(dateStr: string | null) {
  if (!dateStr) return "—"
  return new Date(dateStr).toLocaleDateString("es-AR", { day: "2-digit", month: "long", year: "numeric" })
}

export default function SuscripcionScreen() {
  const [subscription, setSubscription] = useState<Subscription | null | undefined>(undefined)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<{ subscription: Subscription | null }>("/api/mobile/subscription")
      .then((d) => setSubscription(d.subscription))
      .catch(() => setSubscription(null))
      .finally(() => setLoading(false))
  }, [])

  if (loading) {
    return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />
  }

  const badge = subscription ? STATUS_MAP[subscription.status] ?? { label: subscription.status, color: "#374151", bg: "#f3f4f6" } : null

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-4">
        {!subscription ? (
          <View className="bg-white rounded-xl border border-gray-200 p-6">
            <Text className="text-gray-500 text-sm">No se encontró información de suscripción.</Text>
          </View>
        ) : (
          <View className="bg-white rounded-xl border border-gray-200 p-5 gap-4">
            <View className="flex-row items-center gap-3">
              <Text className="text-gray-900 font-semibold text-base">Estado:</Text>
              {badge && (
                <View style={{ backgroundColor: badge.bg, borderRadius: 999, paddingHorizontal: 10, paddingVertical: 3 }}>
                  <Text style={{ color: badge.color, fontSize: 13, fontWeight: "600" }}>{badge.label}</Text>
                </View>
              )}
            </View>

            <View className="gap-3">
              {subscription.starts_at && (
                <View className="flex-row justify-between border-b border-gray-100 pb-2">
                  <Text className="text-gray-500 text-sm">Inicio</Text>
                  <Text className="text-gray-900 text-sm font-medium">{formatDate(subscription.starts_at)}</Text>
                </View>
              )}
              {subscription.expires_at && (
                <View className="flex-row justify-between border-b border-gray-100 pb-2">
                  <Text className="text-gray-500 text-sm">Vencimiento</Text>
                  <Text className="text-gray-900 text-sm font-medium">{formatDate(subscription.expires_at)}</Text>
                </View>
              )}
              <View className="flex-row justify-between">
                <Text className="text-gray-500 text-sm">Registrado</Text>
                <Text className="text-gray-900 text-sm font-medium">{formatDate(subscription.created_at)}</Text>
              </View>
            </View>

            {subscription.status === "pending" && (
              <View className="bg-yellow-50 border border-yellow-200 rounded-xl p-4 gap-1">
                <Text className="text-yellow-800 font-semibold text-sm mb-1">Datos bancarios para transferencia</Text>
                <Text className="text-yellow-800 text-sm">Banco Nación Argentina</Text>
                <Text className="text-yellow-800 text-sm">CBU: 0110000000000000000000</Text>
                <Text className="text-yellow-800 text-sm">Alias: CAIR.SUSCRIPCION</Text>
                <Text className="text-yellow-800 text-sm">Titular: Cámara Argentina de Inmobiliaria Rural</Text>
              </View>
            )}

            {(subscription.status === "expired" || subscription.status === "suspended") && (
              <View className="gap-1">
                <Text className="text-gray-600 text-sm">Para renovar o activar tu cuenta, escribinos a:</Text>
                <TouchableOpacity onPress={() => Linking.openURL("mailto:admin@cair.org.ar")}>
                  <Text className="text-primary text-sm font-medium">admin@cair.org.ar</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}
      </View>
    </ScrollView>
  )
}
