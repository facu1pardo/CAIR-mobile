import { useState, useEffect, useLayoutEffect, useRef } from "react"
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image,
} from "react-native"
import { useRouter, useNavigation, useLocalSearchParams } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import * as SecureStore from "expo-secure-store"
import Constants from "expo-constants"
import { apiFetch } from "@/lib/api"
import { PROVINCES } from "@/lib/utils"
import { RENT_CROPS, RENT_UNIT_LABELS, RENT_PAYMENT_FREQUENCY_LABELS } from "@/types"

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "https://cair-app.vercel.app"

interface FieldType { id: number; name: string; slug: string }
interface ExistingImage { id: string; url: string; public_id: string; type: string }
interface NewImage { uri: string; type: string; name: string }

interface FormState {
  title: string; description: string; province: string; partido: string; locality: string
  field_type_ids: number[]; surface_ha: string; price_usd: string; price_per_ha_usd: string
  contact_name: string; contact_email: string; contact_phone: string; contact_whatsapp: string
  lat: string; lng: string; for_sale: boolean; for_rent: boolean
  rent_unit: string; rent_price_per_ha: string; rent_payment_frequency: string
  rent_observations: string; rent_crop: string; status: string
}

export default function EditarPublicacion() {
  const router = useRouter()
  const navigation = useNavigation()
  const { id } = useLocalSearchParams<{ id: string }>()
  const scrollRef = useRef<ScrollView>(null)

  const [loading, setLoading] = useState(false)
  const [fetching, setFetching] = useState(true)
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([])
  const [cropPreset, setCropPreset] = useState("")
  const [existingImages, setExistingImages] = useState<ExistingImage[]>([])
  const [newImages, setNewImages] = useState<NewImage[]>([])
  const [uploadProgress, setUploadProgress] = useState("")
  const [form, setForm] = useState<FormState>({
    title: "", description: "", province: "", partido: "", locality: "",
    field_type_ids: [], surface_ha: "", price_usd: "", price_per_ha_usd: "",
    contact_name: "", contact_email: "", contact_phone: "", contact_whatsapp: "",
    lat: "", lng: "", for_sale: true, for_rent: false,
    rent_unit: "", rent_price_per_ha: "", rent_payment_frequency: "",
    rent_observations: "", rent_crop: "", status: "active",
  })

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>‹ Volver</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
  }, [id])

  useEffect(() => {
    Promise.all([
      apiFetch<{ types: FieldType[] }>("/api/mobile/field-types"),
      apiFetch<{ listing: Record<string, unknown>; images: ExistingImage[] }>(`/api/mobile/my-listings/${id}`),
    ])
      .then(([ft, { listing: l, images }]) => {
        setFieldTypes(ft.types)
        setExistingImages(images ?? [])
        const crop = String(l.rent_crop ?? "")
        setCropPreset(crop)
        setForm({
          title: String(l.title ?? ""),
          description: String(l.description ?? ""),
          province: String(l.province ?? ""),
          partido: String(l.partido ?? ""),
          locality: String(l.locality ?? ""),
          field_type_ids: (l.field_type_ids as number[]) ?? [],
          surface_ha: l.surface_ha != null ? String(l.surface_ha) : "",
          price_usd: l.price_usd != null ? String(l.price_usd) : "",
          price_per_ha_usd: l.price_per_ha_usd != null ? String(l.price_per_ha_usd) : "",
          contact_name: String(l.contact_name ?? ""),
          contact_email: String(l.contact_email ?? ""),
          contact_phone: String(l.contact_phone ?? ""),
          contact_whatsapp: String(l.contact_whatsapp ?? ""),
          lat: l.lat != null ? String(l.lat) : "",
          lng: l.lng != null ? String(l.lng) : "",
          for_sale: Boolean(l.for_sale ?? true),
          for_rent: Boolean(l.for_rent ?? false),
          rent_unit: String(l.rent_unit ?? ""),
          rent_price_per_ha: l.rent_price_per_ha != null ? String(l.rent_price_per_ha) : "",
          rent_payment_frequency: String(l.rent_payment_frequency ?? ""),
          rent_observations: String(l.rent_observations ?? ""),
          rent_crop: crop,
          status: String(l.status ?? "active"),
        })
      })
      .catch(() => Alert.alert("Error", "No se pudo cargar la publicación."))
      .finally(() => setFetching(false))
  }, [id])

  function update(field: string, value: unknown) {
    setForm((f) => {
      const next = { ...f, [field]: value }
      const ha = parseFloat(String(next.surface_ha))
      const total = parseFloat(String(next.price_usd))
      const perHa = parseFloat(String(next.price_per_ha_usd))
      if (field === "surface_ha") {
        if (!isNaN(ha) && !isNaN(perHa)) next.price_usd = String(Math.round(ha * perHa))
        else if (!isNaN(ha) && !isNaN(total)) next.price_per_ha_usd = String(Math.round(total / ha))
      } else if (field === "price_usd") {
        if (!isNaN(total) && !isNaN(ha) && ha > 0) next.price_per_ha_usd = String(Math.round(total / ha))
      } else if (field === "price_per_ha_usd") {
        if (!isNaN(perHa) && !isNaN(ha) && ha > 0) next.price_usd = String(Math.round(ha * perHa))
      }
      return next
    })
  }

  function toggleMode(mode: "for_sale" | "for_rent") {
    setForm((f) => {
      const next = { ...f, [mode]: !f[mode] }
      if (!next.for_sale && !next.for_rent) return f
      return next
    })
  }

  async function pickImages() {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync()
    if (status !== "granted") {
      Alert.alert("Permiso denegado", "Necesitamos acceso a tu galería para subir fotos.")
      return
    }
    const remaining = 20 - existingImages.length - newImages.length
    if (remaining <= 0) { Alert.alert("Límite alcanzado", "Ya tenés 20 archivos."); return }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: remaining,
    })
    if (!result.canceled) {
      setNewImages((prev) => [
        ...prev,
        ...result.assets.map((a) => ({
          uri: a.uri,
          type: a.mimeType ?? (a.uri.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
          name: a.fileName ?? `media_${Date.now()}`,
        })),
      ])
    }
  }

  async function removeExistingImage(img: ExistingImage) {
    try {
      await apiFetch("/api/mobile/upload", {
        method: "DELETE",
        body: JSON.stringify({ image_id: img.id, public_id: img.public_id }),
      })
      setExistingImages((prev) => prev.filter((i) => i.id !== img.id))
    } catch {
      Alert.alert("Error", "No se pudo eliminar la imagen.")
    }
  }

  async function uploadNewImages(listingId: string) {
    const token = await SecureStore.getItemAsync("session_token")
    for (let i = 0; i < newImages.length; i++) {
      const img = newImages[i]
      setUploadProgress(`Subiendo archivo ${i + 1} de ${newImages.length}...`)
      const fd = new FormData()
      fd.append("file", { uri: img.uri, type: img.type, name: img.name } as unknown as Blob)
      fd.append("listing_id", listingId)
      const res = await fetch(`${API_URL}/api/mobile/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: fd,
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        throw new Error((err as { error?: string }).error ?? `Error subiendo archivo ${i + 1}`)
      }
    }
    setUploadProgress("")
  }

  async function handleSave() {
    if (!form.title || !form.province) {
      Alert.alert("Faltan datos", "El título y la provincia son obligatorios.")
      return
    }
    setLoading(true)
    try {
      await apiFetch(`/api/mobile/my-listings/${id}`, {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          surface_ha: form.surface_ha ? Number(form.surface_ha) : null,
          price_usd: form.for_sale && form.price_usd ? Number(form.price_usd) : null,
          price_per_ha_usd: form.for_sale && form.price_per_ha_usd ? Number(form.price_per_ha_usd) : null,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          rent_unit: form.for_rent ? form.rent_unit || null : null,
          rent_price_per_ha: form.for_rent && form.rent_price_per_ha ? Number(form.rent_price_per_ha) : null,
          rent_crop: form.for_rent ? form.rent_crop || null : null,
          rent_payment_frequency: form.for_rent ? form.rent_payment_frequency || null : null,
          rent_observations: form.for_rent ? form.rent_observations || null : null,
        }),
      })
      if (newImages.length > 0) await uploadNewImages(id)
      setNewImages([])
      Alert.alert("Guardado", "Publicación actualizada.", [{ text: "OK", onPress: () => router.back() }])
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar.")
    } finally {
      setLoading(false)
    }
  }

  async function handleMarkSold() {
    Alert.alert(
      "Marcar como vendida",
      "¿Querés marcar esta publicación como vendida?",
      [
        { text: "Cancelar", style: "cancel" },
        {
          text: "Sí, vendida",
          style: "destructive",
          onPress: async () => {
            setLoading(true)
            try {
              await apiFetch(`/api/mobile/my-listings/${id}`, {
                method: "PUT",
                body: JSON.stringify({ status: "sold" }),
              })
              Alert.alert("Listo", "Publicación marcada como vendida.", [{ text: "OK", onPress: () => router.back() }])
            } catch (err) {
              Alert.alert("Error", err instanceof Error ? err.message : "No se pudo actualizar.")
            } finally {
              setLoading(false)
            }
          },
        },
      ]
    )
  }

  const inputStyle = { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 12 }
  const labelStyle = { fontSize: 11, fontWeight: "700" as const, color: "#6b7280", textTransform: "uppercase" as const, marginBottom: 4, marginLeft: 2 }

  if (fetching) return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Información básica */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Información básica</Text>
          <Text style={labelStyle}>Título *</Text>
          <TextInput value={form.title} onChangeText={(v) => update("title", v)} placeholder="Campo agrícola en Pergamino — 500 ha" placeholderTextColor="#9ca3af" style={inputStyle} />
          <Text style={labelStyle}>Descripción</Text>
          <TextInput value={form.description} onChangeText={(v) => update("description", v)} placeholder="Describí el campo en detalle..." placeholderTextColor="#9ca3af" multiline numberOfLines={4} textAlignVertical="top" style={[inputStyle, { height: 100 }]} />
        </View>

        {/* Estado */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 4 }}>Visibilidad</Text>
          <Text style={{ fontSize: 12, color: "#6b7280", marginBottom: 14 }}>Solo las publicaciones <Text style={{ fontWeight: "700", color: "#1a4731" }}>Activas</Text> son visibles al público.</Text>
          <View style={{ gap: 10 }}>
            {([
              { value: "active", label: "Activa", desc: "Visible en explorar y mapa", icon: "🟢" },
              { value: "paused", label: "Pausada", desc: "Oculta temporalmente, podés reactivarla", icon: "⏸️" },
              { value: "draft",  label: "Borrador", desc: "Guardada sin publicar", icon: "📝" },
            ] as const).map(({ value, label, desc, icon }) => (
              <TouchableOpacity
                key={value}
                onPress={() => update("status", value)}
                style={{
                  flexDirection: "row", alignItems: "center", gap: 12,
                  paddingVertical: 12, paddingHorizontal: 14, borderRadius: 12,
                  backgroundColor: form.status === value ? "#f0fdf4" : "#fff",
                  borderWidth: 1.5, borderColor: form.status === value ? "#1a4731" : "#e5e7eb",
                }}
              >
                <Text style={{ fontSize: 18 }}>{icon}</Text>
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: "700", color: form.status === value ? "#1a4731" : "#111827" }}>{label}</Text>
                  <Text style={{ fontSize: 12, color: "#6b7280", marginTop: 1 }}>{desc}</Text>
                </View>
                <View style={{ width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: form.status === value ? "#1a4731" : "#d1d5db", backgroundColor: form.status === value ? "#1a4731" : "#fff", alignItems: "center", justifyContent: "center" }}>
                  {form.status === value && <View style={{ width: 8, height: 8, borderRadius: 4, backgroundColor: "#fff" }} />}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Modalidad */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Modalidad</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            {(["for_sale", "for_rent"] as const).map((mode) => (
              <TouchableOpacity key={mode} onPress={() => toggleMode(mode)} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
                <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form[mode] ? "#1a4731" : "#d1d5db", backgroundColor: form[mode] ? "#1a4731" : "#fff", alignItems: "center", justifyContent: "center" }}>
                  {form[mode] && <Text style={{ color: "#fff", fontSize: 13, lineHeight: 16 }}>✓</Text>}
                </View>
                <Text style={{ fontSize: 15, color: "#111827" }}>{mode === "for_sale" ? "En venta" : "En arrendamiento"}</Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Ubicación */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Ubicación</Text>
          <Text style={labelStyle}>Provincia *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {PROVINCES.map((p) => (
                <TouchableOpacity key={p} onPress={() => update("province", p)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: form.province === p ? "#1a4731" : "#d1d5db", backgroundColor: form.province === p ? "#1a4731" : "#fff" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: form.province === p ? "#fff" : "#374151" }}>{p}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text style={labelStyle}>Partido / Departamento</Text>
          <TextInput value={form.partido} onChangeText={(v) => update("partido", v)} placeholder="Pergamino" placeholderTextColor="#9ca3af" style={inputStyle} />
          <Text style={labelStyle}>Localidad</Text>
          <TextInput value={form.locality} onChangeText={(v) => update("locality", v)} placeholder="Pergamino" placeholderTextColor="#9ca3af" style={inputStyle} />
          <View style={{ flexDirection: "row", gap: 12 }}>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Latitud</Text>
              <TextInput value={form.lat} onChangeText={(v) => update("lat", v)} placeholder="-34.6037" placeholderTextColor="#9ca3af" keyboardType="numbers-and-punctuation" style={inputStyle} />
            </View>
            <View style={{ flex: 1 }}>
              <Text style={labelStyle}>Longitud</Text>
              <TextInput value={form.lng} onChangeText={(v) => update("lng", v)} placeholder="-58.3816" placeholderTextColor="#9ca3af" keyboardType="numbers-and-punctuation" style={inputStyle} />
            </View>
          </View>
        </View>

        {/* Datos del campo */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Datos del campo</Text>
          <Text style={labelStyle}>Tipo de campo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {fieldTypes.map((ft) => {
                const selected = form.field_type_ids.includes(ft.id)
                return (
                  <TouchableOpacity key={ft.id} onPress={() => update("field_type_ids", selected ? form.field_type_ids.filter((x) => x !== ft.id) : [...form.field_type_ids, ft.id])} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: selected ? "#1a4731" : "#d1d5db", backgroundColor: selected ? "#1a4731" : "#fff" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: selected ? "#fff" : "#374151" }}>{ft.name}</Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>
          <Text style={labelStyle}>Superficie (ha)</Text>
          <TextInput value={form.surface_ha} onChangeText={(v) => update("surface_ha", v)} placeholder="500" placeholderTextColor="#9ca3af" keyboardType="numeric" style={inputStyle} />
          {form.for_sale && (
            <View style={{ flexDirection: "row", gap: 12 }}>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>Precio total (USD)</Text>
                <TextInput value={form.price_usd} onChangeText={(v) => update("price_usd", v)} placeholder="3.500.000" placeholderTextColor="#9ca3af" keyboardType="numeric" style={inputStyle} />
              </View>
              <View style={{ flex: 1 }}>
                <Text style={labelStyle}>USD/ha</Text>
                <TextInput value={form.price_per_ha_usd} onChangeText={(v) => update("price_per_ha_usd", v)} placeholder="7.000" placeholderTextColor="#9ca3af" keyboardType="numeric" style={inputStyle} />
              </View>
            </View>
          )}
        </View>

        {/* Arrendamiento */}
        {form.for_rent && (
          <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Condiciones de arrendamiento</Text>
            <Text style={{ ...labelStyle, color: "#6b7280" }}>Unidad del canon *</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {Object.entries(RENT_UNIT_LABELS).map(([key, label]) => (
                <TouchableOpacity key={key} onPress={() => { update("rent_unit", key); if (key !== "quintales") update("rent_crop", "") }} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: form.rent_unit === key ? "#2563eb" : "#93c5fd", backgroundColor: form.rent_unit === key ? "#2563eb" : "#fff" }}>
                  <Text style={{ fontSize: 13, fontWeight: "600", color: form.rent_unit === key ? "#fff" : "#1d4ed8" }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>
            {form.rent_unit === "quintales" && (
              <>
                <Text style={{ ...labelStyle, color: "#6b7280" }}>Cultivo *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 12 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {[...RENT_CROPS, "Otro"].map((crop) => (
                      <TouchableOpacity key={crop} onPress={() => { setCropPreset(crop); update("rent_crop", crop === "Otro" ? "" : crop) }} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: cropPreset === crop ? "#2563eb" : "#93c5fd", backgroundColor: cropPreset === crop ? "#2563eb" : "#fff" }}>
                        <Text style={{ fontSize: 13, fontWeight: "600", color: cropPreset === crop ? "#fff" : "#1d4ed8" }}>{crop}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
                {cropPreset === "Otro" && <TextInput value={form.rent_crop} onChangeText={(v) => update("rent_crop", v)} placeholder="Especificá el cultivo" placeholderTextColor="#93c5fd" style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 14 }} />}
              </>
            )}
            <Text style={{ ...labelStyle, color: "#6b7280" }}>Valor del canon *</Text>
            <TextInput value={form.rent_price_per_ha} onChangeText={(v) => update("rent_price_per_ha", v)} placeholder="18" keyboardType="numeric" placeholderTextColor="#93c5fd" style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 14 }} />
            <Text style={{ ...labelStyle, color: "#6b7280" }}>Frecuencia de pago</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {Object.entries(RENT_PAYMENT_FREQUENCY_LABELS).map(([key, label]) => (
                  <TouchableOpacity key={key} onPress={() => update("rent_payment_frequency", key)} style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: form.rent_payment_frequency === key ? "#2563eb" : "#93c5fd", backgroundColor: form.rent_payment_frequency === key ? "#2563eb" : "#fff" }}>
                    <Text style={{ fontSize: 13, fontWeight: "600", color: form.rent_payment_frequency === key ? "#fff" : "#1d4ed8" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>
            <Text style={{ ...labelStyle, color: "#6b7280" }}>Condiciones adicionales</Text>
            <TextInput value={form.rent_observations} onChangeText={(v) => update("rent_observations", v)} placeholder="Ej: se requiere experiencia en soja..." multiline numberOfLines={3} textAlignVertical="top" placeholderTextColor="#93c5fd" style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", height: 80 }} />
          </View>
        )}

        {/* Contacto */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Contacto</Text>
          <Text style={labelStyle}>Nombre</Text>
          <TextInput value={form.contact_name} onChangeText={(v) => update("contact_name", v)} placeholder="Juan Martínez" placeholderTextColor="#9ca3af" style={inputStyle} />
          <Text style={labelStyle}>Email</Text>
          <TextInput value={form.contact_email} onChangeText={(v) => update("contact_email", v)} placeholder="juan@ejemplo.com" placeholderTextColor="#9ca3af" keyboardType="email-address" autoCapitalize="none" style={inputStyle} />
          <Text style={labelStyle}>Teléfono</Text>
          <TextInput value={form.contact_phone} onChangeText={(v) => update("contact_phone", v)} placeholder="+54 11 0000-0000" placeholderTextColor="#9ca3af" keyboardType="phone-pad" style={inputStyle} />
          <Text style={labelStyle}>WhatsApp</Text>
          <TextInput value={form.contact_whatsapp} onChangeText={(v) => update("contact_whatsapp", v)} placeholder="+541100000000" placeholderTextColor="#9ca3af" keyboardType="phone-pad" style={inputStyle} />
        </View>

        {/* Fotos y videos */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 4 }}>Fotos y videos</Text>
          <Text style={{ fontSize: 12, color: "#9ca3af", marginBottom: 12 }}>Hasta 20 archivos. La primera foto es la portada.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View style={{ flexDirection: "row", gap: 8 }}>
              {/* Imágenes existentes (ya subidas) */}
              {existingImages.map((img) => (
                <View key={img.id} style={{ position: "relative" }}>
                  <Image source={{ uri: img.url }} style={{ width: 80, height: 80, borderRadius: 10 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => Alert.alert("Eliminar imagen", "¿Querés eliminar esta imagen?", [
                      { text: "Cancelar", style: "cancel" },
                      { text: "Eliminar", style: "destructive", onPress: () => removeExistingImage(img) },
                    ])}
                    style={{ position: "absolute", top: 3, right: 3, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                  {img.type === "video" && (
                    <View style={{ position: "absolute", bottom: 3, left: 3, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>VIDEO</Text>
                    </View>
                  )}
                </View>
              ))}

              {/* Imágenes nuevas (pendientes de subir) */}
              {newImages.map((img) => (
                <View key={img.uri} style={{ position: "relative" }}>
                  <Image source={{ uri: img.uri }} style={{ width: 80, height: 80, borderRadius: 10, opacity: 0.7 }} resizeMode="cover" />
                  <TouchableOpacity
                    onPress={() => setNewImages((prev) => prev.filter((i) => i.uri !== img.uri))}
                    style={{ position: "absolute", top: 3, right: 3, backgroundColor: "rgba(0,0,0,0.6)", borderRadius: 10, width: 20, height: 20, alignItems: "center", justifyContent: "center" }}
                  >
                    <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>✕</Text>
                  </TouchableOpacity>
                  <View style={{ position: "absolute", bottom: 3, left: 3, backgroundColor: "rgba(37,99,235,0.8)", borderRadius: 4, paddingHorizontal: 4, paddingVertical: 1 }}>
                    <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>NUEVO</Text>
                  </View>
                </View>
              ))}

              {/* Botón agregar */}
              {existingImages.length + newImages.length < 20 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={{ width: 80, height: 80, borderRadius: 10, borderWidth: 2, borderStyle: "dashed", borderColor: "#d1d5db", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#9ca3af", fontSize: 28 }}>+</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {uploadProgress ? (
            <Text style={{ fontSize: 12, color: "#1a4731", fontWeight: "600", marginTop: 8 }}>{uploadProgress}</Text>
          ) : null}
        </View>

        {/* Acciones */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={loading}
          style={{ backgroundColor: "#1a4731", borderRadius: 16, paddingVertical: 16, alignItems: "center", marginBottom: 12 }}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Guardar cambios</Text>}
        </TouchableOpacity>

        <TouchableOpacity
          onPress={handleMarkSold}
          disabled={loading || form.status === "sold"}
          style={{ borderWidth: 1.5, borderColor: form.status === "sold" ? "#d1d5db" : "#2563eb", borderRadius: 16, paddingVertical: 16, alignItems: "center" }}
        >
          <Text style={{ color: form.status === "sold" ? "#9ca3af" : "#2563eb", fontWeight: "700", fontSize: 16 }}>
            {form.status === "sold" ? "Ya marcada como vendida" : "Marcar como vendida"}
          </Text>
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
