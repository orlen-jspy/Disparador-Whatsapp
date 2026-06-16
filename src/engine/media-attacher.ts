import type { Page } from 'puppeteer'
import { clipboard, nativeImage } from 'electron'

export async function pasteImageToClipboard(page: Page, filePath: string): Promise<void> {
  const image = nativeImage.createFromPath(filePath)
  if (image.isEmpty()) throw new Error(`Não foi possível carregar a imagem: ${filePath}`)

  clipboard.writeImage(image)

  await page.evaluate(() => {
    const input = document.querySelector<HTMLElement>(
      'footer [contenteditable="true"], ' +
      'div[contenteditable="true"][role="textbox"], ' +
      'div[data-testid="conversation-compose-box"] [contenteditable="true"]'
    )
    if (!input) throw new Error('Campo de mensagem não encontrado para colar imagem')
    input.focus()
  })

  await sleep(500 + Math.floor(Math.random() * 300))

  await page.keyboard.down('Control')
  await page.keyboard.press('v')
  await page.keyboard.up('Control')

  await sleep(2000 + Math.floor(Math.random() * 1000))
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
