export type BrandSparklePoint = {
  x: number
  y: number
  duration: number
  phase: number
  size: number
}

/** Sample the supplied artwork so highlights land on actual purple dots. */
export function sampleBrandDots(image: HTMLImageElement): BrandSparklePoint[] {
  const dimension = 512
  const sampler = document.createElement('canvas')
  sampler.width = dimension
  sampler.height = dimension
  const context = sampler.getContext('2d', { willReadFrequently: true })
  if (!context) return []
  context.drawImage(image, 0, 0, dimension, dimension)
  const pixels = context.getImageData(0, 0, dimension, dimension).data
  const candidates: Array<{ x: number; y: number }> = []

  for (let blockY = 0; blockY < dimension; blockY += 5) {
    for (let blockX = 0; blockX < dimension; blockX += 5) {
      let strongest = 0
      let point: { x: number; y: number } | null = null
      for (let y = blockY; y < Math.min(blockY + 5, dimension); y++) {
        for (let x = blockX; x < Math.min(blockX + 5, dimension); x++) {
          const offset = (y * dimension + x) * 4
          const red = pixels[offset] ?? 0
          const green = pixels[offset + 1] ?? 0
          const blue = pixels[offset + 2] ?? 0
          const brightness = red + blue - 2 * green
          if (blue > 110 && blue > green * 1.8 && red > 20 && brightness > strongest) {
            strongest = brightness
            point = { x: (x + 0.5) / dimension, y: (y + 0.5) / dimension }
          }
        }
      }
      if (point) candidates.push(point)
    }
  }

  return Array.from({ length: Math.min(96, candidates.length) }, (_, index) => {
    const point = candidates[Math.floor(((index * 0.61803398875) % 1) * candidates.length)]!
    const duration = 3500 + (index % 11) * 210
    return { ...point, duration, phase: ((index * 0.41421356237) % 1) * duration, size: 0.8 + (index % 5) * 0.15 }
  })
}
