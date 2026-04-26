import { useState, useEffect, useLayoutEffect, useRef } from "react"
import {
  ScrollView, View, Text, TextInput, TouchableOpacity,
  ActivityIndicator, Alert, KeyboardAvoidingView, Platform
} from "react-native"
import { useNavigation } from "expo-router"
import { apiFetch } from "@/lib/api"
import { useAuth } from "@/lib/auth-context"
import * as SecureStore from "expo-secure-store"

interface ProfileData {
  user: { full_name: string; email: string; phone: string | null }
  company: { company_name: string; province: string | null; website: string | null; address: string | null; contact_phone: string | null } | null
}

const labelStyle = { fontSize: 11, fontWeight: "700" as const, color: "#6b7280", textTransform: "uppercase" as const, marginBottom: 6, marginLeft: 2 }
const inputStyle = { borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 11, fontSize: 14, color: "#111827", backgroundColor: "#fff", marginBottom: 14 }
const inputDisabledStyle = { ...inputStyle, backgroundColor: "#f3f4f6", color: "#6b7280" }

export default function EditarCuenta() {
  const navigation = useNavigation()
  const { user, setUser } = useAuth()
  const scrollRef = useRef<ScrollView>(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [changingPass, setChangingPass] = useState(false)

  const [form, setForm] = useState({
    full_name: "", phone: "",
    company_name: "", province: "", website: "", address: "", contact_phone: "",
  })
  const [email, setEmail] = useState("")
  const [pass, setPass] = useState({ current: "", next: "", confirm: "" })

  useEffect(() => { scrollRef.current?.scrollTo({ y: 0, animated: false }) }, [])

  useLayoutEffect(() => {
    navigation.setOptions({
      headerLeft: () => (
        <TouchableOpacity onPress={() => navigation.goBack()} style={{ marginLeft: 4, paddingHorizontal: 8, paddingVertical: 4 }}>
          <Text style={{ color: "#fff", fontSize: 17, fontWeight: "600" }}>‹ Volver</Text>
        </TouchableOpacity>
      ),
    })
  }, [navigation])

  useEffect(() => {
    apiFetch<ProfileData>("/api/mobile/profile")
      .then((d) => {
        setEmail(d.user.email)
        setForm({
          full_name: d.user.full_name ?? "",
          phone: d.user.phone ?? "",
          company_name: d.company?.company_name ?? "",
          province: d.company?.province ?? "",
          website: d.company?.website ?? "",
          address: d.company?.address ?? "",
          contact_phone: d.company?.contact_phone ?? "",
        })
      })
      .catch(() => Alert.alert("Error", "No se pudo cargar el perfil"))
      .finally(() => setLoading(false))
  }, [])

  async function handleSave() {
    if (!form.full_name.trim()) return Alert.alert("Error", "El nombre es obligatorio")
    setSaving(true)
    try {
      await apiFetch("/api/mobile/profile", {
        method: "PATCH",
        body: JSON.stringify(form),
      })
      if (user) {
        const updated = { ...user, full_name: form.full_name.trim() }
        setUser(updated)
        await SecureStore.setItemAsync("session_user", JSON.stringify(updated))
      }
      Alert.alert("Listo", "Datos actualizados correctamente", [
        { text: "OK", onPress: () => navigation.goBack() },
      ])
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudieron guardar los cambios")
    } finally {
      setSaving(false)
    }
  }

  async function handleChangePassword() {
    if (!pass.current || !pass.next || !pass.confirm)
      return Alert.alert("Error", "Completá todos los campos de contraseña")
    if (pass.next !== pass.confirm)
      return Alert.alert("Error", "Las contraseñas no coinciden")
    if (pass.next.length < 8)
      return Alert.alert("Error", "La nueva contraseña debe tener al menos 8 caracteres")
    setChangingPass(true)
    try {
      await apiFetch("/api/mobile/profile", {
        method: "POST",
        body: JSON.stringify({ current_password: pass.current, new_password: pass.next }),
      })
      Alert.alert("Listo", "Contraseña actualizada correctamente")
      setPass({ current: "", next: "", confirm: "" })
    } catch (e) {
      Alert.alert("Error", e instanceof Error ? e.message : "No se pudo cambiar la contraseña")
    } finally {
      setChangingPass(false)
    }
  }

  if (loading) return <ActivityIndicator color="#1a4731" style={{ flex: 1, marginTop: 80 }} />

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={{ flex: 1, backgroundColor: "#f9fafb" }}>
      <ScrollView ref={scrollRef} contentContainerStyle={{ padding: 16, paddingBottom: 48 }}>

        {/* Datos personales */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Datos personales</Text>

          <Text style={labelStyle}>Nombre y apellido *</Text>
          <TextInput
            value={form.full_name}
            onChangeText={(v) => setForm((f) => ({ ...f, full_name: v }))}
            placeholder="Juan Martínez"
            style={inputStyle}
          />

          <Text style={labelStyle}>Email</Text>
          <TextInput value={email} editable={false} style={inputDisabledStyle} />
          <Text style={{ fontSize: 11, color: "#9ca3af", marginTop: -10, marginBottom: 14, marginLeft: 2 }}>
            Para cambiar el email contactá al administrador
          </Text>

          <Text style={labelStyle}>Teléfono</Text>
          <TextInput
            value={form.phone}
            onChangeText={(v) => setForm((f) => ({ ...f, phone: v }))}
            placeholder="+54 11 0000-0000"
            keyboardType="phone-pad"
            style={inputStyle}
          />
        </View>

        {/* Datos de la empresa */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Empresa</Text>

          <Text style={labelStyle}>Nombre de la empresa</Text>
          <TextInput
            value={form.company_name}
            onChangeText={(v) => setForm((f) => ({ ...f, company_name: v }))}
            placeholder="Agro S.A."
            style={inputStyle}
          />

          <Text style={labelStyle}>Provincia</Text>
          <TextInput
            value={form.province}
            onChangeText={(v) => setForm((f) => ({ ...f, province: v }))}
            placeholder="Buenos Aires"
            style={inputStyle}
          />

          <Text style={labelStyle}>Dirección</Text>
          <TextInput
            value={form.address}
            onChangeText={(v) => setForm((f) => ({ ...f, address: v }))}
            placeholder="Av. Corrientes 1234, CABA"
            style={inputStyle}
          />

          <Text style={labelStyle}>Sitio web</Text>
          <TextInput
            value={form.website}
            onChangeText={(v) => setForm((f) => ({ ...f, website: v }))}
            placeholder="https://mi-empresa.com"
            keyboardType="url"
            autoCapitalize="none"
            style={inputStyle}
          />

          <Text style={labelStyle}>Teléfono de contacto</Text>
          <TextInput
            value={form.contact_phone}
            onChangeText={(v) => setForm((f) => ({ ...f, contact_phone: v }))}
            placeholder="+54 11 0000-0000"
            keyboardType="phone-pad"
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </View>

        {/* Botón guardar */}
        <TouchableOpacity
          onPress={handleSave}
          disabled={saving}
          style={{ backgroundColor: "#1a4731", borderRadius: 14, paddingVertical: 15, alignItems: "center", marginBottom: 24 }}
        >
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={{ color: "#fff", fontWeight: "700", fontSize: 15 }}>Guardar cambios</Text>}
        </TouchableOpacity>

        {/* Cambiar contraseña */}
        <View style={{ backgroundColor: "#fff", borderRadius: 16, padding: 16, marginBottom: 16, borderWidth: 1, borderColor: "#e5e7eb" }}>
          <Text style={{ fontWeight: "700", fontSize: 15, color: "#111827", marginBottom: 14 }}>Cambiar contraseña</Text>

          <Text style={labelStyle}>Contraseña actual</Text>
          <TextInput
            value={pass.current}
            onChangeText={(v) => setPass((p) => ({ ...p, current: v }))}
            placeholder="••••••••"
            secureTextEntry
            style={inputStyle}
          />

          <Text style={labelStyle}>Nueva contraseña</Text>
          <TextInput
            value={pass.next}
            onChangeText={(v) => setPass((p) => ({ ...p, next: v }))}
            placeholder="Mínimo 8 caracteres"
            secureTextEntry
            style={inputStyle}
          />

          <Text style={labelStyle}>Confirmar nueva contraseña</Text>
          <TextInput
            value={pass.confirm}
            onChangeText={(v) => setPass((p) => ({ ...p, confirm: v }))}
            placeholder="Repetí la nueva contraseña"
            secureTextEntry
            style={{ ...inputStyle, marginBottom: 0 }}
          />
        </View>

        <TouchableOpacity
          onPress={handleChangePassword}
          disabled={changingPass}
          style={{ borderWidth: 1.5, borderColor: "#1a4731", borderRadius: 14, paddingVertical: 15, alignItems: "center" }}
        >
          {changingPass ? <ActivityIndicator color="#1a4731" /> : <Text style={{ color: "#1a4731", fontWeight: "700", fontSize: 15 }}>Cambiar contraseña</Text>}
        </TouchableOpacity>

      </ScrollView>
    </KeyboardAvoidingView>
  )
}
