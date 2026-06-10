export interface Project {
  id: string
  title: string
  description: string
  raw_content: string
  logic_structure: LogicStructure | null
  slides: Slide[] | null
  assets: Record<string, unknown> | null
  created_at: string
  updated_at: string
}

export interface ProjectSummary {
  id: string
  title: string
  description: string
  created_at: string
  updated_at: string
  has_structure: boolean
  slide_count: number
}

export interface LogicNode {
  id: string
  type: '現状' | '問題' | '原因' | '解決策' | '根拠' | '具体例' | '結論'
  title: string
  content: string
  children: LogicNode[]
}

export interface LogicStructure {
  title: string
  thesis: string
  nodes: LogicNode[]
}

export type TemplateType =
  | 'hero-headline'
  | 'split-dark'
  | 'fullbleed-overlay'
  | '2col-diagram'
  | '3col-icons'
  | '4grid-icons'
  | 'flow-vertical'
  | 'flow-horizontal'
  | 'hub-spoke'
  | 'mvv-stack'
  | 'value-list'
  | 'numbered-list'
  | 'comparison-table'
  | '3col-category'
  | 'logo-grid'

export interface SlideItem {
  title: string
  body?: string
  icon_hint?: string
  image_filename?: string
  accent?: string
}

export interface Slide {
  id: string
  order: number
  type: 'title' | 'content' | 'section' | 'conclusion'
  template: TemplateType
  title: string
  subtitle?: string
  body: string
  items?: SlideItem[]
  accent_color?: string
  speaker_notes?: string
  image_hint?: string
  source_node_id?: string
  image_filename?: string
}

export interface ImageInfo {
  filename: string
  path: string
  width: number
  height: number
  format: string
  size: number
}
