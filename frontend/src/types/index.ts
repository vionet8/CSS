export interface Project {
  id: string
  title: string
  description: string
  raw_content: string
  logic_structure: LogicStructure | null
  slides: Slide[] | null
  assets: ProjectAssets | null
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
  // 汎用: 現状/問題/原因/解決策/根拠/具体例/結論
  // マーケ: PASONA/AIDMA/FAB のフレームワーク別ノードタイプ
  id: string
  type: string
  title: string
  content: string
  children: LogicNode[]
}

export interface LogicStructure {
  title: string
  thesis: string
  nodes: LogicNode[]
  framework?: string
}

// ---- セールス・マーケティング ----

export interface MarketingProfile {
  product_name: string
  target_audience: string
  goal: string
  tone: string
}

export interface AssetVariant {
  title: string
  text: string
}

export interface MarketingAsset {
  type: string
  label: string
  variants: AssetVariant[]
  generated_at: string
}

export interface MarketingFramework {
  id: string
  label: string
  description: string
  node_types: string[]
}

export interface MarketingAssetType {
  id: string
  label: string
  description: string
}

export interface ProfileAuditFinding {
  field: string
  status: 'ok' | 'weak' | 'missing'
  comment: string
}

export interface ProfileAudit {
  extracted: Partial<MarketingProfile>
  findings: ProfileAuditFinding[]
  questions: string[]
  verdict: string
  audited_at: string
}

export interface MaterialFragment {
  id: string
  kind: string
  text: string
  source: string
  created_at: string
}

export interface YoutubeSection {
  label: string
  start_sec: number
  end_sec: number
  share_pct: number
  purpose: string
}

export interface YoutubeAnalysisEntry {
  video_id: string
  url: string
  title: string
  channel: string
  duration: number
  view_count: number
  like_count: number
  upload_date: string
  transcript_text: string
  analysis: {
    summary: string
    hook: string
    sections: YoutubeSection[]
    techniques: string[]
    cta: string
    takeaways: string[]
  }
  analyzed_at: string
}

export interface FprlStage {
  id: string
  status: 'ok' | 'weak' | 'missing'
  evidence: string
  comment: string
}

export interface FprlAnalysis {
  reader_before: { foundation: string; behavior: string }
  reader_after: { foundation: string; behavior: string }
  stages: FprlStage[]
  gaps: { stage: string; issue: string; fix: string }[]
  verdict: string
  analyzed_at: string
}

export interface ProjectAssets {
  fprl_analysis?: FprlAnalysis
  youtube_analyses?: Record<string, YoutubeAnalysisEntry>
  marketing_profile?: MarketingProfile
  marketing_assets?: Record<string, MarketingAsset>
  profile_audit?: ProfileAudit
  material_fragments?: MaterialFragment[]
  [key: string]: unknown
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

// 注目演出（PNG書き出し・動画にも焼き込まれる）
export type SlideEffect = 'burst' | 'stamp' | 'spotlight'

export type CharacterEmotion =
  | 'normal' | 'happy' | 'very_happy' | 'surprised'
  | 'sad' | 'crying' | 'angry' | 'thinking'
  | 'smug' | 'embarrassed' | 'explaining'

export interface Slide {
  id: string
  order: number
  type: 'title' | 'content' | 'section' | 'conclusion'
  phase?: 'jo' | 'ha' | 'kyu'
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
  character?: string
  character_emotion?: CharacterEmotion
  character_position?: 'left' | 'right'
  character_x?: number
  character_y?: number
  character_scale?: number
  character_line?: string
  effects?: SlideEffect[]
}

export interface ImageInfo {
  filename: string
  path: string
  width: number
  height: number
  format: string
  size: number
}
