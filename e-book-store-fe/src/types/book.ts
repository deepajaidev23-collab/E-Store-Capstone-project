// Book domain types

export type BookFormat = 'paperback' | 'ebook' | 'hardcover'

export interface Category {
  id: string
  name: string
  slug: string
}

export interface Publisher {
  id: string
  name: string
  description: string | null
}

export interface Book {
  id: string
  title: string
  author_name: string
  author_bio: string | null
  author_avatar_url: string | null
  publisher_id: string | null
  publisher?: Publisher
  description: string
  cover_url: string
  format: BookFormat
  language: string
  price: number
  original_price: number | null
  copies_sold: number
  average_rating: number
  is_bestseller: boolean
  is_new_launch: boolean
  created_at: string
  categories?: Category[]
}
