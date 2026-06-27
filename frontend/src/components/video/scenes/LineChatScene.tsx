import type { ChatMessage } from '../../../types/video'

interface Props {
  messages: ChatMessage[]
  botName?: string
  accentColor: string
}

export default function LineChatScene({ messages, botName = 'レシピックBot', accentColor }: Props) {
  return (
    <div className="w-full h-full flex flex-col bg-[#c6e2ef]">
      {/* LINE chat header */}
      <div className="flex items-center gap-2 px-4 py-3 bg-[#1d1d1d] flex-shrink-0">
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white text-sm font-bold"
          style={{ backgroundColor: accentColor }}
        >
          🍳
        </div>
        <div>
          <p className="text-white text-sm font-semibold leading-none">{botName}</p>
          <p className="text-gray-400 text-[10px] mt-0.5">公式アカウント</p>
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-hidden flex flex-col justify-end p-3 gap-2">
        {messages.map((msg, i) => (
          <div key={i} className={`flex items-end gap-2 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
            {msg.role === 'bot' && (
              <div
                className="w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0 mb-1"
                style={{ backgroundColor: accentColor }}
              >
                🍳
              </div>
            )}
            <div
              className={`max-w-[75%] px-3 py-2 rounded-2xl text-sm leading-relaxed shadow-sm whitespace-pre-line ${
                msg.role === 'user'
                  ? 'bg-[#aae372] text-gray-900 rounded-br-sm'
                  : 'bg-white text-gray-800 rounded-bl-sm'
              }`}
            >
              {msg.text}
            </div>
          </div>
        ))}
      </div>

      {/* Input bar */}
      <div className="flex items-center gap-2 px-3 py-2 bg-[#f0f0f0] border-t border-gray-200 flex-shrink-0">
        <div className="flex-1 bg-white rounded-full px-4 py-2 text-xs text-gray-400 border border-gray-200">
          メッセージを入力...
        </div>
        <div
          className="w-8 h-8 rounded-full flex items-center justify-center text-white flex-shrink-0"
          style={{ backgroundColor: accentColor }}
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
            <path d="M2 21l21-9L2 3v7l15 2-15 2v7z"/>
          </svg>
        </div>
      </div>
    </div>
  )
}
