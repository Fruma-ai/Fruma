import { useEffect, useRef, useState } from 'react'

const stageDurations = [2400, 3000, 3200, 5500]

export default function useNetworkPlayback() {
  const containerRef = useRef<HTMLElement>(null)
  const [stage, setStage] = useState(0)
  const [iteration, setIteration] = useState(0)
  const [inView, setInView] = useState(false)
  const [pageVisible, setPageVisible] = useState(true)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const preference = window.matchMedia('(prefers-reduced-motion: reduce)')
    const updatePreference = () => setReducedMotion(preference.matches)
    const updateVisibility = () => setPageVisible(document.visibilityState === 'visible')
    updatePreference()
    updateVisibility()
    preference.addEventListener('change', updatePreference)
    document.addEventListener('visibilitychange', updateVisibility)
    const observer = new IntersectionObserver(([entry]) => setInView(entry?.isIntersecting ?? false), { threshold: 0.2 })
    const element = containerRef.current
    if (element) observer.observe(element)
    return () => {
      observer.disconnect()
      preference.removeEventListener('change', updatePreference)
      document.removeEventListener('visibilitychange', updateVisibility)
    }
  }, [])

  const running = inView && pageVisible && !reducedMotion

  useEffect(() => {
    if (!running) return
    const timeout = window.setTimeout(() => setStage(previous => (previous + 1) % stageDurations.length), stageDurations[stage] ?? 3000)
    return () => window.clearTimeout(timeout)
  }, [running, stage, iteration])

  return {
    containerRef,
    stage: reducedMotion ? 3 : stage,
    running,
    reducedMotion,
  }
}
