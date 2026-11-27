import { useEffect, useRef, useState, type SyntheticEvent } from 'react'
import { Pause, Play } from 'lucide-react'
const frumaMark = '/fruma/assets/fruma-purple-mark.jpeg'
import { Button } from '../../lib/shadcn/button'
import { sampleBrandDots, type BrandSparklePoint } from './sampleBrandDots'

export default function SparklingBrandMark() {
  const containerRef = useRef<HTMLDivElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const elapsedRef = useRef(0)
  const dimensionsRef = useRef({ width: 0, height: 0 })
  const [points, setPoints] = useState<BrandSparklePoint[]>([])
  const [paused, setPaused] = useState(false)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)
  const running = inView && pageVisible && !paused && !reducedMotion

  useEffect(() => {
    const element = containerRef.current
    const canvas = canvasRef.current
    if (!element || !canvas) return
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible')
    updatePreference()
    updateVisibility()
    preference.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', updateVisibility)
    const visibilityObserver = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0.15 })
    visibilityObserver.observe(element)

    const updateSize = () => {
      const width = element.clientWidth
      const height = element.clientHeight
      const pixelRatio = Math.min(window.devicePixelRatio || 1, 2)
      dimensionsRef.current = { width, height }
      canvas.width = Math.round(width * pixelRatio)
      canvas.height = Math.round(height * pixelRatio)
      canvas.getContext('2d')?.setTransform(pixelRatio, 0, 0, pixelRatio, 0, 0)
    }
    const resizeObserver = new ResizeObserver(updateSize)
    resizeObserver.observe(element)
    updateSize()
    return () => {
      visibilityObserver.disconnect()
      resizeObserver.disconnect()
      preference.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext('2d')
    if (!canvas || !context || !running || points.length === 0) return
    const style = getComputedStyle(canvas)
    const highlight = style.getPropertyValue('--brand-highlight').trim()
    const violet = style.getPropertyValue('--brand-glow').trim()
    const light = style.getPropertyValue('--brand-foreground').trim()
    let animationFrame = 0
    let previousTime = 0
    let previousDraw = 0

    function draw(timestamp: number) {
      if (!context) return
      if (previousTime > 0) elapsedRef.current += Math.min(timestamp - previousTime, 64)
      previousTime = timestamp
      // Cap decorative rendering at 30 fps; CSS handles the broad shimmer.
      if (timestamp - previousDraw >= 1000 / 30) {
        previousDraw = timestamp
        const { width, height } = dimensionsRef.current
        const imageSize = Math.max(width, height)
        const offsetX = (width - imageSize) / 2
        const offsetY = (height - imageSize) / 2
        const scale = Math.max(imageSize / 590, 0.55)
        context.clearRect(0, 0, width, height)
        for (const point of points) {
          const progress = ((elapsedRef.current + point.phase) % point.duration) / point.duration
          const strength = Math.pow(Math.max(0, Math.sin(progress * Math.PI)), 12)
          if (strength < 0.02) continue
          const x = point.x * imageSize + offsetX
          const y = point.y * imageSize + offsetY
          const radius = (3.5 + strength * 5) * point.size * scale
          const glow = context.createRadialGradient(x, y, 0, x, y, radius)
          glow.addColorStop(0, `hsl(${light} / ${strength * 0.95})`)
          glow.addColorStop(0.22, `hsl(${highlight} / ${strength * 0.9})`)
          glow.addColorStop(1, `hsl(${violet} / 0)`)
          context.fillStyle = glow
          context.beginPath()
          context.arc(x, y, radius, 0, Math.PI * 2)
          context.fill()
        }
      }
      animationFrame = window.requestAnimationFrame(draw)
    }

    animationFrame = window.requestAnimationFrame(draw)
    return () => window.cancelAnimationFrame(animationFrame)
  }, [points, running])

  function prepareSparkles(event: SyntheticEvent<HTMLImageElement>) {
    try {
      setPoints(sampleBrandDots(event.currentTarget))
    } catch {
      // If canvas sampling is unavailable, retain the original artwork and CSS shimmer.
      setPoints([])
    }
  }

  return (
    <div ref={containerRef} className="fruma-f-animation" data-running={running}>
      <div className="fruma-f-artwork">
        <img className="fruma-f-base" src={frumaMark} alt="Fruma’s purple dotted F brand mark" fetchPriority="high" onLoad={prepareSparkles} />
        <img className="fruma-f-sheen" src={frumaMark} alt="" aria-hidden="true" />
        <canvas ref={canvasRef} aria-hidden="true" />
      </div>
      {!reducedMotion && <Button variant="ghost" className="fruma-f-motion-control" onClick={() => setPaused(previous => !previous)} aria-label={paused ? 'Play F sparkle animation' : 'Pause F sparkle animation'}>{paused ? <Play /> : <Pause />}{paused ? 'Play sparkle' : 'Pause sparkle'}</Button>}
    </div>
  )
}
