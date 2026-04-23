export const PROVINCES = [
  "Buenos Aires", "Catamarca", "Chaco", "Chubut", "Córdoba", "Corrientes",
  "Entre Ríos", "Formosa", "Jujuy", "La Pampa", "La Rioja", "Mendoza",
  "Misiones", "Neuquén", "Río Negro", "Salta", "San Juan", "San Luis",
  "Santa Cruz", "Santa Fe", "Santiago del Estero", "Tierra del Fuego", "Tucumán",
]

export function formatCurrency(value?: number | null): string {
  if (!value) return "Consultar precio"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatRentCanon(
  rentUnit?: string | null,
  rentPricePerHa?: number | null,
  rentCrop?: string | null
): string {
  if (!rentUnit || !rentPricePerHa) return ""
  const price = formatNumber(rentPricePerHa)
  if (rentUnit === "quintales") return `${price} qq de ${rentCrop ?? "?"}/ha`
  if (rentUnit === "kg_novillo") return `${price} kg novillo/ha`
  if (rentUnit === "usd") return `USD ${price}/ha`
  return ""
}

export function formatNumber(value?: number | null): string {
  if (!value) return ""
  return new Intl.NumberFormat("es-AR").format(value)
}
