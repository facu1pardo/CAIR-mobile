import { useEffect, useState, useCallback } from "react"
import { ScrollView, View, Text, ActivityIndicator, TouchableOpacity, Linking } from "react-native"
import { apiFetch } from "@/lib/api"
import type { Inquiry } from "@/types"

function formatDate(dateStr: string) {
  const d = new Date(dateStr)
  return d.toLocaleDateString("es-AR", { day: "2-digit", month: "short", year: "numeric" })
}

export default function ConsultasScreen() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([])
  const [loading, setLoading] = useState(true)

  const loadAndMarkRead = useCallback(async () => {
    try {
      const data = await apiFetch<{ inquiries: Inquiry[] }>("/api/mobile/my-inquiries")
      setInquiries(data.inquiries)

      const unread = data.inquiries.filter((i) => !i.read)
      await Promise.allSettled(
        unread.map((i) =>
          apiFetch(`/api/mobile/inquiries/${i.id}/read`, { method: "PATCH" })
        )
      )

      if (unread.length > 0) {
        setInquiries((prev) => prev.map((i) => ({ ...i, read: true })))
      }
    } catch {
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadAndMarkRead()
  }, [loadAndMarkRead])

  if (loading) {
    return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />
  }

  return (
    <ScrollView className="flex-1 bg-gray-50">
      <View className="px-4 py-4">
        {inquiries.length === 0 ? (
          <View className="bg-white rounded-xl border border-gray-200 p-12 items-center">
            <Text className="text-4xl mb-3">💬</Text>
            <Text className="text-gray-400 text-center">No tenés consultas aún.</Text>
          </View>
        ) : (
          inquiries.map((inq) => (
            <View
              key={inq.id}
              className="bg-white rounded-xl border border-gray-200 p-4 mb-3"
            >
              <View className="flex-row justify-between items-start mb-1">
                <Text className="text-gray-900 font-semibold flex-1 mr-2">{inq.sender_name}</Text>
                <Text className="text-gray-400 text-xs">{formatDate(inq.created_at)}</Text>
              </View>

              <TouchableOpacity onPress={() => Linking.openURL(`mailto:${inq.sender_email}`)}>
                <Text className="text-primary text-sm">{inq.sender_email}</Text>
              </TouchableOpacity>
              {inq.sender_phone ? (
                <TouchableOpacity onPress={() => Linking.openURL(`tel:${inq.sender_phone}`)}>
                  <Text className="text-primary text-sm">{inq.sender_phone}</Text>
                </TouchableOpacity>
              ) : null}

              <Text className="text-gray-700 text-sm mt-2 leading-5">{inq.message}</Text>

              {inq.listing_title ? (
                <Text className="text-gray-400 text-xs mt-2">📋 {inq.listing_title}</Text>
              ) : null}
            </View>
          ))
        )}
      </View>
    </ScrollView>
  )
}
