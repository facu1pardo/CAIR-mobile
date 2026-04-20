import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform, ScrollView } from "react-native"
import { useRouter } from "expo-router"
import { apiFetch, login } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function RegistroScreen() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [form, setForm] = useState({ full_name: "", email: "", password: "", company_name: "", province: "" })
  const [loading, setLoading] = useState(false)

  function set(key: string, val: string) {
    setForm((f) => ({ ...f, [key]: val }))
  }

  async function handleRegister() {
    if (!form.full_name || !form.email || !form.password || !form.company_name) {
      return Alert.alert("Completá los campos obligatorios")
    }
    setLoading(true)
    try {
      await apiFetch("/api/auth/register", { method: "POST", body: JSON.stringify(form) })
      const user = await login(form.email, form.password)
      setUser(user)
      router.replace("/(tabs)/dashboard")
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo registrar")
    } finally {
      setLoading(false)
    }
  }

  const fields = [
    { key: "full_name", label: "Nombre completo *", placeholder: "Juan García" },
    { key: "email", label: "Email *", placeholder: "tu@email.com", keyboard: "email-address" as const, autoCapitalize: "none" as const },
    { key: "password", label: "Contraseña *", placeholder: "Mínimo 8 caracteres", secure: true },
    { key: "company_name", label: "Nombre de la inmobiliaria *", placeholder: "Inmobiliaria Rural SA" },
    { key: "province", label: "Provincia", placeholder: "Buenos Aires" },
  ]

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <ScrollView className="flex-1 px-6" contentContainerClassName="py-6">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Crear cuenta</Text>
        <Text className="text-gray-500 mb-8">Registrá tu inmobiliaria en CAIR</Text>

        {fields.map((f) => (
          <View key={f.key} className="mb-4">
            <Text className="text-sm font-medium text-gray-700 mb-1">{f.label}</Text>
            <TextInput
              value={form[f.key as keyof typeof form]}
              onChangeText={(v) => set(f.key, v)}
              placeholder={f.placeholder}
              placeholderTextColor="#9ca3af"
              keyboardType={f.keyboard ?? "default"}
              autoCapitalize={f.autoCapitalize ?? "words"}
              secureTextEntry={f.secure ?? false}
              className="border border-gray-300 rounded-lg px-4 py-3 text-gray-900"
            />
          </View>
        ))}

        <TouchableOpacity
          onPress={handleRegister}
          disabled={loading}
          className="bg-primary rounded-xl py-4 items-center mt-2"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Crear cuenta</Text>
          )}
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  )
}
