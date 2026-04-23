import { useEffect, useState } from "react"
import { ScrollView, View, Text, TouchableOpacity, TextInput, ActivityIndicator, Image } from "react-native"
import { useRouter } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { Listing } from "@/types"

const FIELD_TYPE_ICONS: Record<string, string> = {
  agricola: "🌾", ganadero: "🐄", tambero: "🥛", forestal: "🌲",
}

export default function HomeScreen() {
  const router = useRouter()
  const [featured, setFeatured] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState("")

  useEffect(() => {
    apiFetch<{ listings: Listing[] }>("/api/mobile/listings?featured=true&limit=6")
      .then((d) => setFeatured(d.listings))
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [])

  return (
    <ScrollView className="flex-1 bg-white">
      {/* Hero */}
      <View className="bg-primary px-5 pt-8 pb-10">
        <Text className="text-white text-3xl font-bold mb-1">Tu próximo campo,</Text>
        <Text className="text-secondary text-3xl font-bold mb-4">acá está</Text>
        <Text className="text-green-200 text-sm mb-5">
          La vidriera digital de inmobiliaria rural más completa de Argentina.
        </Text>
        <View className="flex-row gap-2">
          <TextInput
            value={search}
            onChangeText={setSearch}
            placeholder="Buscar campos..."
            placeholderTextColor="#9ca3af"
            className="flex-1 bg-white rounded-lg px-4 py-3 text-sm text-gray-900"
            returnKeyType="search"
            onSubmitEditing={() => router.push(`/(tabs)/explorar?q=${search}`)}
          />
          <TouchableOpacity
            onPress={() => router.push(`/(tabs)/explorar?q=${search}`)}
            className="bg-secondary rounded-lg px-4 py-3 items-center justify-center"
          >
            <Text className="text-white font-bold">Buscar</Text>
          </TouchableOpacity>
        </View>
      </View>

      {/* Tipos de campo */}
      <View className="px-5 pt-6">
        <Text className="text-lg font-bold text-gray-900 mb-3">Explorá por tipo</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} className="gap-3">
          {Object.entries(FIELD_TYPE_ICONS).map(([slug, icon]) => (
            <TouchableOpacity
              key={slug}
              onPress={() => router.push(`/(tabs)/explorar?tipo=${slug}`)}
              className="items-center bg-gray-50 rounded-xl p-4 mr-3 w-24"
            >
              <Text className="text-3xl mb-1">{icon}</Text>
              <Text className="text-xs text-gray-700 font-medium capitalize text-center">{slug}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Destacados */}
      <View className="px-5 pt-6 pb-8">
        <View className="flex-row items-center justify-between mb-3">
          <Text className="text-lg font-bold text-gray-900">Campos destacados</Text>
          <TouchableOpacity onPress={() => router.push("/(tabs)/explorar")}>
            <Text className="text-primary text-sm font-medium">Ver todos →</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <ActivityIndicator color="#1a4731" className="py-8" />
        ) : (
          featured.map((l) => (
            <TouchableOpacity
              key={l.id}
              onPress={() => router.push(`/listing/${l.slug}`)}
              className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4 shadow-sm"
            >
              {l.cover_image ? (
                <Image source={{ uri: l.cover_image }} className="w-full h-44" resizeMode="cover" />
              ) : (
                <View className="w-full h-44 bg-gray-100 items-center justify-center">
                  <Text className="text-4xl">🌾</Text>
                </View>
              )}
              <View className="p-4">
                <Text className="font-bold text-gray-900 text-base" numberOfLines={2}>{l.title}</Text>
                {l.province && <Text className="text-gray-500 text-sm mt-1">{l.province}</Text>}
                <View className="flex-row items-center justify-between mt-2">
                  <Text className="text-primary font-bold text-lg">{formatCurrency(l.price_usd)}</Text>
                  {l.surface_ha && (
                    <Text className="text-gray-500 text-sm">{formatNumber(l.surface_ha)} ha</Text>
                  )}
                </View>
              </View>
            </TouchableOpacity>
          ))
        )}
      </View>
    </ScrollView>
  )
}
