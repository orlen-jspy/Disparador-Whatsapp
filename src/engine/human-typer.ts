import type { Page } from 'puppeteer'
import { keyDelay } from './delay-calculator'

const TYPO_CHANCE = 0.02
const KEYBOARD_ROWS = [
  ['q', 'w', 'e', 'r', 't', 'y', 'u', 'i', 'o', 'p'],
  ['a', 's', 'd', 'f', 'g', 'h', 'j', 'k', 'l'],
  ['z', 'x', 'c', 'v', 'b', 'n', 'm']
]

function getNearbyKey(char: string): string {
  const lower = char.toLowerCase()
  for (const row of KEYBOARD_ROWS) {
    const idx = row.indexOf(lower)
    if (idx !== -1) {
      const offset = Math.random() < 0.5 ? -1 : 1
      const neighbor = row[idx + offset]
      if (neighbor) return char === lower ? neighbor : neighbor.toUpperCase()
    }
  }
  return lower
}

export async function humanType(page: Page, text: string): Promise<void> {
  for (let i = 0; i < text.length; i++) {
    const char = text[i]

    if (Math.random() < TYPO_CHANCE && char !== ' ') {
      const typoChar = getNearbyKey(char)
      await page.keyboard.sendCharacter(typoChar)
      await delay(keyDelay() * 2)
      await page.keyboard.press('Backspace')
      await delay(keyDelay())
    }

    await page.keyboard.sendCharacter(char)
    await delay(keyDelay())
  }
}

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
