import { useEffect, useState } from "react"
import { View, Text, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator, Modal } from "react-native"
import { apiFetch } from "@/lib/api"

interface Seller {
  id: string
  full_name: string
  email: string
  phone: string | null
  is_active: boolean
  company_name: string | null
  province: string | null
  listings_count: string
  expires_at: string | null
}

interface Stats { total: number; active: number; totalListings: number }

function StatCard({ label, value, sub, color }: { label: string; value: number; sub?: string; color?: string }) {
  return (
    <View style={{ flex: 1, backgroundColor: "#fff", borderRadius: 12, padding: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
      <Text style={{ fontSize: 12, color: "#6b7280" }}>{label}</Text>
      <Text style={{ fontSize: 28, fontWeight: "700", color: color ?? "#111827", marginTop: 4 }}>{value}</Text>
      {sub && <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: 2 }}>{sub}</Text>}
    </View>
  )
}

export default function AdminVendedoresScreen() {
  const [sellers, setSellers] = useState<Seller[]>([])
  const [stats, setStats] = useState<Stats>({ total: 0, active: 0, totalListings: 0 })
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")
  const [editing, setEditing] = useState<Seller | null>(null)
  const [editForm, setEditForm] = useState({ full_name: "", email: "", phone: "", company_name: "", province: "", expires_at: "" })
  const [saving, setSaving] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newForm, setNewForm] = useState({ full_name: "", email: "", password: "", phone: "", company_name: "", province: "" })
  const [createError, setCreateError] = useState("")
  const [createSaving, setCreateSaving] = useState(false)

  async function load() {
    try {
      const data = await apiFetch<{ sellers: Seller[]; stats: Stats }>("/api/mobile/admin/sellers")
      setSellers(data.sellers)
      setStats(data.stats)
    } catch {
      Alert.alert("Error", "No se pudieron cargar los vendedores")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  async function toggleStatus(seller: Seller) {
    const action = seller.is_active ? "desactivar" : "activar"
    Alert.alert(
      `¿${action.charAt(0).toUpperCase() + action.slice(1)} vendedor?`,
      `${seller.full_name} ${seller.is_active ? "no podrá iniciar sesión" : "podrá volver a ingresar"}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: action.charAt(0).toUpperCase() + action.slice(1),
          style: seller.is_active ? "destructive" : "default",
          onPress: async () => {
            await apiFetch("/api/mobile/admin/sellers", {
              method: "PATCH",
              body: JSON.stringify({ id: seller.id, is_active: !seller.is_active }),
            })
            setSellers((prev) => prev.map((s) => s.id === seller.id ? { ...s, is_active: !s.is_active } : s))
            setStats((prev) => ({ ...prev, active: prev.active + (seller.is_active ? -1 : 1) }))
          },
        },
      ]
    )
  }

  async function resetPassword(seller: Seller) {
    Alert.alert(
      "¿Blanquear contraseña?",
      `Se generará una contraseña temporal para ${seller.full_name}`,
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Blanquear",
          onPress: async () => {
            try {
              const data = await apiFetch<{ tempPassword: string }>("/api/mobile/admin/sellers", {
                method: "PATCH",
                body: JSON.stringify({ id: seller.id, action: "reset-password" }),
              })
              Alert.alert(
                "🔑 Contraseña temporal",
                `La nueva contraseña de ${seller.full_name} es:\n\n${data.tempPassword}\n\nCompartíla con el vendedor.`,
                [{ text: "Entendido" }]
              )
            } catch {
              Alert.alert("Error", "No se pudo blanquear la contraseña")
            }
          },
        },
      ]
    )
  }

  function formatExpiry(dateStr: string | null): { label: string; urgent: boolean } {
    if (!dateStr) return { label: "Sin vigencia", urgent: false }
    const d = new Date(dateStr)
    const diffDays = Math.ceil((d.getTime() - Date.now()) / (1000 * 60 * 60 * 24))
    const label = d.toLocaleDateString("es-AR", { day: "2-digit", month: "2-digit", year: "numeric" })
    return { label, urgent: diffDays <= 30 }
  }

  function openEdit(seller: Seller) {
    setEditing(seller)
    setEditForm({
      full_name: seller.full_name,
      email: seller.email,
      phone: seller.phone ?? "",
      company_name: seller.company_name ?? "",
      province: seller.province ?? "",
      expires_at: seller.expires_at ? seller.expires_at.slice(0, 10) : "",
    })
  }

  async function createSeller() {
    if (!newForm.full_name || !newForm.email || !newForm.password) {
      setCreateError("Nombre, email y contraseña son obligatorios")
      return
    }
    setCreateSaving(true)
    setCreateError("")
    try {
      await apiFetch("/api/mobile/admin/sellers", {
        method: "POST",
        body: JSON.stringify(newForm),
      })
      setCreating(false)
      setNewForm({ full_name: "", email: "", password: "", phone: "", company_name: "", province: "" })
      await load()
    } catch (e: unknown) {
      setCreateError(e instanceof Error ? e.message : "Error al crear vendedor")
    } finally {
      setCreateSaving(false)
    }
  }

  async function saveEdit() {
    if (!editing) return
    setSaving(true)
    try {
      await apiFetch("/api/mobile/admin/sellers", {
        method: "PATCH",
        body: JSON.stringify({ id: editing.id, ...editForm }),
      })
      setSellers((prev) => prev.map((s) => s.id === editing.id ? { ...s, ...editForm } : s))
      setEditing(null)
    } catch {
      Alert.alert("Error", "No se pudo guardar")
    } finally {
      setSaving(false)
    }
  }

  const filtered = sellers.filter((s) =>
    !search ||
    s.full_name.toLowerCase().includes(search.toLowerCase()) ||
    s.email.toLowerCase().includes(search.toLowerCase()) ||
    (s.company_name ?? "").toLowerCase().includes(search.toLowerCase())
  )

  if (loading) return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 60 }} />

  return (
    <ScrollView style={{ flex: 1, backgroundColor: "#f9fafb" }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>
      {/* Stats */}
      <View style={{ flexDirection: "row", gap: 10, marginBottom: 16 }}>
        <StatCard label="Vendedores activos" value={stats.active} sub={`de ${stats.total} totales`} color="#1a4731" />
        <StatCard label="Inactivos" value={stats.total - stats.active} color="#dc2626" />
      </View>
      <View style={{ marginBottom: 20 }}>
        <StatCard label="Campos publicados" value={stats.totalListings} sub="entre todos los vendedores" />
      </View>

      {/* New seller button */}
      <TouchableOpacity
        onPress={() => setCreating(true)}
        style={{ backgroundColor: "#1a4731", borderRadius: 12, paddingVertical: 13, alignItems: "center", marginBottom: 16, flexDirection: "row", justifyContent: "center", gap: 6 }}
      >
        <Text style={{ color: "#fff", fontSize: 18, lineHeight: 22 }}>+</Text>
        <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Nuevo vendedor</Text>
      </TouchableOpacity>

      {/* Search */}
      <TextInput
        value={search}
        onChangeText={setSearch}
        placeholder="Buscar vendedor..."
        placeholderTextColor="#9ca3af"
        style={{ backgroundColor: "#fff", borderWidth: 1, borderColor: "#e5e7eb", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", marginBottom: 12 }}
      />

      {/* Sellers list */}
      {filtered.map((seller) => (
        <View key={seller.id} style={{ backgroundColor: "#fff", borderRadius: 12, borderWidth: 1, borderColor: "#e5e7eb", marginBottom: 10, overflow: "hidden", opacity: seller.is_active ? 1 : 0.65 }}>
          <View style={{ padding: 14 }}>
            {/* Header */}
            <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start" }}>
              <View style={{ flex: 1 }}>
                <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827" }}>{seller.full_name}</Text>
                <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{seller.email}</Text>
                {seller.company_name && <Text style={{ fontSize: 12, color: "#1a4731", marginTop: 1, fontWeight: "600" }}>{seller.company_name}</Text>}
                {seller.province && <Text style={{ fontSize: 12, color: "#9ca3af" }}>{seller.province}</Text>}
              </View>
              <TouchableOpacity
                onPress={() => toggleStatus(seller)}
                style={{ paddingHorizontal: 10, paddingVertical: 5, borderRadius: 20, backgroundColor: seller.is_active ? "#dcfce7" : "#fee2e2" }}
              >
                <Text style={{ fontSize: 12, fontWeight: "600", color: seller.is_active ? "#16a34a" : "#dc2626" }}>
                  {seller.is_active ? "● Activo" : "● Inactivo"}
                </Text>
              </TouchableOpacity>
            </View>

            <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 8 }}>
              {seller.listings_count} campos publicados{seller.phone ? ` · ${seller.phone}` : ""}
            </Text>
            {(() => {
              const expiry = formatExpiry(seller.expires_at)
              return (
                <Text style={{ fontSize: 12, color: expiry.urgent ? "#dc2626" : "#9ca3af", marginTop: 2 }}>
                  Vigencia: {expiry.label}{expiry.urgent ? " ⚠️" : ""}
                </Text>
              )
            })()}

            {/* Actions */}
            <View style={{ flexDirection: "row", gap: 8, marginTop: 12 }}>
              <TouchableOpacity
                onPress={() => openEdit(seller)}
                style={{ flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingVertical: 8, alignItems: "center" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151" }}>Editar</Text>
              </TouchableOpacity>
              <TouchableOpacity
                onPress={() => resetPassword(seller)}
                style={{ flex: 1, borderWidth: 1, borderColor: "#fed7aa", borderRadius: 8, paddingVertical: 8, alignItems: "center", backgroundColor: "#fff7ed" }}
              >
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#c2410c" }}>Blanquear clave</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      ))}

      {filtered.length === 0 && (
        <View style={{ alignItems: "center", paddingVertical: 40 }}>
          <Text style={{ fontSize: 36, marginBottom: 8 }}>🔍</Text>
          <Text style={{ color: "#6b7280" }}>No hay vendedores que coincidan</Text>
        </View>
      )}

      {/* New Seller Modal */}
      <Modal visible={creating} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Nuevo vendedor</Text>
            <TouchableOpacity onPress={() => { setCreating(false); setCreateError("") }}>
              <Text style={{ fontSize: 16, color: "#6b7280" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {[
              { key: "full_name", label: "Nombre completo *" },
              { key: "email", label: "Email *" },
              { key: "password", label: "Contraseña *", secure: true },
              { key: "phone", label: "Teléfono" },
              { key: "company_name", label: "Empresa" },
              { key: "province", label: "Provincia" },
            ].map((f) => (
              <View key={f.key} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>{f.label}</Text>
                <TextInput
                  value={newForm[f.key as keyof typeof newForm]}
                  onChangeText={(v) => setNewForm((prev) => ({ ...prev, [f.key]: v }))}
                  secureTextEntry={f.secure}
                  autoCapitalize="none"
                  style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" }}
                />
              </View>
            ))}
            {createError ? (
              <View style={{ backgroundColor: "#fef2f2", borderRadius: 8, padding: 12, marginBottom: 8 }}>
                <Text style={{ color: "#dc2626", fontSize: 13 }}>{createError}</Text>
              </View>
            ) : null}
          </ScrollView>
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
            <TouchableOpacity
              onPress={createSeller}
              disabled={createSaving}
              style={{ backgroundColor: "#1a4731", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
            >
              {createSaving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Crear vendedor</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Edit Modal */}
      <Modal visible={!!editing} animationType="slide" presentationStyle="pageSheet">
        <View style={{ flex: 1, backgroundColor: "#fff" }}>
          <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", padding: 20, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
            <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Editar vendedor</Text>
            <TouchableOpacity onPress={() => setEditing(null)}>
              <Text style={{ fontSize: 16, color: "#6b7280" }}>Cancelar</Text>
            </TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1, padding: 20 }}>
            {[
              { key: "full_name", label: "Nombre completo" },
              { key: "email", label: "Email" },
              { key: "phone", label: "Teléfono" },
              { key: "company_name", label: "Empresa" },
              { key: "province", label: "Provincia" },
              { key: "expires_at", label: "Vencimiento (YYYY-MM-DD)" },
            ].map((f) => (
              <View key={f.key} style={{ marginBottom: 16 }}>
                <Text style={{ fontSize: 13, fontWeight: "600", color: "#374151", marginBottom: 6 }}>{f.label}</Text>
                <TextInput
                  value={editForm[f.key as keyof typeof editForm]}
                  onChangeText={(v) => setEditForm((prev) => ({ ...prev, [f.key]: v }))}
                  placeholder={f.key === "expires_at" ? "2026-12-31" : undefined}
                  placeholderTextColor="#9ca3af"
                  style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827" }}
                />
              </View>
            ))}
          </ScrollView>
          <View style={{ padding: 20, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
            <TouchableOpacity
              onPress={saveEdit}
              disabled={saving}
              style={{ backgroundColor: "#1a4731", borderRadius: 12, paddingVertical: 14, alignItems: "center" }}
            >
              {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Guardar cambios</Text>}
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </ScrollView>
  )
}
