export const RENT_CROPS = ["Soja", "Maíz", "Trigo", "Girasol", "Sorgo"] as const

export const RENT_UNIT_LABELS: Record<string, string> = {
  quintales:  "Quintales/ha",
  kg_novillo: "Kg novillo/ha",
  usd:        "USD/ha",
}

export const RENT_PAYMENT_FREQUENCY_LABELS: Record<string, string> = {
  monthly:        "Mensual",
  every_4_months: "Cada 4 meses",
  quarterly:      "Trimestral",
  semiannual:     "Semestral",
  annual:         "Anual",
}

export interface Listing {
  id: string
  title: string
  slug: string
  description?: string
  province?: string
  partido?: string
  locality?: string
  surface_ha?: number
  price_usd?: number
  price_per_ha_usd?: number
  field_type_name?: string
  field_type_slug?: string
  company_name?: string
  company_id?: string
  cover_image?: string
  featured: boolean
  status: string
  views_count: number
  contact_whatsapp?: string
  lat?: number | null
  lng?: number | null
  for_sale?: boolean
  for_rent?: boolean
  rent_unit?: string | null
  rent_price_per_ha?: number | null
  rent_crop?: string | null
  rent_payment_frequency?: string | null
  rent_observations?: string | null
  created_at: string
}

export interface Inquiry {
  id: string
  listing_id: string
  listing_title?: string
  sender_name: string
  sender_email: string
  sender_phone?: string
  message: string
  created_at: string
  read: boolean
}

export interface Company {
  id: string
  company_name: string
  province?: string
  description?: string
  contact_phone?: string
  contact_email?: string
  website?: string
}
