import { Tabs } from "expo-router"
import { useAuth } from "@/lib/auth-context"
import { Text } from "react-native"

function TabIcon({ emoji, focused }: { emoji: string; focused: boolean }) {
  return <Text className={`text-2xl ${focused ? "opacity-100" : "opacity-40"}`}>{emoji}</Text>
}

export default function TabsLayout() {
  const { user } = useAuth()

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: "#1a4731",
        tabBarInactiveTintColor: "#9ca3af",
        tabBarStyle: { backgroundColor: "#ffffff", borderTopColor: "#e5e7eb" },
        tabBarLabelStyle: { fontSize: 11, fontWeight: "600" },
        headerStyle: { backgroundColor: "#1a4731" },
        headerTintColor: "#ffffff",
        headerTitleStyle: { fontWeight: "700" },
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          title: "Inicio",
          headerTitle: "CAIR",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🏡" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="explorar"
        options={{
          title: "Explorar",
          headerTitle: "Campos en venta",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🔍" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="mapa"
        options={{
          title: "Mapa",
          headerTitle: "Mapa de campos",
          tabBarIcon: ({ focused }) => <TabIcon emoji="🗺️" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="dashboard/index"
        options={{
          title: "Cuenta",
          tabBarLabel: "Cuenta",
          headerTitle: "Mi cuenta",
          tabBarIcon: ({ focused }) => <TabIcon emoji="👤" focused={focused} />,
        }}
      />
      <Tabs.Screen
        name="listing/[slug]"
        options={{
          href: null,
          headerShown: true,
          title: "",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="dashboard/nueva-publicacion"
        options={{
          href: null,
          headerShown: true,
          title: "Nueva publicación",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="admin/vendedores"
        options={{
          href: null,
          headerShown: true,
          title: "Vendedores",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="admin/metricas"
        options={{
          href: null,
          headerShown: true,
          title: "Métricas",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="admin/publicaciones"
        options={{
          href: null,
          headerShown: true,
          title: "Publicaciones",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="dashboard/consultas"
        options={{
          href: null,
          headerShown: true,
          title: "Consultas",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="dashboard/mis-publicaciones"
        options={{
          href: null,
          headerShown: true,
          title: "Mis publicaciones",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
      <Tabs.Screen
        name="dashboard/suscripcion"
        options={{
          href: null,
          headerShown: true,
          title: "Mi suscripción",
          headerStyle: { backgroundColor: "#1a4731" },
          headerTintColor: "#ffffff",
        }}
      />
    </Tabs>
  )
}
