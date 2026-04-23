import { useEffect, useState, useCallback, useRef } from "react"
import {
  View, Text, FlatList, TextInput, TouchableOpacity,
  ActivityIndicator, Image, Modal, ScrollView, KeyboardAvoidingView, Platform,
} from "react-native"
import { useRouter, useLocalSearchParams } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency, formatNumber } from "@/lib/utils"
import type { Listing } from "@/types"

// ─── Constantes de dominio ───────────────────────────────────────────────────

const FIELD_TYPES = [
  { label: "Agrícola",  slug: "agricola"  },
  { label: "Ganadero",  slug: "ganadero"  },
  { label: "Tambero",   slug: "tambero"   },
  { label: "Forestal",  slug: "forestal"  },
]

const PROVINCES = [
  "Buenos Aires", "CABA", "Catamarca", "Chaco", "Chubut", "Córdoba",
  "Corrientes", "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja",
  "Mendoza", "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan",
  "San Luis", "Santa Cruz", "Santa Fe", "Santiago del Estero",
  "Tierra del Fuego", "Tucumán",
]

// ─── Tipos ───────────────────────────────────────────────────────────────────

interface Filters {
  modalidad: ("venta" | "arrend")[]
  tipos: string[]
  precioMin: string
  precioMax: string
  haMin: string
  haMax: string
  provincias: string[]
}

const DEFAULT_FILTERS: Filters = {
  modalidad: [],
  tipos: [],
  precioMin: "",
  precioMax: "",
  haMin: "",
  haMax: "",
  provincias: [],
}

function countActiveFilters(f: Filters) {
  return (
    f.modalidad.length +
    f.tipos.length +
    (f.precioMin || f.precioMax ? 1 : 0) +
    (f.haMin || f.haMax ? 1 : 0) +
    f.provincias.length
  )
}

function filtersToQS(f: Filters, q: string, page: number) {
  const qs = new URLSearchParams({ limit: "20", page: String(page) })
  if (q) qs.set("q", q)
  if (f.modalidad.length === 1) qs.set("modalidad", f.modalidad[0])
  if (f.tipos.length > 0) qs.set("tipos", f.tipos.join(","))
  if (f.provincias.length > 0) qs.set("provincia", f.provincias.join(","))
  if (f.precioMin) qs.set("precioMin", f.precioMin)
  if (f.precioMax) qs.set("precioMax", f.precioMax)
  if (f.haMin) qs.set("haMin", f.haMin)
  if (f.haMax) qs.set("haMax", f.haMax)
  return qs.toString()
}

// ─── Componente principal ─────────────────────────────────────────────────────

export default function ExplorarScreen() {
  const router = useRouter()
  const params = useLocalSearchParams<{ q?: string; tipo?: string }>()

  const [listings, setListings] = useState<Listing[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState(params.q ?? "")
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)
  const [loadingMore, setLoadingMore] = useState(false)
  const [hasMore, setHasMore] = useState(true)

  const [filters, setFilters] = useState<Filters>(() => {
    const init = { ...DEFAULT_FILTERS }
    if (params.tipo) init.tipos = [params.tipo]
    return init
  })
  const [showFilters, setShowFilters] = useState(false)
  const [draft, setDraft] = useState<Filters>(filters)
  const [showProvinceList, setShowProvinceList] = useState(false)

  const activeCount = countActiveFilters(filters)

  const fetchListings = useCallback(async (
    q: string, p: number, f: Filters, replace = false,
  ) => {
    try {
      const data = await apiFetch<{ listings: Listing[]; total: number }>(
        `/api/mobile/listings?${filtersToQS(f, q, p)}`
      )
      setTotal(data.total)
      setListings((prev) => replace ? data.listings : [...prev, ...data.listings])
      setHasMore(p * 20 < data.total)
    } catch {}
  }, [])

  useEffect(() => {
    setLoading(true)
    setPage(1)
    fetchListings(search, 1, filters, true).finally(() => setLoading(false))
  }, [fetchListings, filters])

  async function handleSearch() {
    setLoading(true)
    setPage(1)
    fetchListings(search, 1, filters, true).finally(() => setLoading(false))
  }

  async function loadMore() {
    if (loadingMore || !hasMore) return
    setLoadingMore(true)
    const next = page + 1
    setPage(next)
    await fetchListings(search, next, filters)
    setLoadingMore(false)
  }

  function openFilters() {
    setDraft(filters)
    setShowProvinceList(false)
    setShowFilters(true)
  }

  function applyFilters() {
    setFilters(draft)
    setShowFilters(false)
  }

  function clearFilters() {
    setDraft(DEFAULT_FILTERS)
  }

  function toggleDraftModalidad(val: "venta" | "arrend") {
    setDraft((d) => ({
      ...d,
      modalidad: d.modalidad.includes(val)
        ? d.modalidad.filter((m) => m !== val)
        : [...d.modalidad, val],
    }))
  }

  function toggleDraftTipo(slug: string) {
    setDraft((d) => ({
      ...d,
      tipos: d.tipos.includes(slug)
        ? d.tipos.filter((t) => t !== slug)
        : [...d.tipos, slug],
    }))
  }

  // ── Render card ─────────────────────────────────────────────────────────────

  function renderCard(l: Listing) {
    return (
      <TouchableOpacity
        key={l.id}
        onPress={() => router.push(`/listing/${l.slug}`)}
        activeOpacity={0.9}
        style={{ backgroundColor: "#fff", borderRadius: 12, overflow: "hidden", borderWidth: 1, borderColor: "#e5e7eb", shadowColor: "#000", shadowOpacity: 0.06, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 2 }}
      >
        {/* Imagen */}
        {l.cover_image ? (
          <Image source={{ uri: l.cover_image }} style={{ width: "100%", height: 160 }} resizeMode="cover" />
        ) : (
          <View style={{ width: "100%", height: 160, backgroundColor: "#f3f4f6", alignItems: "center", justifyContent: "center" }}>
            <Text style={{ fontSize: 40 }}>🌾</Text>
          </View>
        )}

        {/* Badge vendido */}
        {l.status === "sold" && (
          <View style={{ position: "absolute", top: 0, left: 0, right: 0, height: 160, backgroundColor: "rgba(0,0,0,0.4)", alignItems: "center", justifyContent: "center" }}>
            <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 16, paddingVertical: 6, borderRadius: 8, transform: [{ rotate: "-8deg" }] }}>
              <Text style={{ color: "#fff", fontWeight: "800", fontSize: 16, letterSpacing: 1 }}>VENDIDO</Text>
            </View>
          </View>
        )}

        <View style={{ padding: 14 }}>
          <Text style={{ fontWeight: "700", color: "#111827", fontSize: 15 }} numberOfLines={2}>{l.title}</Text>
          <Text style={{ color: "#6b7280", fontSize: 13, marginTop: 3 }}>
            {[l.locality, l.partido, l.province].filter(Boolean).join(", ")}
          </Text>

          {/* Badges modalidad */}
          <View style={{ flexDirection: "row", gap: 6, marginTop: 8 }}>
            {l.for_sale !== false && (
              <View style={{ backgroundColor: "#1a4731", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>EN VENTA</Text>
              </View>
            )}
            {l.for_rent && (
              <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 12 }}>
                <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>ARRENDAMIENTO</Text>
              </View>
            )}
          </View>

          <View style={{ flexDirection: "row", alignItems: "center", justifyContent: "space-between", marginTop: 10 }}>
            <Text style={{ color: "#1a4731", fontWeight: "700", fontSize: 17 }}>
              {l.price_usd ? formatCurrency(l.price_usd) : "Consultar precio"}
            </Text>
            {l.surface_ha && (
              <Text style={{ color: "#6b7280", fontSize: 13 }}>{formatNumber(l.surface_ha)} ha</Text>
            )}
          </View>

          {l.field_type_name && (
            <View style={{ marginTop: 8, alignSelf: "flex-start", backgroundColor: "#f0fdf4", paddingHorizontal: 8, paddingVertical: 4, borderRadius: 20 }}>
              <Text style={{ color: "#1a4731", fontSize: 12, fontWeight: "500" }}>{l.field_type_name}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    )
  }

  // ── Render principal ────────────────────────────────────────────────────────

  return (
    <View style={{ flex: 1, backgroundColor: "#f9fafb" }}>

      {/* Barra de búsqueda + filtros */}
      <View style={{ backgroundColor: "#fff", paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#e5e7eb", flexDirection: "row", gap: 8, alignItems: "center" }}>
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Buscar por nombre, zona..."
          placeholderTextColor="#9ca3af"
          style={{ flex: 1, backgroundColor: "#f3f4f6", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9, fontSize: 14, color: "#111827" }}
          returnKeyType="search"
          onSubmitEditing={handleSearch}
        />
        <TouchableOpacity
          onPress={handleSearch}
          style={{ backgroundColor: "#1a4731", borderRadius: 8, paddingHorizontal: 14, paddingVertical: 9 }}
        >
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 14 }}>Buscar</Text>
        </TouchableOpacity>
        {/* Botón filtros */}
        <TouchableOpacity
          onPress={openFilters}
          style={{ position: "relative", backgroundColor: activeCount > 0 ? "#1a4731" : "#f3f4f6", borderRadius: 8, paddingHorizontal: 12, paddingVertical: 9, alignItems: "center", justifyContent: "center" }}
        >
          <FunnelIcon color={activeCount > 0 ? "#fff" : "#374151"} />
          {activeCount > 0 && (
            <View style={{ position: "absolute", top: -4, right: -4, width: 18, height: 18, borderRadius: 9, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }}>
              <Text style={{ color: "#fff", fontSize: 10, fontWeight: "700" }}>{activeCount}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {/* Chips de filtros activos */}
      {activeCount > 0 && (
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={{ backgroundColor: "#fff", borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }} contentContainerStyle={{ paddingHorizontal: 14, paddingVertical: 10, gap: 8, flexDirection: "row", alignItems: "center" }}>
          {filters.modalidad.map((m) => (
            <View key={m} style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>{m === "venta" ? "Venta" : "Arrendamiento"}</Text>
            </View>
          ))}
          {filters.tipos.map((s) => (
            <View key={s} style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>{FIELD_TYPES.find((f) => f.slug === s)?.label ?? s}</Text>
            </View>
          ))}
          {(filters.precioMin || filters.precioMax) && (
            <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>
                Precio{filters.precioMin ? ` ≥ USD ${Number(filters.precioMin).toLocaleString()}` : ""}
                {filters.precioMax ? ` ≤ USD ${Number(filters.precioMax).toLocaleString()}` : ""}
              </Text>
            </View>
          )}
          {(filters.haMin || filters.haMax) && (
            <View style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>
                Sup.{filters.haMin ? ` ≥ ${filters.haMin} ha` : ""}
                {filters.haMax ? ` ≤ ${filters.haMax} ha` : ""}
              </Text>
            </View>
          )}
          {filters.provincias.map((p) => (
            <View key={p} style={{ backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#bbf7d0", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}>
              <Text style={{ color: "#15803d", fontSize: 13, fontWeight: "700" }}>{p}</Text>
            </View>
          ))}
          <TouchableOpacity
            onPress={() => setFilters(DEFAULT_FILTERS)}
            style={{ backgroundColor: "#fee2e2", borderWidth: 1, borderColor: "#fecaca", paddingHorizontal: 14, paddingVertical: 6, borderRadius: 20 }}
          >
            <Text style={{ color: "#dc2626", fontSize: 13, fontWeight: "700" }}>✕ Limpiar</Text>
          </TouchableOpacity>
        </ScrollView>
      )}

      {/* Lista */}
      {loading ? (
        <ActivityIndicator color="#1a4731" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={listings}
          keyExtractor={(l) => l.id}
          contentContainerStyle={{ padding: 16, gap: 16 }}
          ListHeaderComponent={
            <Text style={{ color: "#6b7280", fontSize: 13, marginBottom: 4 }}>
              <Text style={{ fontWeight: "700", color: "#111827" }}>{total}</Text> campos encontrados
            </Text>
          }
          ListEmptyComponent={
            <View style={{ alignItems: "center", paddingVertical: 64 }}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔍</Text>
              <Text style={{ color: "#6b7280", fontWeight: "500", fontSize: 15, textAlign: "center" }}>
                No encontramos campos con esos filtros
              </Text>
            </View>
          }
          renderItem={({ item: l }) => renderCard(l)}
          onEndReached={loadMore}
          onEndReachedThreshold={0.3}
          ListFooterComponent={loadingMore ? <ActivityIndicator color="#1a4731" style={{ paddingVertical: 16 }} /> : null}
        />
      )}

      {/* ── Modal de filtros ───────────────────────────────────────────────── */}
      <Modal visible={showFilters} animationType="slide" transparent onRequestClose={() => setShowFilters(false)}>
        <View style={{ flex: 1, justifyContent: "flex-end", backgroundColor: "rgba(0,0,0,0.4)" }}>
          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined}>
            <View style={{ backgroundColor: "#fff", borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: "92%", overflow: "hidden" }}>

              {/* Handle */}
              <View style={{ alignItems: "center", paddingTop: 10, paddingBottom: 4 }}>
                <View style={{ width: 40, height: 4, borderRadius: 2, backgroundColor: "#d1d5db" }} />
              </View>

              {/* Header */}
              <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 20, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                <Text style={{ fontSize: 18, fontWeight: "700", color: "#111827" }}>Filtros</Text>
                <TouchableOpacity onPress={clearFilters}>
                  <Text style={{ color: "#1a4731", fontWeight: "600", fontSize: 15 }}>Limpiar filtros</Text>
                </TouchableOpacity>
              </View>

              <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">

                {/* ── Modalidad ──────────────────────────────────────────── */}
                <FilterSection title="Tipo de operación">
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    {([["venta", "Comprar / Venta"], ["arrend", "Arrendar"]] as const).map(([key, label]) => (
                      <FilterToggle
                        key={key}
                        label={label}
                        active={draft.modalidad.includes(key)}
                        onPress={() => toggleDraftModalidad(key)}
                        flex
                      />
                    ))}
                  </View>
                </FilterSection>

                <Divider />

                {/* ── Tipo de campo ──────────────────────────────────────── */}
                <FilterSection title="Tipo de campo">
                  <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 12 }}>
                    {FIELD_TYPES.map((ft) => (
                      <FilterToggle
                        key={ft.slug}
                        label={ft.label}
                        active={draft.tipos.includes(ft.slug)}
                        onPress={() => toggleDraftTipo(ft.slug)}
                        width="47%"
                      />
                    ))}
                  </View>
                </FilterSection>

                <Divider />

                {/* ── Precio ─────────────────────────────────────────────── */}
                <FilterSection title="Precio" right="USD">
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <RangeInput
                      placeholder="Desde"
                      value={draft.precioMin}
                      onChangeText={(v) => setDraft((d) => ({ ...d, precioMin: v }))}
                    />
                    <RangeInput
                      placeholder="Hasta"
                      value={draft.precioMax}
                      onChangeText={(v) => setDraft((d) => ({ ...d, precioMax: v }))}
                    />
                  </View>
                </FilterSection>

                <Divider />

                {/* ── Superficie ─────────────────────────────────────────── */}
                <FilterSection title="Superficie" right="hectáreas">
                  <View style={{ flexDirection: "row", gap: 12 }}>
                    <RangeInput
                      placeholder="Desde"
                      value={draft.haMin}
                      onChangeText={(v) => setDraft((d) => ({ ...d, haMin: v }))}
                    />
                    <RangeInput
                      placeholder="Hasta"
                      value={draft.haMax}
                      onChangeText={(v) => setDraft((d) => ({ ...d, haMax: v }))}
                    />
                  </View>
                </FilterSection>

                <Divider />

                {/* ── Provincia ──────────────────────────────────────────── */}
                <FilterSection title="Provincia">
                  {/* Dropdown toggle */}
                  <TouchableOpacity
                    onPress={() => setShowProvinceList((v) => !v)}
                    style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, backgroundColor: "#fff" }}
                  >
                    <Text style={{ fontSize: 14, color: draft.provincias.length > 0 ? "#111827" : "#9ca3af" }}>
                      {draft.provincias.length > 0
                        ? `${draft.provincias.length} provincia${draft.provincias.length > 1 ? "s" : ""} seleccionada${draft.provincias.length > 1 ? "s" : ""}`
                        : "Seleccionar provincia..."}
                    </Text>
                    <Text style={{ color: "#6b7280", fontSize: 12 }}>{showProvinceList ? "▲" : "▼"}</Text>
                  </TouchableOpacity>

                  {/* Dropdown list */}
                  {showProvinceList && (
                    <View style={{ borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, marginTop: 6, maxHeight: 220, overflow: "hidden" }}>
                      <ScrollView nestedScrollEnabled showsVerticalScrollIndicator>
                        {PROVINCES.map((p, i) => {
                          const selected = draft.provincias.includes(p)
                          return (
                            <TouchableOpacity
                              key={p}
                              onPress={() => setDraft((d) => ({
                                ...d,
                                provincias: selected
                                  ? d.provincias.filter((x) => x !== p)
                                  : [...d.provincias, p],
                              }))}
                              style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: i < PROVINCES.length - 1 ? 1 : 0, borderBottomColor: "#f3f4f6", backgroundColor: selected ? "#f0fdf4" : "#fff" }}
                            >
                              <Text style={{ fontSize: 14, color: selected ? "#15803d" : "#374151", fontWeight: selected ? "600" : "400" }}>{p}</Text>
                              {selected && <Text style={{ color: "#15803d", fontSize: 15, fontWeight: "700" }}>✓</Text>}
                            </TouchableOpacity>
                          )
                        })}
                      </ScrollView>
                    </View>
                  )}

                  {/* Selected chips */}
                  {draft.provincias.length > 0 && (
                    <View style={{ flexDirection: "row", flexWrap: "wrap", gap: 8, marginTop: 12 }}>
                      {draft.provincias.map((p) => (
                        <View key={p} style={{ flexDirection: "row", alignItems: "center", backgroundColor: "#f0fdf4", borderWidth: 1, borderColor: "#86efac", paddingLeft: 10, paddingRight: 6, paddingVertical: 6, borderRadius: 20, gap: 6 }}>
                          <Text style={{ fontSize: 13, color: "#15803d", fontWeight: "600" }}>{p}</Text>
                          <TouchableOpacity
                            onPress={() => setDraft((d) => ({ ...d, provincias: d.provincias.filter((x) => x !== p) }))}
                            hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
                            style={{ width: 18, height: 18, borderRadius: 9, backgroundColor: "#16a34a", alignItems: "center", justifyContent: "center" }}
                          >
                            <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700", lineHeight: 13 }}>✕</Text>
                          </TouchableOpacity>
                        </View>
                      ))}
                    </View>
                  )}
                </FilterSection>

                <View style={{ height: 100 }} />
              </ScrollView>

              {/* ── Botón aplicar ──────────────────────────────────────────── */}
              <View style={{ position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "#fff", paddingHorizontal: 20, paddingBottom: Platform.OS === "ios" ? 34 : 20, paddingTop: 12, borderTopWidth: 1, borderTopColor: "#f3f4f6" }}>
                <TouchableOpacity
                  onPress={applyFilters}
                  style={{ backgroundColor: "#1a4731", borderRadius: 14, paddingVertical: 16, alignItems: "center" }}
                >
                  <Text style={{ color: "#fff", fontWeight: "700", fontSize: 16 }}>Ver campos</Text>
                </TouchableOpacity>
              </View>

            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>

    </View>
  )
}

// ─── Subcomponentes del modal ─────────────────────────────────────────────────

function FilterSection({ title, right, children }: { title: string; right?: string; children: React.ReactNode }) {
  return (
    <View style={{ paddingHorizontal: 20, paddingVertical: 18 }}>
      <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
        <Text style={{ fontSize: 16, fontWeight: "700", color: "#111827" }}>{title}</Text>
        {right && <Text style={{ fontSize: 13, color: "#6b7280", fontWeight: "500" }}>{right}</Text>}
      </View>
      {children}
    </View>
  )
}

function FilterToggle({ label, active, onPress, flex, width }: {
  label: string; active: boolean; onPress: () => void; flex?: boolean; width?: string
}) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: flex ? 1 : undefined,
        width: width as never,
        paddingVertical: 13,
        borderRadius: 10,
        alignItems: "center",
        backgroundColor: active ? "#1a4731" : "#fff",
        borderWidth: 1.5,
        borderColor: active ? "#1a4731" : "#d1d5db",
      }}
    >
      <Text style={{ fontSize: 14, fontWeight: active ? "700" : "500", color: active ? "#fff" : "#374151" }}>
        {label}
      </Text>
    </TouchableOpacity>
  )
}

function RangeInput({ placeholder, value, onChangeText }: {
  placeholder: string; value: string; onChangeText: (v: string) => void
}) {
  return (
    <View style={{ flex: 1, borderWidth: 1, borderColor: "#d1d5db", borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12 }}>
      <Text style={{ fontSize: 11, color: "#9ca3af", marginBottom: 4 }}>{placeholder}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        keyboardType="numeric"
        placeholder="0"
        placeholderTextColor="#d1d5db"
        style={{ fontSize: 15, color: "#111827", padding: 0 }}
      />
    </View>
  )
}

function Divider() {
  return <View style={{ height: 1, backgroundColor: "#f3f4f6", marginHorizontal: 0 }} />
}

function FunnelIcon({ color }: { color: string }) {
  return (
    <View style={{ alignItems: "center", justifyContent: "center", height: 18, width: 18, gap: 4 }}>
      <View style={{ width: 18, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 12, height: 2, backgroundColor: color, borderRadius: 1 }} />
      <View style={{ width: 6, height: 2, backgroundColor: color, borderRadius: 1 }} />
    </View>
  )
}
