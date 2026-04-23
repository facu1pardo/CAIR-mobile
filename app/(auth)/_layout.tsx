import { Stack } from "expo-router"

export default function AuthLayout() {
  return (
    <Stack screenOptions={{ headerStyle: { backgroundColor: "#1a4731" }, headerTintColor: "#fff" }}>
      <Stack.Screen name="login" options={{ title: "Iniciar sesión" }} />
    </Stack>
  )
}
