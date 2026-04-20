export function formatCurrency(value?: number | null): string {
  if (!value) return "Consultar precio"
  return new Intl.NumberFormat("es-AR", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value)
}

export function formatNumber(value?: number | null): string {
  if (!value) return ""
  return new Intl.NumberFormat("es-AR").format(value)
}
