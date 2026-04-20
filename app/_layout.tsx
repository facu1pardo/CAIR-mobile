import "../global.css"
import { Stack } from "expo-router"
import { AuthProvider } from "@/lib/auth-context"
import { GestureHandlerRootView } from "react-native-gesture-handler"

export default function RootLayout() {
  return (
    <GestureHandlerRootView className="flex-1">
      <AuthProvider>
        <Stack screenOptions={{ headerShown: false }}>
          <Stack.Screen name="(tabs)" />
          <Stack.Screen name="(auth)" />
        </Stack>
      </AuthProvider>
    </GestureHandlerRootView>
  )
}
