// Review domain types

export interface Review {
  id: string
  book_id: string
  user_id: string
  /** Display name — populated from profile in production, seeded in mock */
  reviewer_name: string
  rating: number
  body: string
  created_at: string
}
