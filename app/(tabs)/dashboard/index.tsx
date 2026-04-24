import { useEffect, useState, useCallback } from "react"
import { ScrollView, View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { useFocusEffect } from "@react-navigation/native"
import { useAuth } from "@/lib/auth-context"
import { apiFetch, login as apiLogin } from "@/lib/api"
import type { Listing, Inquiry } from "@/types"

type AuthView = "landing" | "login"

function LandingView({ onLogin }: { onLogin: () => void }) {
  return (
    <View className="flex-1 bg-white items-center justify-center px-6">
      <Text className="text-6xl mb-4">🏡</Text>
      <Text className="text-2xl font-bold text-gray-900 mb-2 text-center">Bienvenido a CAIR</Text>
      <Text className="text-gray-500 text-center mb-10">
        Iniciá sesión para gestionar tus publicaciones y consultas
      </Text>
      <TouchableOpacity onPress={onLogin} className="bg-primary rounded-xl py-4 px-8 w-full items-center">
        <Text className="text-white font-bold text-base">Iniciar sesión</Text>
      </TouchableOpacity>
    </View>
  )
}

function LoginView({ onBack, onSuccess }: { onBack: () => void; onSuccess: () => void }) {
  const { setUser } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return Alert.alert("Completá todos los campos")
    setLoading(true)
    try {
      const user = await apiLogin(email, password)
      setUser(user)
      onSuccess()
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <View className="flex-1 px-6">
        <TouchableOpacity onPress={onBack} style={{ marginTop: 24, marginBottom: 8, alignSelf: "flex-start", flexDirection: "row", alignItems: "center", backgroundColor: "#f3f4f6", paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 }}>
          <Text style={{ color: "#1a4731", fontSize: 18, marginRight: 4, lineHeight: 22 }}>←</Text>
          <Text style={{ color: "#1a4731", fontWeight: "600", fontSize: 14 }}>Volver</Text>
        </TouchableOpacity>

        <Text className="text-3xl font-bold text-gray-900 mt-4 mb-1">Bienvenido</Text>
        <Text className="text-gray-500 mb-8">Ingresá a tu cuenta CAIR</Text>

        <Text className="text-sm font-medium text-gray-700 mb-1">Email</Text>
        <TextInput
          value={email}
          onChangeText={setEmail}
          placeholder="tu@email.com"
          placeholderTextColor="#9ca3af"
          keyboardType="email-address"
          autoCapitalize="none"
          className="border border-gray-300 rounded-lg px-4 py-3 mb-4 text-gray-900"
        />

        <Text className="text-sm font-medium text-gray-700 mb-1">Contraseña</Text>
        <TextInput
          value={password}
          onChangeText={setPassword}
          placeholder="••••••••"
          placeholderTextColor="#9ca3af"
          secureTextEntry
          className="border border-gray-300 rounded-lg px-4 py-3 mb-6 text-gray-900"
        />

        <TouchableOpacity onPress={handleLogin} disabled={loading} className="bg-primary rounded-xl py-4 items-center">
          {loading ? <ActivityIndicator color="#fff" /> : <Text className="text-white font-bold text-base">Iniciar sesión</Text>}
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  )
}

export default function DashboardScreen() {
  const router = useRouter()
  const { user, loading, logout } = useAuth()
  const [authView, setAuthView] = useState<AuthView>("landing")
  const [listings, setListings] = useState<Listing[]>([])
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [dataLoading, setDataLoading] = useState(false)

  const loadData = useCallback(() => {
    if (!user) { setAuthView("landing"); return }
    setDataLoading(true)
    Promise.all([
      apiFetch<{ listings: Listing[] }>("/api/mobile/my-listings"),
      apiFetch<{ inquiries: Inquiry[] }>("/api/mobile/my-inquiries"),
    ])
      .then(([l, i]) => { setListings(l.listings); setInquiries(i.inquiries) })
      .catch(() => {})
      .finally(() => setDataLoading(false))
  }, [user])

  useEffect(() => { loadData() }, [loadData])
  useFocusEffect(loadData)

  if (loading) return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />

  if (!user) {
    if (authView === "login") return <LoginView onBack={() => setAuthView("landing")} onSuccess={() => setAuthView("landing")} />
    return <LandingView onLogin={() => setAuthView("login")} />
  }

  const unreadCount = inquiries.filter((i) => !i.read).length

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="bg-primary px-5 pt-6 pb-8">
        <Text className="text-green-300 text-sm">Bienvenido,</Text>
        <Text className="text-white text-2xl font-bold">{user.full_name}</Text>
        <Text className="text-green-300 text-sm mt-1">{user.email}</Text>
      </View>

      <View className="px-4 -mt-4">
        <View className="flex-row gap-3 mb-4">
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <Text className="text-2xl font-bold text-primary">{listings.length}</Text>
            <Text className="text-gray-500 text-xs mt-1">Publicaciones</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <Text className="text-2xl font-bold text-primary">{inquiries.length}</Text>
            <Text className="text-gray-500 text-xs mt-1">Consultas</Text>
          </View>
          <View className="flex-1 bg-white rounded-xl p-4 border border-gray-200 shadow-sm">
            <Text className="text-2xl font-bold text-secondary">{unreadCount}</Text>
            <Text className="text-gray-500 text-xs mt-1">Sin leer</Text>
          </View>
        </View>

        <View className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <Text className="text-gray-500 text-xs font-semibold px-4 pt-4 pb-2 uppercase tracking-wide">Publicaciones</Text>
          <TouchableOpacity onPress={() => router.push("/dashboard/nueva-publicacion")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
            <Text className="text-xl mr-3">➕</Text>
            <Text className="text-gray-900 font-medium flex-1">Nueva publicación</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => router.push("/dashboard/mis-publicaciones")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
            <Text className="text-xl mr-3">📋</Text>
            <Text className="text-gray-900 font-medium flex-1">Mis publicaciones</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
        </View>

        {user.role === "admin" && (
          <View className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
            <Text className="text-gray-500 text-xs font-semibold px-4 pt-4 pb-2 uppercase tracking-wide">Administración</Text>
            <TouchableOpacity onPress={() => router.push("/admin/metricas")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
              <Text className="text-xl mr-3">📊</Text>
              <Text className="text-gray-900 font-medium flex-1">Métricas</Text>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/admin/vendedores")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
              <Text className="text-xl mr-3">🏢</Text>
              <Text className="text-gray-900 font-medium flex-1">Vendedores</Text>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={() => router.push("/admin/publicaciones")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
              <Text className="text-xl mr-3">📋</Text>
              <Text className="text-gray-900 font-medium flex-1">Publicaciones</Text>
              <Text className="text-gray-400">›</Text>
            </TouchableOpacity>
          </View>
        )}

        <View className="bg-white rounded-xl border border-gray-200 mb-4 overflow-hidden">
          <Text className="text-gray-500 text-xs font-semibold px-4 pt-4 pb-2 uppercase tracking-wide">Consultas</Text>
          <TouchableOpacity onPress={() => router.push("/dashboard/consultas")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
            <Text className="text-xl mr-3">💬</Text>
            <Text className="text-gray-900 font-medium flex-1">Ver consultas</Text>
            {unreadCount > 0 && (
              <View className="bg-secondary rounded-full w-6 h-6 items-center justify-center mr-2">
                <Text className="text-white text-xs font-bold">{unreadCount}</Text>
              </View>
            )}
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
        </View>

        <View className="bg-white rounded-xl border border-gray-200 mb-6 overflow-hidden">
          <Text className="text-gray-500 text-xs font-semibold px-4 pt-4 pb-2 uppercase tracking-wide">Cuenta</Text>
          <TouchableOpacity onPress={() => router.push("/dashboard/suscripcion")} className="flex-row items-center px-4 py-3 border-t border-gray-100">
            <Text className="text-xl mr-3">⭐</Text>
            <Text className="text-gray-900 font-medium flex-1">Mi suscripción</Text>
            <Text className="text-gray-400">›</Text>
          </TouchableOpacity>
          <TouchableOpacity
            onPress={() => Alert.alert("Cerrar sesión", "¿Querés cerrar sesión?", [
              { text: "Cancelar", style: "cancel" },
              { text: "Salir", style: "destructive", onPress: logout },
            ])}
            className="flex-row items-center px-4 py-3 border-t border-gray-100"
          >
            <Text className="text-xl mr-3">🚪</Text>
            <Text className="text-red-500 font-medium flex-1">Cerrar sesión</Text>
          </TouchableOpacity>
        </View>

        {dataLoading && <ActivityIndicator color="#1a4731" className="pb-8" />}
      </View>
    </ScrollView>
  )
}
