export type SceneType = 'splash' | 'problem' | 'solution' | 'feature' | 'review' | 'cta'
export type MockupType =
  | 'splash'
  | 'line_chat'
  | 'recipe_card'
  | 'feature_highlight'
  | 'review_cards'
  | 'cta'

export interface ChatMessage {
  role: 'user' | 'bot'
  text: string
}

export interface Review {
  user: string
  avatar_emoji: string
  rating: number
  text: string
}

export interface MockupData {
  // splash
  logo_emoji?: string
  tagline?: string
  // line_chat
  messages?: ChatMessage[]
  // recipe_card
  recipe_name?: string
  time?: string
  difficulty?: string
  calories?: string
  ingredients?: string[]
  // feature_highlight
  icon?: string
  headline?: string
  points?: string[]
  // review_cards
  reviews?: Review[]
  // cta
  button_text?: string
  sub_text?: string
  badge?: string
}

export interface VideoScene {
  id: string
  order: number
  type: SceneType
  duration: number
  title: string
  subtitle?: string
  narration: string
  image_prompt: string
  mockup: {
    type: MockupType
    data: MockupData
  }
  generated_image_url?: string
}

export interface PromoVideo {
  app_name: string
  tagline: string
  accent_color: string
  total_duration: number
  scenes: VideoScene[]
}
