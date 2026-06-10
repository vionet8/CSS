import type { LogicNode, LogicStructure } from '../types'

const TYPE_COLORS: Record<string, string> = {
  現状: 'bg-blue-500/20 text-blue-300 border-blue-500/30',
  問題: 'bg-red-500/20 text-red-300 border-red-500/30',
  原因: 'bg-orange-500/20 text-orange-300 border-orange-500/30',
  解決策: 'bg-green-500/20 text-green-300 border-green-500/30',
  根拠: 'bg-purple-500/20 text-purple-300 border-purple-500/30',
  具体例: 'bg-yellow-500/20 text-yellow-300 border-yellow-500/30',
  結論: 'bg-brand-500/20 text-brand-300 border-brand-500/30',
}

function NodeCard({ node, depth = 0 }: { node: LogicNode; depth?: number }) {
  const color = TYPE_COLORS[node.type] || 'bg-gray-700 text-gray-300 border-gray-600'
  return (
    <div className={`${depth > 0 ? 'ml-6 border-l border-gray-700 pl-4' : ''}`}>
      <div className="mb-2">
        <div className={`inline-flex items-center gap-2 rounded-lg border px-3 py-2 ${color}`}>
          <span className="text-xs font-medium opacity-70">{node.type}</span>
          <span className="text-sm font-semibold">{node.title}</span>
        </div>
        {node.content && (
          <p className="mt-1 ml-2 text-xs text-gray-400 leading-relaxed max-w-lg">{node.content}</p>
        )}
      </div>
      {node.children?.map((child) => (
        <NodeCard key={child.id} node={child} depth={depth + 1} />
      ))}
    </div>
  )
}

export default function LogicTree({ structure }: { structure: LogicStructure }) {
  return (
    <div className="space-y-4">
      <div className="mb-4">
        <h3 className="text-lg font-bold text-white">{structure.title}</h3>
        {structure.thesis && (
          <p className="text-sm text-brand-400 mt-1 italic">主張: {structure.thesis}</p>
        )}
      </div>
      {structure.nodes.map((node) => (
        <NodeCard key={node.id} node={node} />
      ))}
    </div>
  )
}
