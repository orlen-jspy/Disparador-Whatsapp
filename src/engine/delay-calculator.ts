export function gaussianDelay(min = 60, max = 180): number {
  const enforcedMin = Math.max(60, min)
  const enforcedMax = Math.max(enforcedMin + 1, max)

  const mean = enforcedMin + (enforcedMax - enforcedMin) * 0.3
  const stdDev = (enforcedMax - enforcedMin) / 6

  let value: number
  let attempts = 0

  do {
    const u1 = Math.random()
    const u2 = Math.random()
    const z = Math.sqrt(-2 * Math.log(u1 + 0.0001)) * Math.cos(2 * Math.PI * u2)
    value = mean + z * stdDev
    attempts++
  } while ((value < enforcedMin || value > enforcedMax) && attempts < 100)

  if (value < enforcedMin) value = enforcedMin
  if (value > enforcedMax) value = enforcedMax

  return Math.round(value * 10) / 10
}

export function microDelay(): number {
  return Math.floor(Math.random() * 1200) + 300
}

export function keyDelay(): number {
  return Math.floor(Math.random() * 91) + 30
}
