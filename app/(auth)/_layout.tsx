import { Stack, useRouter } from "expo-router"
import { TouchableOpacity, View } from "react-native"

function BackButton() {
  const router = useRouter()
  return (
    <TouchableOpacity
      onPress={() => router.back()}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
      style={{ marginLeft: 4, padding: 6, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.15)" }}
    >
      <View style={{ width: 20, height: 20, alignItems: "center", justifyContent: "center" }}>
        <View style={{ width: 10, height: 10, borderLeftWidth: 2.5, borderBottomWidth: 2.5, borderColor: "#fff", transform: [{ rotate: "45deg" }], marginLeft: 4 }} />
      </View>
    </TouchableOpacity>
  )
}

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#1a4731" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
      <Stack.Screen
        name="registro"
        options={{
          title: "Registrar inmobiliaria",
          headerLeft: () => <BackButton />,
        }}
      />
    </Stack>
  )
}
