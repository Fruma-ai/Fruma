import { useEffect, useRef, useState } from 'react'

const stageDurations = [2400, 3000, 3200, 5500]

export default function useNetworkPlayback() {
  const containerRef = useRef<HTMLElement>(null)
  const [stage, setStage] = useState(0)
  const [paused, setPaused] = useState(false)
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

  const running = inView && pageVisible && !paused && !reducedMotion

  useEffect(() => {
    if (!running) return
    const timeout = window.setTimeout(() => setStage(previous => (previous + 1) % stageDurations.length), stageDurations[stage] ?? 3000)
    return () => window.clearTimeout(timeout)
  }, [running, stage, iteration])

  function replay() {
    setStage(0)
    setIteration(previous => previous + 1)
    setPaused(false)
  }

  function goToStage(index: number) {
    setStage(Math.max(0, Math.min(stageDurations.length - 1, index)))
    setPaused(true)
  }

  return {
    containerRef,
    stage: reducedMotion ? 3 : stage,
    paused,
    running,
    reducedMotion,
    replay,
    goToStage,
    pause: () => setPaused(true),
    togglePaused: () => setPaused(previous => !previous),
  }
}
