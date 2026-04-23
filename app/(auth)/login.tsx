import { useState } from "react"
import { View, Text, TextInput, TouchableOpacity, ActivityIndicator, Alert, KeyboardAvoidingView, Platform } from "react-native"
import { useRouter } from "expo-router"
import { login } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"

export default function LoginScreen() {
  const router = useRouter()
  const { setUser } = useAuth()
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleLogin() {
    if (!email || !password) return Alert.alert("Completá todos los campos")
    setLoading(true)
    try {
      const user = await login(email, password)
      setUser(user)
      router.replace("/(tabs)/dashboard")
    } catch (e: unknown) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo iniciar sesión")
    } finally {
      setLoading(false)
    }
  }

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} className="flex-1 bg-white">
      <View className="flex-1 px-6 justify-center">
        <Text className="text-3xl font-bold text-gray-900 mb-2">Bienvenido</Text>
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

        <TouchableOpacity
          onPress={handleLogin}
          disabled={loading}
          className="bg-primary rounded-xl py-4 items-center"
        >
          {loading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="text-white font-bold text-base">Iniciar sesión</Text>
          )}
        </TouchableOpacity>

      </View>
    </KeyboardAvoidingView>
  )
}
