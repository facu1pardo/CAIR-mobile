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
