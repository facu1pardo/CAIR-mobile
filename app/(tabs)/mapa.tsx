import { useRef, useState, useMemo, useCallback } from "react"
import { View, Text, TouchableOpacity, ActivityIndicator, ScrollView } from "react-native"
import MapView, { Marker, Callout, Region } from "react-native-maps"
import { useRouter, useFocusEffect } from "expo-router"
import { apiFetch } from "@/lib/api"
import { formatCurrency } from "@/lib/utils"

interface MapListing {
  id: string
  slug: string
  title: string
  lat: number
  lng: number
  price_usd: number | null
  surface_ha: number | null
  province: string
  field_type_name: string | null
  cover_image: string | null
  for_sale: boolean
  for_rent: boolean
}

const ARGENTINA_REGION: Region = {
  latitude: -36.6,
  longitude: -64.0,
  latitudeDelta: 18,
  longitudeDelta: 18,
}

const FIELD_TYPES = ["Agrícola", "Ganadero", "Tambero", "Forestal"]

const PROVINCES: { name: string; lat: number; lng: number; delta: number }[] = [
  { name: "Buenos Aires",      lat: -36.6,  lng: -60.0,  delta: 6.0 },
  { name: "CABA",              lat: -34.61, lng: -58.38, delta: 0.15 },
  { name: "Catamarca",         lat: -28.47, lng: -65.78, delta: 4.5 },
  { name: "Chaco",             lat: -26.8,  lng: -60.5,  delta: 4.0 },
  { name: "Chubut",            lat: -43.3,  lng: -65.1,  delta: 6.0 },
  { name: "Córdoba",           lat: -31.4,  lng: -64.18, delta: 5.0 },
  { name: "Corrientes",        lat: -28.83, lng: -57.98, delta: 4.5 },
  { name: "Entre Ríos",        lat: -31.77, lng: -60.5,  delta: 3.5 },
  { name: "Formosa",           lat: -24.89, lng: -59.43, delta: 4.0 },
  { name: "Jujuy",             lat: -23.21, lng: -65.26, delta: 3.0 },
  { name: "La Pampa",          lat: -36.61, lng: -64.29, delta: 5.5 },
  { name: "La Rioja",          lat: -29.41, lng: -66.85, delta: 4.0 },
  { name: "Mendoza",           lat: -34.83, lng: -68.5,  delta: 5.0 },
  { name: "Misiones",          lat: -27.0,  lng: -55.0,  delta: 3.0 },
  { name: "Neuquén",           lat: -38.95, lng: -68.07, delta: 4.5 },
  { name: "Río Negro",         lat: -40.82, lng: -63.02, delta: 5.5 },
  { name: "Salta",             lat: -24.78, lng: -65.41, delta: 4.5 },
  { name: "San Juan",          lat: -31.53, lng: -68.53, delta: 4.0 },
  { name: "San Luis",          lat: -33.3,  lng: -66.34, delta: 4.0 },
  { name: "Santa Cruz",        lat: -51.63, lng: -69.22, delta: 7.0 },
  { name: "Santa Fe",          lat: -31.63, lng: -60.7,  delta: 4.5 },
  { name: "Santiago del Estero", lat: -27.78, lng: -64.26, delta: 4.5 },
  { name: "Tierra del Fuego",  lat: -54.0,  lng: -67.6,  delta: 3.0 },
  { name: "Tucumán",           lat: -26.82, lng: -65.22, delta: 2.5 },
]


const HA_RANGES = [
  { label: "< 100 ha",        min: 0,     max: 100 },
  { label: "100 – 500 ha",    min: 100,   max: 500 },
  { label: "500 – 2.000 ha",  min: 500,   max: 2000 },
  { label: "2.000 – 10.000",  min: 2000,  max: 10000 },
  { label: "> 10.000 ha",     min: 10000, max: Infinity },
]

type ActivePanel = "provincia" | "tipo" | "hectareas" | "modalidad" | null

export default function MapaScreen() {
  const router = useRouter()
  const mapRef = useRef<MapView>(null)
  const [listings, setListings] = useState<MapListing[]>([])
  const [loading, setLoading] = useState(true)
  const [region, setRegion] = useState<Region>(ARGENTINA_REGION)
  const [activePanel, setActivePanel] = useState<ActivePanel>(null)

  const [filterProvincia, setFilterProvincia] = useState<string | null>(null)
  const [filterTipo, setFilterTipo] = useState<string | null>(null)
  const [filterHa, setFilterHa] = useState<number | null>(null)
  const [filterModalidad, setFilterModalidad] = useState<"venta" | "arrend" | null>(null)

  useFocusEffect(
    useCallback(() => {
      setLoading(true)
      apiFetch<{ listings: MapListing[] }>("/api/mobile/map-listings")
        .then((d) => setListings(d.listings))
        .catch(() => setListings([]))
        .finally(() => setLoading(false))
    }, [])
  )

  const filtered = useMemo(() => {
    return listings.filter((l) => {
      if (filterProvincia && l.province !== filterProvincia) return false
      if (filterTipo && l.field_type_name !== filterTipo) return false
      if (filterHa !== null) {
        const range = HA_RANGES[filterHa]
        if (!l.surface_ha || l.surface_ha < range.min || l.surface_ha >= range.max) return false
      }
      if (filterModalidad === "venta" && !l.for_sale) return false
      if (filterModalidad === "arrend" && !l.for_rent) return false
      return true
    })
  }, [listings, filterProvincia, filterTipo, filterHa, filterModalidad])

  const activeFilters = [filterProvincia, filterTipo, filterHa !== null, filterModalidad !== null].filter(Boolean).length

  function zoom(factor: number) {
    const next = {
      ...region,
      latitudeDelta: Math.min(Math.max(region.latitudeDelta * factor, 0.01), 60),
      longitudeDelta: Math.min(Math.max(region.longitudeDelta * factor, 0.01), 60),
    }
    setRegion(next)
    mapRef.current?.animateToRegion(next, 250)
  }

  function togglePanel(panel: ActivePanel) {
    setActivePanel((p) => (p === panel ? null : panel))
  }

  const pillStyle = (active: boolean) => ({
    flexDirection: "row" as const,
    alignItems: "center" as const,
    backgroundColor: active ? "#1a4731" : "#fff",
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 7,
    shadowColor: "#000",
    shadowOpacity: 0.15,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 4,
    marginRight: 8,
  })

  const pillText = (active: boolean) => ({
    color: active ? "#fff" : "#1a4731",
    fontWeight: "600" as const,
    fontSize: 13,
  })

  return (
    <View style={{ flex: 1 }}>
      <MapView
        ref={mapRef}
        style={{ flex: 1 }}
        region={region}
        onPress={() => setActivePanel(null)}
        onRegionChangeComplete={setRegion}
      >
        {filtered.map((l) => (
          <Marker
            key={l.id}
            coordinate={{ latitude: Number(l.lat), longitude: Number(l.lng) }}
            onPress={() => setActivePanel(null)}
          >
            {/* Pin con precio */}
            <View style={{
              backgroundColor: l.for_rent && !l.for_sale ? "#2563eb" : "#1a4731",
              paddingHorizontal: 8,
              paddingVertical: 4,
              borderRadius: 12,
              borderWidth: 2,
              borderColor: "#fff",
              shadowColor: "#000",
              shadowOpacity: 0.3,
              shadowRadius: 4,
              elevation: 4,
            }}>
              <Text style={{ color: "#fff", fontSize: 11, fontWeight: "700" }}>
                {l.price_usd ? formatCurrency(l.price_usd) : "Consultar"}
              </Text>
            </View>

            {/* Popup — equivalente al Leaflet Popup */}
            <Callout tooltip onPress={() => router.push(`/listing/${l.slug}`)}>
              <View style={{
                width: 210,
                backgroundColor: "#fff",
                borderRadius: 12,
                overflow: "hidden",
                shadowColor: "#000",
                shadowOpacity: 0.2,
                shadowRadius: 8,
                elevation: 8,
                borderWidth: 1,
                borderColor: "#e5e7eb",
              }}>
                {/* Header con modalidad */}
                <View style={{ flexDirection: "row", gap: 4, paddingHorizontal: 12, paddingTop: 10, paddingBottom: 6, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                  {l.for_sale && (
                    <View style={{ backgroundColor: "#1a4731", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>VENTA</Text>
                    </View>
                  )}
                  {l.for_rent && (
                    <View style={{ backgroundColor: "#2563eb", paddingHorizontal: 7, paddingVertical: 2, borderRadius: 10 }}>
                      <Text style={{ color: "#fff", fontSize: 9, fontWeight: "700" }}>ARREND.</Text>
                    </View>
                  )}
                </View>

                <View style={{ padding: 12, paddingTop: 8 }}>
                  {/* Título */}
                  <Text style={{ fontSize: 13, fontWeight: "700", color: "#111827", marginBottom: 4 }} numberOfLines={2}>
                    {l.title}
                  </Text>

                  {/* Ubicación y tipo */}
                  <Text style={{ fontSize: 11, color: "#6b7280", marginBottom: 8 }} numberOfLines={1}>
                    {l.province}{l.field_type_name ? ` · ${l.field_type_name}` : ""}
                  </Text>

                  {/* Precio y superficie */}
                  <View style={{ flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                    <Text style={{ fontSize: 14, fontWeight: "700", color: "#1a4731" }}>
                      {l.price_usd ? formatCurrency(l.price_usd) : "Consultar"}
                    </Text>
                    {l.surface_ha && (
                      <Text style={{ fontSize: 11, color: "#9ca3af" }}>
                        {l.surface_ha.toLocaleString()} ha
                      </Text>
                    )}
                  </View>

                  {/* Botón Ver campo */}
                  <View style={{ backgroundColor: "#1a4731", borderRadius: 8, paddingVertical: 8, alignItems: "center" }}>
                    <Text style={{ color: "#fff", fontSize: 12, fontWeight: "700" }}>Ver campo →</Text>
                  </View>
                </View>
              </View>
            </Callout>
          </Marker>
        ))}
      </MapView>

      {/* Counter */}
      {!loading && (
        <View style={{ position: "absolute", top: 14, alignSelf: "center", backgroundColor: "#1a4731", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, shadowColor: "#000", shadowOpacity: 0.2, shadowRadius: 6, elevation: 4, zIndex: 10 }}>
          <Text style={{ color: "#fff", fontWeight: "600", fontSize: 13 }}>
            {filtered.length} {filtered.length === 1 ? "campo" : "campos"}{activeFilters > 0 ? " filtrados" : ""}
          </Text>
        </View>
      )}
      {loading && (
        <View style={{ position: "absolute", top: 14, alignSelf: "center", backgroundColor: "#fff", borderRadius: 20, paddingHorizontal: 16, paddingVertical: 7, flexDirection: "row", alignItems: "center", shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 6, elevation: 4, zIndex: 10 }}>
          <ActivityIndicator color="#1a4731" size="small" />
          <Text style={{ marginLeft: 8, color: "#1a4731", fontWeight: "600", fontSize: 13 }}>Cargando...</Text>
        </View>
      )}

      {/* Filter pills */}
      <View style={{ position: "absolute", top: 58, left: 0, right: 0, zIndex: 20 }}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 4 }}>
          <TouchableOpacity style={pillStyle(!!filterProvincia || activePanel === "provincia")} onPress={() => togglePanel("provincia")}>
            <Text style={pillText(!!filterProvincia || activePanel === "provincia")}>
              {filterProvincia ?? "Provincia"} {activePanel === "provincia" ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={pillStyle(!!filterTipo || activePanel === "tipo")} onPress={() => togglePanel("tipo")}>
            <Text style={pillText(!!filterTipo || activePanel === "tipo")}>
              {filterTipo ?? "Tipo de campo"} {activePanel === "tipo" ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={pillStyle(filterHa !== null || activePanel === "hectareas")} onPress={() => togglePanel("hectareas")}>
            <Text style={pillText(filterHa !== null || activePanel === "hectareas")}>
              {filterHa !== null ? HA_RANGES[filterHa].label : "Hectáreas"} {activePanel === "hectareas" ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          <TouchableOpacity style={pillStyle(!!filterModalidad || activePanel === "modalidad")} onPress={() => togglePanel("modalidad")}>
            <Text style={pillText(!!filterModalidad || activePanel === "modalidad")}>
              {filterModalidad === "venta" ? "En venta" : filterModalidad === "arrend" ? "Arrend." : "Modalidad"} {activePanel === "modalidad" ? "▲" : "▼"}
            </Text>
          </TouchableOpacity>

          {activeFilters > 0 && (
            <TouchableOpacity
              onPress={() => { setFilterProvincia(null); setFilterTipo(null); setFilterHa(null); setFilterModalidad(null); setActivePanel(null) }}
              style={{ ...pillStyle(false), backgroundColor: "#fee2e2", marginRight: 0 }}
            >
              <Text style={{ color: "#dc2626", fontWeight: "600", fontSize: 13 }}>✕ Limpiar</Text>
            </TouchableOpacity>
          )}
        </ScrollView>

        {/* Dropdown panel */}
        {activePanel && (
          <View style={{ marginHorizontal: 16, marginTop: 4, backgroundColor: "#fff", borderRadius: 14, shadowColor: "#000", shadowOpacity: 0.15, shadowRadius: 8, shadowOffset: { width: 0, height: 4 }, elevation: 10, maxHeight: 240, overflow: "hidden" }}>
            <ScrollView bounces={false}>
              {activePanel === "provincia" && (
                <>
                  {filterProvincia && (
                    <TouchableOpacity
                      onPress={() => {
                        setFilterProvincia(null)
                        setActivePanel(null)
                        mapRef.current?.animateToRegion(ARGENTINA_REGION, 600)
                        setRegion(ARGENTINA_REGION)
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}
                    >
                      <Text style={{ color: "#dc2626", fontSize: 14 }}>✕ Ver toda Argentina</Text>
                    </TouchableOpacity>
                  )}
                  {PROVINCES.map((p) => (
                    <TouchableOpacity
                      key={p.name}
                      onPress={() => {
                        setFilterProvincia(p.name)
                        setActivePanel(null)
                        const next: Region = { latitude: p.lat, longitude: p.lng, latitudeDelta: p.delta, longitudeDelta: p.delta }
                        setRegion(next)
                        mapRef.current?.animateToRegion(next, 800)
                      }}
                      style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", justifyContent: "space-between", alignItems: "center" }}
                    >
                      <Text style={{ fontSize: 14, color: "#111827" }}>{p.name}</Text>
                      {filterProvincia === p.name
                        ? <Text style={{ color: "#1a4731", fontWeight: "700" }}>✓</Text>
                        : <Text style={{ color: "#9ca3af", fontSize: 12 }}>›</Text>
                      }
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {activePanel === "tipo" && (
                <>
                  {filterTipo && (
                    <TouchableOpacity onPress={() => { setFilterTipo(null); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                      <Text style={{ color: "#dc2626", fontSize: 14 }}>✕ Quitar filtro</Text>
                    </TouchableOpacity>
                  )}
                  {FIELD_TYPES.map((t) => (
                    <TouchableOpacity key={t} onPress={() => { setFilterTipo(t); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#111827" }}>{t}</Text>
                      {filterTipo === t && <Text style={{ color: "#1a4731" }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {activePanel === "hectareas" && (
                <>
                  {filterHa !== null && (
                    <TouchableOpacity onPress={() => { setFilterHa(null); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                      <Text style={{ color: "#dc2626", fontSize: 14 }}>✕ Quitar filtro</Text>
                    </TouchableOpacity>
                  )}
                  {HA_RANGES.map((r, i) => (
                    <TouchableOpacity key={i} onPress={() => { setFilterHa(i); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#111827" }}>{r.label}</Text>
                      {filterHa === i && <Text style={{ color: "#1a4731" }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}

              {activePanel === "modalidad" && (
                <>
                  {filterModalidad && (
                    <TouchableOpacity onPress={() => { setFilterModalidad(null); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6" }}>
                      <Text style={{ color: "#dc2626", fontSize: 14 }}>✕ Quitar filtro</Text>
                    </TouchableOpacity>
                  )}
                  {([["venta", "En venta"], ["arrend", "Arrendamiento"]] as ["venta" | "arrend", string][]).map(([key, label]) => (
                    <TouchableOpacity key={key} onPress={() => { setFilterModalidad(key); setActivePanel(null) }} style={{ paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: "#f3f4f6", flexDirection: "row", justifyContent: "space-between" }}>
                      <Text style={{ fontSize: 14, color: "#111827" }}>{label}</Text>
                      {filterModalidad === key && <Text style={{ color: "#1a4731" }}>✓</Text>}
                    </TouchableOpacity>
                  ))}
                </>
              )}
            </ScrollView>
          </View>
        )}
      </View>

      {/* Zoom buttons */}
      <View style={{ position: "absolute", right: 16, bottom: 24, flexDirection: "column", zIndex: 999, elevation: 999 }}>
        <TouchableOpacity onPress={() => zoom(0.5)} style={{ width: 52, height: 52, backgroundColor: "#1a4731", borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 12, marginBottom: 8 }}>
          <Text style={{ fontSize: 30, color: "#fff", fontWeight: "400", lineHeight: 36 }}>+</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={() => zoom(2)} style={{ width: 52, height: 52, backgroundColor: "#1a4731", borderRadius: 12, alignItems: "center", justifyContent: "center", shadowColor: "#000", shadowOpacity: 0.35, shadowRadius: 8, shadowOffset: { width: 0, height: 3 }, elevation: 12 }}>
          <Text style={{ fontSize: 30, color: "#fff", fontWeight: "400", lineHeight: 36 }}>−</Text>
        </TouchableOpacity>
      </View>

    </View>
  )
}
