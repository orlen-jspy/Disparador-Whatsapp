import type { Page } from 'puppeteer'
import { microDelay } from './delay-calculator'

interface Point {
  x: number
  y: number
}

export async function organicMove(page: Page, selector: string): Promise<void> {
  const element = await page.$(selector)
  if (!element) throw new Error(`Elemento não encontrado: ${selector}`)
  const box = await element.boundingBox()
  if (!box) throw new Error(`Elemento sem bounding box: ${selector}`)

  const targetX = box.x + box.width / 2
  const targetY = box.y + box.height / 2

  const startX = targetX - randomOffset(100, 300)
  const startY = targetY - randomOffset(50, 200)

  const control1: Point = {
    x: startX + randomOffset(50, 150),
    y: startY + (targetY - startY) * 0.3 + randomOffset(-30, 30)
  }
  const control2: Point = {
    x: targetX - randomOffset(50, 150),
    y: targetY - (targetY - startY) * 0.3 + randomOffset(-30, 30)
  }

  const steps = 30 + Math.floor(Math.random() * 20)

  for (let i = 0; i <= steps; i++) {
    const t = i / steps
    const x =
      Math.pow(1 - t, 3) * startX +
      3 * Math.pow(1 - t, 2) * t * control1.x +
      3 * (1 - t) * Math.pow(t, 2) * control2.x +
      Math.pow(t, 3) * targetX
    const y =
      Math.pow(1 - t, 3) * startY +
      3 * Math.pow(1 - t, 2) * t * control1.y +
      3 * (1 - t) * Math.pow(t, 2) * control2.y +
      Math.pow(t, 3) * targetY

    await page.mouse.move(Math.round(x), Math.round(y))
    await delay(microDelay() / steps + 5)
  }
}

function randomOffset(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
