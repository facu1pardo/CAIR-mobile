import { useEffect, useState } from "react"
import { View, Text, ScrollView, ActivityIndicator, Alert } from "react-native"
import { apiFetch } from "@/lib/api"

interface Metrics {
  totalListings: number
  activeSellers: number
  soldViaCair: number
  soldViaExternal: number
}

function KpiCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
      <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 4 }}>{label}</Text>
      <Text style={{ fontSize: 30, fontWeight: "700", color: color ?? "#111827" }}>{value}</Text>
      {sub ? <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</Text> : null}
    </View>
  )
}

export default function AdminMetricasScreen() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    apiFetch<Metrics>("/api/mobile/admin/metricas")
      .then(setMetrics)
      .catch(() => Alert.alert("Error", "No se pudieron cargar las métricas"))
      .finally(() => setLoading(false))
  }, [])

  if (loading) return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 60 }} />

  if (!metrics) return null

  const totalSold = metrics.soldViaCair + metrics.soldViaExternal
  const cairPct = totalSold > 0 ? Math.round((metrics.soldViaCair / totalSold) * 100) : 0
  const extPct = totalSold > 0 ? 100 - cairPct : 0

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      <Text style={{ fontSize: 13, fontWeight: "700", color: "#6b7280", marginBottom: 10, textTransform: "uppercase", letterSpacing: 0.5 }}>
        Indicadores generales
      </Text>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 10 }}>
        <KpiCard label="Campos publicados" value={metrics.totalListings} sub="activos" color="#1a4731" />
        <KpiCard label="Vendedores activos" value={metrics.activeSellers} sub="con suscripción" color="#2563eb" />
      </View>

      <View style={{ flexDirection: "row", gap: 10, marginBottom: 24 }}>
        <KpiCard label="Ventas por CAIR" value={metrics.soldViaCair} sub={`${cairPct}% del total`} color="#16a34a" />
        <KpiCard label="Ventas externas" value={metrics.soldViaExternal} sub={`${extPct}% del total`} color="#ea580c" />
      </View>

      {totalSold > 0 && (
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 12 }}>
            Comparativa de ventas — {totalSold} total
          </Text>

          <View style={{ flexDirection: "row", borderRadius: 8, overflow: "hidden", height: 20 }}>
            {cairPct > 0 && (
              <View style={{ width: `${cairPct}%`, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
                {cairPct > 15 && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>CAIR {cairPct}%</Text>}
              </View>
            )}
            {extPct > 0 && (
              <View style={{ flex: 1, backgroundColor: "#ea580c", alignItems: "center", justifyContent: "center" }}>
                {extPct > 15 && <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>Ext. {extPct}%</Text>}
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", gap: 20, marginTop: 10 }}>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#16a34a" }} />
              <Text style={{ fontSize: 12, color: "#374151" }}>CAIR ({metrics.soldViaCair})</Text>
            </View>
            <View style={{ flexDirection: "row", alignItems: "center", gap: 6 }}>
              <View style={{ width: 10, height: 10, borderRadius: 5, backgroundColor: "#ea580c" }} />
              <Text style={{ fontSize: 12, color: "#374151" }}>Externas ({metrics.soldViaExternal})</Text>
            </View>
          </View>
        </View>
      )}

      {totalSold === 0 && (
        <View style={{ backgroundColor: "#fff", borderRadius: 12, padding: 24, borderWidth: 1, borderColor: "#e5e7eb", alignItems: "center" }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>📊</Text>
          <Text style={{ color: "#6b7280", fontSize: 14 }}>Aún no hay ventas registradas</Text>
        </View>
      )}
    </ScrollView>
  )
}
