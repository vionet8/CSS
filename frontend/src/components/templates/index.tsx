import type { Slide, TemplateType } from '../../types'
import HeroHeadline from './HeroHeadline'
import SplitDark from './SplitDark'
import FullbleedOverlay from './FullbleedOverlay'
import TwoColDiagram from './TwoColDiagram'
import ThreeColIcons from './ThreeColIcons'
import FourGridIcons from './FourGridIcons'
import FlowVertical from './FlowVertical'
import FlowHorizontal from './FlowHorizontal'
import HubSpoke from './HubSpoke'
import MvvStack from './MvvStack'
import ValueList from './ValueList'
import NumberedList from './NumberedList'
import ComparisonTable from './ComparisonTable'
import ThreeColCategory from './ThreeColCategory'
import LogoGrid from './LogoGrid'

const TEMPLATE_MAP: Record<TemplateType, React.ComponentType<{ slide: Slide }>> = {
  'hero-headline': HeroHeadline,
  'split-dark': SplitDark,
  'fullbleed-overlay': FullbleedOverlay,
  '2col-diagram': TwoColDiagram,
  '3col-icons': ThreeColIcons,
  '4grid-icons': FourGridIcons,
  'flow-vertical': FlowVertical,
  'flow-horizontal': FlowHorizontal,
  'hub-spoke': HubSpoke,
  'mvv-stack': MvvStack,
  'value-list': ValueList,
  'numbered-list': NumberedList,
  'comparison-table': ComparisonTable,
  '3col-category': ThreeColCategory,
  'logo-grid': LogoGrid,
}

export function SlideRenderer({ slide }: { slide: Slide }) {
  const template = slide.template || 'hero-headline'
  const Component = TEMPLATE_MAP[template] || HeroHeadline
  return (
    <div className="w-full" style={{ aspectRatio: '16/9', position: 'relative', overflow: 'hidden' }}>
      <Component slide={slide} />
    </div>
  )
}

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  'hero-headline': '大見出し',
  'split-dark': '左ダーク分割',
  'fullbleed-overlay': '全面背景',
  '2col-diagram': '2カラム図解',
  '3col-icons': '3カラムアイコン',
  '4grid-icons': '4グリッド',
  'flow-vertical': '縦フロー',
  'flow-horizontal': '横フロー',
  'hub-spoke': '放射状',
  'mvv-stack': 'MVV縦積み',
  'value-list': 'バリューリスト',
  'numbered-list': '番号付きリスト',
  'comparison-table': '比較表',
  '3col-category': '3カテゴリ',
  'logo-grid': 'ロゴグリッド',
}

export { TEMPLATE_MAP }
