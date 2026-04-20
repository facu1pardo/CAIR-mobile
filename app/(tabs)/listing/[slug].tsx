import { useEffect, useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Image, Linking, TextInput, Alert } from "react-native"
import { useLocalSearchParams, useNavigation } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { Listing } from "@/types"

export default function ListingDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const navigation = useNavigation()
  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<{ url: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    apiFetch<{ listing: Listing; images: { url: string }[] }>(`/api/mobile/listings/${slug}`)
      .then((d) => {
        setListing(d.listing)
        setImages(d.images)
        navigation.setOptions({ title: d.listing.title })
      })
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [slug])

  async function sendInquiry() {
    if (!form.name || !form.email || !form.message) return Alert.alert("Completá nombre, email y mensaje")
    setSending(true)
    try {
      await apiFetch("/api/inquiries", {
        method: "POST",
        body: JSON.stringify({ listing_id: listing?.id, ...form }),
      })
      Alert.alert("¡Consulta enviada!", "Nos pondremos en contacto pronto.")
      setForm({ name: "", email: "", phone: "", message: "" })
    } catch {
      Alert.alert("Error", "No se pudo enviar la consulta")
    } finally {
      setSending(false)
    }
  }

  if (loading) return <ActivityIndicator color="#1a4731" className="flex-1 mt-20" />
  if (!listing) return <View className="flex-1 items-center justify-center"><Text>Campo no encontrado</Text></View>

  const rows = [
    { label: "Superficie", value: listing.surface_ha ? `${formatNumber(listing.surface_ha)} ha` : null },
    { label: "Tipo", value: listing.field_type_name },
    { label: "Provincia", value: listing.province },
    { label: "Partido", value: listing.partido },
    { label: "Localidad", value: listing.locality },
  ].filter((r) => r.value)

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Imagen principal */}
      {images.length > 0 ? (
        <Image source={{ uri: images[0].url }} className="w-full h-56" resizeMode="cover" />
      ) : (
        <View className="w-full h-56 bg-gray-100 items-center justify-center">
          <Text className="text-6xl">🌾</Text>
        </View>
      )}

      <View className="px-5 pt-5">
        {/* Título */}
        <Text className="text-2xl font-bold text-gray-900">{listing.title}</Text>
        <Text className="text-gray-500 text-sm mt-1">
          {[listing.locality, listing.partido, listing.province].filter(Boolean).join(", ")}
        </Text>

        {/* Precio */}
        <View className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
          {listing.price_usd && (
            <Text className="text-3xl font-bold text-primary">{formatCurrency(listing.price_usd)}</Text>
          )}
          {listing.price_per_ha_usd && (
            <Text className="text-gray-500 text-sm mt-1">{formatCurrency(listing.price_per_ha_usd)}/ha</Text>
          )}

          {rows.length > 0 && (
            <View className="mt-3 pt-3 border-t border-gray-200">
              {rows.map((r) => (
                <View key={r.label} className="flex-row justify-between py-1">
                  <Text className="text-gray-500 text-sm">{r.label}</Text>
                  <Text className="text-gray-900 text-sm font-medium">{r.value}</Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* WhatsApp */}
        {listing.contact_whatsapp && (
          <TouchableOpacity
            onPress={() => Linking.openURL(`https://wa.me/${listing.contact_whatsapp?.replace(/\D/g, "")}`)}
            className="bg-green-500 rounded-xl py-4 items-center mt-4 flex-row justify-center gap-2"
          >
            <Text className="text-white text-xl">💬</Text>
            <Text className="text-white font-bold text-base">Consultar por WhatsApp</Text>
          </TouchableOpacity>
        )}

        {/* Descripción */}
        {listing.description && (
          <View className="mt-6">
            <Text className="text-lg font-semibold text-gray-900 mb-2">Descripción</Text>
            <Text className="text-gray-600 leading-relaxed">{listing.description}</Text>
          </View>
        )}

        {/* Empresa */}
        {listing.company_name && (
          <View className="bg-gray-50 rounded-xl p-4 mt-6 border border-gray-200">
            <Text className="text-xs text-gray-500 mb-1">Publicado por</Text>
            <Text className="font-semibold text-primary">{listing.company_name}</Text>
          </View>
        )}

        {/* Formulario de consulta */}
        <View className="mt-6 mb-10">
          <Text className="text-lg font-semibold text-gray-900 mb-4">Enviar consulta</Text>
          {[
            { key: "name", label: "Nombre *", placeholder: "Tu nombre" },
            { key: "email", label: "Email *", placeholder: "tu@email.com", keyboard: "email-address" as const },
            { key: "phone", label: "Teléfono", placeholder: "+54 11 0000-0000", keyboard: "phone-pad" as const },
            { key: "message", label: "Mensaje *", placeholder: "Hola, me interesa este campo...", multiline: true },
          ].map((f) => (
            <View key={f.key} className="mb-4">
              <Text className="text-sm font-medium text-gray-700 mb-1">{f.label}</Text>
              <TextInput
                value={form[f.key as keyof typeof form]}
                onChangeText={(v) => setForm((prev) => ({ ...prev, [f.key]: v }))}
                placeholder={f.placeholder}
                placeholderTextColor="#9ca3af"
                keyboardType={f.keyboard ?? "default"}
                multiline={f.multiline}
                numberOfLines={f.multiline ? 4 : 1}
                className={`border border-gray-300 rounded-lg px-4 py-3 text-gray-900 ${f.multiline ? "h-24 text-top" : ""}`}
              />
            </View>
          ))}
          <TouchableOpacity
            onPress={sendInquiry}
            disabled={sending}
            className="bg-primary rounded-xl py-4 items-center"
          >
            {sending ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text className="text-white font-bold text-base">Enviar consulta</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </ScrollView>
  )
}
