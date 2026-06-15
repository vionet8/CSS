import { useCallback, useEffect, useRef, useState } from 'react'
import * as api from '../api/client'

interface Props {
  character: string
  emotion: string
  /** Audio element to sync mouth to (optional) */
  audioRef?: React.RefObject<HTMLAudioElement | null>
  width?: number
  height?: number
  className?: string
  /** Trigger a nod animation */
  nod?: boolean
}

const BLINK_INTERVAL_MIN = 2000
const BLINK_INTERVAL_MAX = 5000
const BLINK_DURATION = 140 // ms
const MORPH_DURATION = 280 // ms for expression change crossfade

// Preload an image and return it
function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => resolve(img)
    img.onerror = reject
    img.src = src
  })
}

export default function AnimatedCharacter({
  character,
  emotion,
  audioRef,
  width = 300,
  height = 400,
  className = '',
  nod = false,
}: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const fromImgRef = useRef<HTMLImageElement | null>(null)
  const toImgRef = useRef<HTMLImageElement | null>(null)
  const morphProgressRef = useRef(1) // 1 = fully on "to" image
  const morphStartRef = useRef(0)
  const isMorphingRef = useRef(false)
  const blinkAlphaRef = useRef(1) // 1 = fully visible
  const isBlinkingRef = useRef(false)
  const blinkTimerRef = useRef<ReturnType<typeof setTimeout>>()
  const rafRef = useRef<number>()
  const mouthOpenRef = useRef(false)
  const analyserRef = useRef<AnalyserNode | null>(null)
  const audioCtxRef = useRef<AudioContext | null>(null)
  const sourceRef = useRef<MediaElementAudioSourceNode | null>(null)
  const dataArrayRef = useRef<Uint8Array | null>(null)

  const [breathPhase, setBreathPhase] = useState(0)
  const [nodOffset, setNodOffset] = useState(0)

  // Breathing animation (CSS, subtle)
  useEffect(() => {
    let t = 0
    const id = setInterval(() => {
      t += 0.03
      setBreathPhase(Math.sin(t) * 3) // ±3px vertical
    }, 50)
    return () => clearInterval(id)
  }, [])

  // Nod animation
  useEffect(() => {
    if (!nod) return
    let t = 0
    const id = setInterval(() => {
      t += 0.25
      setNodOffset(Math.sin(t) * 12)
      if (t > Math.PI * 2) clearInterval(id)
    }, 30)
    return () => clearInterval(id)
  }, [nod])

  // Web Audio mouth sync
  useEffect(() => {
    const audioEl = audioRef?.current
    if (!audioEl) return

    const setup = () => {
      if (audioCtxRef.current) return
      const ctx = new AudioContext()
      const analyser = ctx.createAnalyser()
      analyser.fftSize = 256
      analyser.smoothingTimeConstant = 0.5
      const src = ctx.createMediaElementSource(audioEl)
      src.connect(analyser)
      analyser.connect(ctx.destination)
      const buf = new Uint8Array(analyser.frequencyBinCount)
      audioCtxRef.current = ctx
      analyserRef.current = analyser
      sourceRef.current = src
      dataArrayRef.current = buf
    }

    audioEl.addEventListener('play', setup, { once: true })
    return () => audioEl.removeEventListener('play', setup)
  }, [audioRef])

  // Poll audio amplitude → mouthOpenRef
  useEffect(() => {
    const id = setInterval(() => {
      const analyser = analyserRef.current
      const data = dataArrayRef.current
      if (!analyser || !data) return
      analyser.getByteFrequencyData(data)
      const avg = data.slice(0, 12).reduce((s, v) => s + v, 0) / 12
      mouthOpenRef.current = avg > 30
    }, 50)
    return () => clearInterval(id)
  }, [])

  // Load images when character/emotion changes
  useEffect(() => {
    const prevImg = toImgRef.current
    const nextSrc = api.getCharacterImageUrl(character, emotion)

    loadImage(nextSrc).then(img => {
      fromImgRef.current = prevImg
      toImgRef.current = img
      isMorphingRef.current = true
      morphStartRef.current = performance.now()
      morphProgressRef.current = 0
    }).catch(() => {})
  }, [character, emotion])

  // Blink scheduler
  const scheduleBlink = useCallback(() => {
    const delay = BLINK_INTERVAL_MIN + Math.random() * (BLINK_INTERVAL_MAX - BLINK_INTERVAL_MIN)
    blinkTimerRef.current = setTimeout(() => {
      if (isBlinkingRef.current) { scheduleBlink(); return }
      isBlinkingRef.current = true
      const start = performance.now()

      const animBlink = (now: number) => {
        const elapsed = now - start
        const half = BLINK_DURATION / 2
        if (elapsed < half) {
          // closing
          blinkAlphaRef.current = 1 - (elapsed / half) * 0.85
        } else if (elapsed < BLINK_DURATION) {
          // opening
          blinkAlphaRef.current = 0.15 + ((elapsed - half) / half) * 0.85
        } else {
          blinkAlphaRef.current = 1
          isBlinkingRef.current = false
          scheduleBlink()
          return
        }
        requestAnimationFrame(animBlink)
      }
      requestAnimationFrame(animBlink)
    }, delay)
  }, [])

  useEffect(() => {
    scheduleBlink()
    return () => clearTimeout(blinkTimerRef.current)
  }, [scheduleBlink])

  // Main render loop
  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    const draw = (now: number) => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)

      // Update morph progress
      if (isMorphingRef.current) {
        const elapsed = now - morphStartRef.current
        morphProgressRef.current = Math.min(elapsed / MORPH_DURATION, 1)
        if (morphProgressRef.current >= 1) isMorphingRef.current = false
      }

      const blink = blinkAlphaRef.current

      const drawImg = (img: HTMLImageElement | null, alpha: number) => {
        if (!img || alpha <= 0) return
        ctx.globalAlpha = alpha * blink
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
        ctx.globalAlpha = 1
      }

      if (isMorphingRef.current && fromImgRef.current) {
        drawImg(fromImgRef.current, 1 - morphProgressRef.current)
        drawImg(toImgRef.current, morphProgressRef.current)
      } else {
        drawImg(toImgRef.current, 1)
      }

      rafRef.current = requestAnimationFrame(draw)
    }

    rafRef.current = requestAnimationFrame(draw)
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current) }
  }, [])

  const dy = breathPhase + nodOffset

  return (
    <canvas
      ref={canvasRef}
      width={width}
      height={height}
      className={className}
      style={{
        transform: `translateY(${dy}px)`,
        transition: 'none',
        imageRendering: 'auto',
      }}
    />
  )
}
