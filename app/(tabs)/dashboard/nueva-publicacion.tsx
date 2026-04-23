import { useState, useEffect } from "react"
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform, Image
} from "react-native"
import { useRouter } from "expo-router"
import * as ImagePicker from "expo-image-picker"
import * as SecureStore from "expo-secure-store"
import Constants from "expo-constants"
import { apiFetch } from "@/lib/api"
import { PROVINCES } from "@/lib/utils"
import { RENT_CROPS, RENT_UNIT_LABELS, RENT_PAYMENT_FREQUENCY_LABELS } from "@/types"

const API_URL = Constants.expoConfig?.extra?.apiUrl ?? "https://cair-app.vercel.app"

interface FieldType { id: number; name: string; slug: string }
interface SelectedImage { uri: string; type: string; name: string }

export default function NuevaPublicacion() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [fieldTypes, setFieldTypes] = useState<FieldType[]>([])
  const [images, setImages] = useState<SelectedImage[]>([])
  const [uploadProgress, setUploadProgress] = useState("")
  const [cropPreset, setCropPreset] = useState("")
  const [form, setForm] = useState({
    title: "",
    description: "",
    province: "",
    partido: "",
    locality: "",
    field_type_ids: [] as number[],
    surface_ha: "",
    price_usd: "",
    price_per_ha_usd: "",
    contact_name: "",
    contact_email: "",
    contact_phone: "",
    contact_whatsapp: "",
    lat: "",
    lng: "",
    for_sale: true,
    for_rent: false,
    rent_unit: "",
    rent_price_per_ha: "",
    rent_payment_frequency: "",
    rent_observations: "",
    rent_crop: "",
  })

  useEffect(() => {
    apiFetch<{ types: FieldType[] }>("/api/mobile/field-types")
      .then((r) => setFieldTypes(r.types))
      .catch(() => {})
  }, [])

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
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images", "videos"],
      allowsMultipleSelection: true,
      quality: 0.8,
      selectionLimit: 20 - images.length,
    })
    if (!result.canceled) {
      const newImages: SelectedImage[] = result.assets.map((a) => ({
        uri: a.uri,
        type: a.mimeType ?? (a.uri.endsWith(".mp4") ? "video/mp4" : "image/jpeg"),
        name: a.fileName ?? `media_${Date.now()}`,
      }))
      setImages((prev) => [...prev, ...newImages])
    }
  }

  function removeImage(uri: string) {
    setImages((prev) => prev.filter((img) => img.uri !== uri))
  }

  async function uploadImages(listingId: string) {
    const token = await SecureStore.getItemAsync("session_token")
    for (let i = 0; i < images.length; i++) {
      const img = images[i]
      setUploadProgress(`Subiendo foto ${i + 1} de ${images.length}...`)
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
        throw new Error((err as { error?: string }).error ?? `Error subiendo foto ${i + 1}`)
      }
    }
    setUploadProgress("")
  }

  async function handleSubmit(status: "draft" | "active") {
    if (!form.title || !form.province) {
      Alert.alert("Faltan datos", "El título y la provincia son obligatorios.")
      return
    }
    if (!form.for_sale && !form.for_rent) {
      Alert.alert("Modalidad requerida", "Seleccioná al menos una modalidad: venta o arrendamiento.")
      return
    }
    if (form.for_rent) {
      if (!form.rent_unit || !form.rent_price_per_ha) {
        Alert.alert("Faltan datos de arrendamiento", "Completá la unidad y el valor del canon.")
        return
      }
      if (form.rent_unit === "quintales" && !form.rent_crop) {
        Alert.alert("Faltan datos de arrendamiento", "Especificá el cultivo para el canon en quintales.")
        return
      }
    }
    setLoading(true)
    try {
      const listing = await apiFetch<{ id: string }>("/api/mobile/listings", {
        method: "POST",
        body: JSON.stringify({
          ...form,
          status,
          field_type_ids: form.field_type_ids,
          surface_ha: form.surface_ha ? Number(form.surface_ha) : null,
          price_usd: form.for_sale && form.price_usd ? Number(form.price_usd) : null,
          price_per_ha_usd: form.for_sale && form.price_per_ha_usd ? Number(form.price_per_ha_usd) : null,
          lat: form.lat ? Number(form.lat) : null,
          lng: form.lng ? Number(form.lng) : null,
          for_sale: form.for_sale,
          for_rent: form.for_rent,
          rent_unit: form.for_rent ? form.rent_unit || null : null,
          rent_price_per_ha: form.for_rent && form.rent_price_per_ha ? Number(form.rent_price_per_ha) : null,
          rent_crop: form.for_rent ? form.rent_crop || null : null,
          rent_payment_frequency: form.for_rent ? form.rent_payment_frequency || null : null,
          rent_observations: form.for_rent ? form.rent_observations || null : null,
        }),
      })
      if (images.length > 0) {
        await uploadImages(listing.id)
      }
      Alert.alert("Listo", status === "active" ? "Publicación creada." : "Borrador guardado.", [
        { text: "OK", onPress: () => router.back() },
      ])
    } catch (err) {
      Alert.alert("Error", err instanceof Error ? err.message : "No se pudo guardar.")
    } finally {
      setLoading(false)
    }
  }

  const inputClass = "border border-gray-300 rounded-xl px-4 py-3 text-sm text-gray-900 bg-white mb-3"
  const labelClass = "text-xs font-semibold text-gray-500 uppercase mb-1 ml-1"

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-gray-50">
      <ScrollView contentContainerStyle={{ padding: 16, paddingBottom: 40 }}>

        {/* Header */}
        <View className="flex-row items-center mb-5">
          <TouchableOpacity onPress={() => router.back()} className="mr-3 bg-gray-100 rounded-full px-4 py-2">
            <Text className="text-gray-600 font-medium">‹ Volver</Text>
          </TouchableOpacity>
          <Text className="text-xl font-bold text-gray-900">Nueva publicación</Text>
        </View>

        {/* Información básica */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">Información básica</Text>
          <Text className={labelClass}>Título *</Text>
          <TextInput
            value={form.title}
            onChangeText={(v) => update("title", v)}
            placeholder="Campo agrícola en Pergamino — 500 ha"
            className={inputClass}
          />
          <Text className={labelClass}>Descripción</Text>
          <TextInput
            value={form.description}
            onChangeText={(v) => update("description", v)}
            placeholder="Describí el campo en detalle..."
            multiline
            numberOfLines={4}
            textAlignVertical="top"
            className={inputClass}
            style={{ height: 100 }}
          />
        </View>

        {/* Modalidad */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">Modalidad</Text>
          <View style={{ flexDirection: "row", gap: 20 }}>
            <TouchableOpacity onPress={() => toggleMode("for_sale")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form.for_sale ? "#1a4731" : "#d1d5db", backgroundColor: form.for_sale ? "#1a4731" : "#fff", alignItems: "center", justifyContent: "center" }}>
                {form.for_sale && <Text style={{ color: "#fff", fontSize: 13, lineHeight: 16 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 15, color: "#111827" }}>En venta</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => toggleMode("for_rent")} style={{ flexDirection: "row", alignItems: "center", gap: 8 }}>
              <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: form.for_rent ? "#2563eb" : "#d1d5db", backgroundColor: form.for_rent ? "#2563eb" : "#fff", alignItems: "center", justifyContent: "center" }}>
                {form.for_rent && <Text style={{ color: "#fff", fontSize: 13, lineHeight: 16 }}>✓</Text>}
              </View>
              <Text style={{ fontSize: 15, color: "#111827" }}>En arrendamiento</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Ubicación */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">Ubicación</Text>
          <Text className={labelClass}>Provincia *</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2 flex-wrap">
              {PROVINCES.map((p) => (
                <TouchableOpacity
                  key={p}
                  onPress={() => update("province", p)}
                  className={`px-3 py-2 rounded-full border text-xs ${
                    form.province === p
                      ? "bg-primary border-primary"
                      : "bg-white border-gray-300"
                  }`}
                >
                  <Text className={`text-xs font-medium ${form.province === p ? "text-white" : "text-gray-700"}`}>
                    {p}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
          <Text className={labelClass}>Partido / Departamento</Text>
          <TextInput value={form.partido} onChangeText={(v) => update("partido", v)} placeholder="Pergamino" className={inputClass} />
          <Text className={labelClass}>Localidad</Text>
          <TextInput value={form.locality} onChangeText={(v) => update("locality", v)} placeholder="Pergamino" className={inputClass} />

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className={labelClass}>Latitud</Text>
              <TextInput
                value={form.lat}
                onChangeText={(v) => update("lat", v)}
                placeholder="-34.6037"
                keyboardType="numbers-and-punctuation"
                className={inputClass}
              />
            </View>
            <View className="flex-1">
              <Text className={labelClass}>Longitud</Text>
              <TextInput
                value={form.lng}
                onChangeText={(v) => update("lng", v)}
                placeholder="-58.3816"
                keyboardType="numbers-and-punctuation"
                className={inputClass}
              />
            </View>
          </View>

          <View className="bg-green-50 border border-green-200 rounded-xl px-3 py-2 mt-1">
            <Text className="text-green-800 text-xs">
              🗺️ Si completás la latitud y longitud, tu campo se verá reflejado en el Mapa interactivo. Podés obtenerlas haciendo clic largo sobre el punto en Google Maps.
            </Text>
          </View>
        </View>

        {/* Datos del campo */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">Datos del campo</Text>

          <Text className={labelClass}>Tipo de campo</Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} className="mb-3">
            <View className="flex-row gap-2">
              {fieldTypes.map((ft) => {
                const selected = form.field_type_ids.includes(ft.id)
                return (
                  <TouchableOpacity
                    key={ft.id}
                    onPress={() => update("field_type_ids", selected
                      ? form.field_type_ids.filter((id) => id !== ft.id)
                      : [...form.field_type_ids, ft.id]
                    )}
                    className={`px-3 py-2 rounded-full border ${selected ? "bg-primary border-primary" : "bg-white border-gray-300"}`}
                  >
                    <Text className={`text-xs font-medium ${selected ? "text-white" : "text-gray-700"}`}>
                      {ft.name}
                    </Text>
                  </TouchableOpacity>
                )
              })}
            </View>
          </ScrollView>

          <View className="flex-row gap-3">
            <View className="flex-1">
              <Text className={labelClass}>Superficie (ha)</Text>
              <TextInput
                value={form.surface_ha}
                onChangeText={(v) => update("surface_ha", v)}
                placeholder="500"
                keyboardType="numeric"
                className={inputClass}
              />
            </View>
          </View>

          {form.for_sale && (
            <>
              <View className="flex-row gap-3">
                <View className="flex-1">
                  <Text className={labelClass}>Precio total (USD)</Text>
                  <TextInput
                    value={form.price_usd}
                    onChangeText={(v) => update("price_usd", v)}
                    placeholder="3.500.000"
                    keyboardType="numeric"
                    className={inputClass}
                  />
                </View>
                <View className="flex-1">
                  <Text className={labelClass}>Precio por ha (USD/ha)</Text>
                  <TextInput
                    value={form.price_per_ha_usd}
                    onChangeText={(v) => update("price_per_ha_usd", v)}
                    placeholder="7.000"
                    keyboardType="numeric"
                    className={inputClass}
                  />
                </View>
              </View>

              {form.surface_ha && form.price_usd && form.price_per_ha_usd ? (
                <View className="bg-green-50 border border-green-200 rounded-xl p-3 mt-1">
                  <Text className="text-green-800 text-xs font-medium">
                    {form.surface_ha} ha × USD {Number(form.price_per_ha_usd).toLocaleString()}/ha = USD {Number(form.price_usd).toLocaleString()}
                  </Text>
                </View>
              ) : null}
            </>
          )}
        </View>

        {/* Arrendamiento */}
        {form.for_rent && (
          <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 16, padding: 16, marginBottom: 16 }}>
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Condiciones de arrendamiento</Text>

            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Unidad del canon *</Text>
            <View style={{ flexDirection: "row", gap: 8, marginBottom: 14 }}>
              {Object.entries(RENT_UNIT_LABELS).map(([key, label]) => (
                <TouchableOpacity
                  key={key}
                  onPress={() => { update("rent_unit", key); if (key !== "quintales") update("rent_crop", "") }}
                  style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: form.rent_unit === key ? "#2563eb" : "#93c5fd", backgroundColor: form.rent_unit === key ? "#2563eb" : "#fff" }}
                >
                  <Text style={{ fontSize: 13, fontWeight: "600", color: form.rent_unit === key ? "#fff" : "#1d4ed8" }}>{label}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {form.rent_unit === "quintales" && (
              <>
                <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Cultivo *</Text>
                <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 6 }}>
                  <View style={{ flexDirection: "row", gap: 8 }}>
                    {RENT_CROPS.map((crop) => (
                      <TouchableOpacity
                        key={crop}
                        onPress={() => { setCropPreset(crop); update("rent_crop", crop) }}
                        style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: cropPreset === crop ? "#2563eb" : "#93c5fd", backgroundColor: cropPreset === crop ? "#2563eb" : "#fff" }}
                      >
                        <Text style={{ fontSize: 13, fontWeight: "600", color: cropPreset === crop ? "#fff" : "#1d4ed8" }}>{crop}</Text>
                      </TouchableOpacity>
                    ))}
                    <TouchableOpacity
                      onPress={() => { setCropPreset("Otro"); update("rent_crop", "") }}
                      style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: cropPreset === "Otro" ? "#2563eb" : "#93c5fd", backgroundColor: cropPreset === "Otro" ? "#2563eb" : "#fff" }}
                    >
                      <Text style={{ fontSize: 13, fontWeight: "600", color: cropPreset === "Otro" ? "#fff" : "#1d4ed8" }}>Otro</Text>
                    </TouchableOpacity>
                  </View>
                </ScrollView>
                {cropPreset === "Otro" && (
                  <TextInput
                    value={form.rent_crop}
                    onChangeText={(v) => update("rent_crop", v)}
                    placeholder="Especificá el cultivo"
                    placeholderTextColor="#93c5fd"
                    style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 14 }}
                  />
                )}
              </>
            )}

            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Valor del canon *</Text>
            <TextInput
              value={form.rent_price_per_ha}
              onChangeText={(v) => update("rent_price_per_ha", v)}
              placeholder={form.rent_unit === "usd" ? "120" : "18"}
              keyboardType="numeric"
              placeholderTextColor="#93c5fd"
              style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 14 }}
            />

            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Frecuencia de pago</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ marginBottom: 14 }}>
              <View style={{ flexDirection: "row", gap: 8 }}>
                {Object.entries(RENT_PAYMENT_FREQUENCY_LABELS).map(([key, label]) => (
                  <TouchableOpacity
                    key={key}
                    onPress={() => update("rent_payment_frequency", key)}
                    style={{ paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5, borderColor: form.rent_payment_frequency === key ? "#2563eb" : "#93c5fd", backgroundColor: form.rent_payment_frequency === key ? "#2563eb" : "#fff" }}
                  >
                    <Text style={{ fontSize: 13, fontWeight: "600", color: form.rent_payment_frequency === key ? "#fff" : "#1d4ed8" }}>{label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </ScrollView>

            <Text style={{ fontSize: 11, fontWeight: "700", color: "#6b7280", textTransform: "uppercase", marginBottom: 6 }}>Condiciones adicionales</Text>
            <TextInput
              value={form.rent_observations}
              onChangeText={(v) => update("rent_observations", v)}
              placeholder="Ej: se requiere experiencia en soja, arrendatario a convenir..."
              multiline
              numberOfLines={3}
              textAlignVertical="top"
              placeholderTextColor="#93c5fd"
              style={{ borderWidth: 1.5, borderColor: "#93c5fd", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, fontSize: 14, color: "#111827", backgroundColor: "#fff", height: 80 }}
            />
          </View>
        )}

        {/* Contacto */}
        <View className="bg-white rounded-2xl p-4 mb-6 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-3">Contacto</Text>
          <Text className={labelClass}>Nombre</Text>
          <TextInput value={form.contact_name} onChangeText={(v) => update("contact_name", v)} placeholder="Juan Martínez" className={inputClass} />
          <Text className={labelClass}>Email</Text>
          <TextInput value={form.contact_email} onChangeText={(v) => update("contact_email", v)} placeholder="juan@ejemplo.com" keyboardType="email-address" autoCapitalize="none" className={inputClass} />
          <Text className={labelClass}>Teléfono</Text>
          <TextInput value={form.contact_phone} onChangeText={(v) => update("contact_phone", v)} placeholder="+54 11 0000-0000" keyboardType="phone-pad" className={inputClass} />
          <Text className={labelClass}>WhatsApp</Text>
          <TextInput value={form.contact_whatsapp} onChangeText={(v) => update("contact_whatsapp", v)} placeholder="+541100000000" keyboardType="phone-pad" className={inputClass} />
        </View>

        {/* Fotos */}
        <View className="bg-white rounded-2xl p-4 mb-4 border border-gray-200">
          <Text className="font-semibold text-gray-900 mb-1">Fotos y videos</Text>
          <Text className="text-xs text-gray-400 mb-3">Hasta 20 archivos. La primera foto será la portada.</Text>

          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            <View className="flex-row gap-2">
              {images.map((img) => (
                <View key={img.uri} className="relative">
                  <Image
                    source={{ uri: img.uri }}
                    style={{ width: 80, height: 80, borderRadius: 10 }}
                  />
                  <TouchableOpacity
                    onPress={() => removeImage(img.uri)}
                    className="absolute top-1 right-1 bg-black/60 rounded-full w-5 h-5 items-center justify-center"
                  >
                    <Text className="text-white text-xs font-bold">✕</Text>
                  </TouchableOpacity>
                </View>
              ))}
              {images.length < 20 && (
                <TouchableOpacity
                  onPress={pickImages}
                  style={{ width: 80, height: 80, borderRadius: 10 }}
                  className="border-2 border-dashed border-gray-300 items-center justify-center"
                >
                  <Text className="text-gray-400 text-2xl">+</Text>
                </TouchableOpacity>
              )}
            </View>
          </ScrollView>

          {uploadProgress ? (
            <Text className="text-xs text-green-700 font-medium mt-2">{uploadProgress}</Text>
          ) : null}
        </View>

        {/* Acciones */}
        <View className="flex-row gap-3">
          <TouchableOpacity
            onPress={() => handleSubmit("draft")}
            disabled={loading}
            className="flex-1 border border-primary rounded-2xl py-4 items-center"
          >
            {loading ? <ActivityIndicator color="#1a4731" /> : <Text className="text-primary font-semibold">Guardar borrador</Text>}
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => handleSubmit("active")}
            disabled={loading}
            className="flex-1 bg-primary rounded-2xl py-4 items-center"
          >
            {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-semibold">Publicar</Text>}
          </TouchableOpacity>
        </View>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
