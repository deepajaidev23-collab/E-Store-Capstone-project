// User / profile domain types

export interface Profile {
  id: string
  display_name: string
  avatar_url: string | null
  reward_points: number
  created_at: string
}

export interface Address {
  id: string
  user_id: string
  first_name: string
  last_name: string
  email: string
  phone: string
  address_line: string
  city: string
  state: string
  country: string
  pin: string
  is_default: boolean
}
