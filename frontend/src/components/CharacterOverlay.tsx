import type { Slide } from '../types'
import * as api from '../api/client'

/** キャラクター立ち絵 + セリフ吹き出け。SlideCard・動画書き出しで共通利用 */
export default function CharacterOverlay({ slide, character }: { slide: Slide; character: string }) {
  const emotion = slide.character_emotion || 'normal'
  const x = slide.character_x ?? 68
  const y = slide.character_y ?? 0
  const scale = slide.character_scale ?? 0.55
  const line = (slide.character_line || '').trim()

  // 吹き出しはキャラの頭上に置く（はみ出さないよう左右をクランプ）
  const bubbleLeft = Math.min(72, Math.max(4, x - 14))
  const bubbleBottom = Math.min(88, y + scale * 100 - 4)

  return (
    <>
      <img
        src={api.getCharacterImageUrl(character, emotion)}
        alt=""
        style={{
          position: 'absolute',
          bottom: `${y}%`,
          left: `${x}%`,
          height: `${scale * 100}%`,
          objectFit: 'contain',
          pointerEvents: 'none',
          filter: 'drop-shadow(0 4px 8px rgba(0,0,0,0.35))',
        }}
      />
      {line && (
        <div
          style={{
            position: 'absolute',
            left: `${bubbleLeft}%`,
            bottom: `${bubbleBottom}%`,
            maxWidth: '34%',
            background: '#ffffff',
            color: '#1f2430',
            border: '3px solid #1f2430',
            borderRadius: 16,
            padding: '8px 14px',
            fontSize: 17,
            fontWeight: 700,
            lineHeight: 1.4,
            pointerEvents: 'none',
            boxShadow: '0 3px 10px rgba(0,0,0,0.3)',
          }}
        >
          {line}
          <div
            style={{
              position: 'absolute',
              bottom: -12,
              left: '58%',
              width: 0,
              height: 0,
              borderLeft: '9px solid transparent',
              borderRight: '9px solid transparent',
              borderTop: '12px solid #1f2430',
            }}
          />
        </div>
      )}
    </>
  )
}
