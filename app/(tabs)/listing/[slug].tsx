import { useEffect, useState, useRef } from "react"
import { ScrollView, View, Text, TouchableOpacity, ActivityIndicator, Image, Linking, TextInput, Alert, Dimensions } from "react-native"
import { useLocalSearchParams, useNavigation } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatNumber, formatRentCanon } from "@/lib/utils"
import { RENT_PAYMENT_FREQUENCY_LABELS } from "@/types"
import type { Listing } from "@/types"

const SCREEN_WIDTH = Dimensions.get("window").width

export default function ListingDetailScreen() {
  const { slug } = useLocalSearchParams<{ slug: string }>()
  const navigation = useNavigation()
  const scrollRef = useRef<ScrollView>(null)
  const [listing, setListing] = useState<Listing | null>(null)
  const [images, setImages] = useState<{ url: string; type?: string }[]>([])
  const [activeImage, setActiveImage] = useState(0)
  const [loading, setLoading] = useState(true)
  const [form, setForm] = useState({ name: "", email: "", phone: "", message: "" })
  const [sending, setSending] = useState(false)

  useEffect(() => {
    scrollRef.current?.scrollTo({ y: 0, animated: false })
    setListing(null)
    setImages([])
    setActiveImage(0)
    setLoading(true)
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

  const forSale = listing.for_sale !== false
  const forRent = listing.for_rent === true
  const rentCanon = forRent ? formatRentCanon(listing.rent_unit, listing.rent_price_per_ha, listing.rent_crop) : ""
  const rentFreq = listing.rent_payment_frequency ? RENT_PAYMENT_FREQUENCY_LABELS[listing.rent_payment_frequency] : ""

  return (
    <ScrollView ref={scrollRef} className="flex-1 bg-white">
      {/* Carrusel de imágenes */}
      <View style={{ height: 240, backgroundColor: "#111" }}>
        {images.length > 0 ? (
          <>
            <Image
              source={{ uri: images[activeImage].url }}
              style={{ width: SCREEN_WIDTH, height: 240 }}
              resizeMode="cover"
            />

            {images.length > 1 && (
              <>
                <TouchableOpacity
                  onPress={() => setActiveImage((i) => (i - 1 + images.length) % images.length)}
                  style={{ position: "absolute", left: 12, top: "50%", marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontSize: 22, lineHeight: 28 }}>‹</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setActiveImage((i) => (i + 1) % images.length)}
                  style={{ position: "absolute", right: 12, top: "50%", marginTop: -20, width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(0,0,0,0.5)", alignItems: "center", justifyContent: "center" }}
                >
                  <Text style={{ color: "#fff", fontSize: 22, lineHeight: 28 }}>›</Text>
                </TouchableOpacity>

                <View style={{ position: "absolute", bottom: 10, right: 12, backgroundColor: "rgba(0,0,0,0.5)", borderRadius: 12, paddingHorizontal: 10, paddingVertical: 4 }}>
                  <Text style={{ color: "#fff", fontSize: 12 }}>Imagen {activeImage + 1} / {images.length}</Text>
                </View>

                <View style={{ position: "absolute", bottom: 10, left: 0, right: 0, flexDirection: "row", justifyContent: "center", gap: 4 }}>
                  {images.map((_, i) => (
                    <TouchableOpacity key={i} onPress={() => setActiveImage(i)}>
                      <View style={{ width: i === activeImage ? 16 : 6, height: 6, borderRadius: 3, backgroundColor: i === activeImage ? "#fff" : "rgba(255,255,255,0.5)" }} />
                    </TouchableOpacity>
                  ))}
                </View>
              </>
            )}
          </>
        ) : (
          <View style={{ width: SCREEN_WIDTH, height: 240, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 60 }}>🌾</Text>
          </View>
        )}

      </View>

      <View className="px-5 pt-5">
        {listing.status === "sold" && (
          <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 12, padding: 12, flexDirection: "row", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 10, paddingVertical: 3, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>VENDIDO</Text>
            </View>
            <Text style={{ color: "#1e40af", fontSize: 13 }}>Este campo ya fue vendido.</Text>
          </View>
        )}

        {/* Título */}
        <Text className="text-2xl font-bold text-gray-900">{listing.title}</Text>
        <Text className="text-gray-500 text-sm mt-1">
          {[listing.locality, listing.partido, listing.province].filter(Boolean).join(", ")}
        </Text>

        {/* Modalidad badges */}
        <View style={{ flexDirection: "row", gap: 8, marginTop: 10, marginBottom: 4 }}>
          {forSale && (
            <View style={{ backgroundColor: "#1a4731", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>EN VENTA</Text>
            </View>
          )}
          {forRent && (
            <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 10, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>EN ARRENDAMIENTO</Text>
            </View>
          )}
        </View>

        {/* Precio de venta */}
        {forSale && (
          <View className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
            {listing.price_usd ? (
              <Text className="text-3xl font-bold text-primary">{formatCurrency(listing.price_usd)}</Text>
            ) : (
              <Text className="text-gray-400 text-base italic">Consultar precio de venta</Text>
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
        )}

        {/* Datos básicos si no está en venta */}
        {!forSale && rows.length > 0 && (
          <View className="bg-gray-50 rounded-xl p-4 mt-4 border border-gray-200">
            {rows.map((r) => (
              <View key={r.label} className="flex-row justify-between py-1">
                <Text className="text-gray-500 text-sm">{r.label}</Text>
                <Text className="text-gray-900 text-sm font-medium">{r.value}</Text>
              </View>
            ))}
          </View>
        )}

        {/* Bloque de arrendamiento */}
        {forRent && rentCanon && (
          <View style={{ backgroundColor: "#eff6ff", borderWidth: 1, borderColor: "#bfdbfe", borderRadius: 12, padding: 16, marginTop: 12 }}>
            <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 10 }}>Arrendamiento</Text>
            <View style={{ gap: 8 }}>
              <View>
                <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>Canon</Text>
                <Text style={{ fontSize: 16, fontWeight: "700", color: "#1e40af" }}>{rentCanon}</Text>
              </View>
              {rentFreq ? (
                <View>
                  <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>Frecuencia de pago</Text>
                  <Text style={{ fontSize: 14, fontWeight: "600", color: "#111827" }}>{rentFreq}</Text>
                </View>
              ) : null}
              {listing.rent_observations ? (
                <View>
                  <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 2 }}>Condiciones adicionales</Text>
                  <Text style={{ fontSize: 13, color: "#374151", lineHeight: 18 }}>{listing.rent_observations}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* WhatsApp */}
        {listing.contact_whatsapp && listing.status !== "sold" && (
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
        {listing.status !== "sold" && (
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
        )}
      </View>
    </ScrollView>
  )
}
