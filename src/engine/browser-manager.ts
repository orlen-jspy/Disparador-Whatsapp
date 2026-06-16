import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import puppeteer from 'puppeteer-extra'
import StealthPlugin from 'puppeteer-extra-plugin-stealth'
import type { Browser, Page } from 'puppeteer'
import { findChrome } from './chrome-finder'

puppeteer.use(StealthPlugin())

const USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'

export interface BrowserSession {
  browser: Browser
  page: Page
}

function getProfileDir(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), '.config')
  const profileDir = path.join(appData, 'novo-disparador', 'profile')
  if (!fs.existsSync(profileDir)) {
    fs.mkdirSync(profileDir, { recursive: true })
  }
  return profileDir
}

export async function launchBrowser(): Promise<BrowserSession> {
  const profileDir = getProfileDir()

  const chromePath = findChrome()
  if (!chromePath) {
    throw new Error(
      'Google Chrome não encontrado. Instale o Chrome ou configure o caminho manualmente.'
    )
  }

  const browser = await puppeteer.launch({
    headless: false,
    defaultViewport: null,
    userDataDir: profileDir,
    executablePath: chromePath,
    args: [
      '--no-sandbox',
      '--disable-blink-features=AutomationControlled',
      '--disable-web-security',
      '--disable-features=IsolateOrigins,site-per-process',
      `--user-agent=${USER_AGENT}`,
      '--window-size=1280,800'
    ]
  })

  const pages = await browser.pages()
  const page = pages[0] || (await browser.newPage())

  await page.setUserAgent(USER_AGENT)

  await page.evaluateOnNewDocument(() => {
    Object.defineProperty(navigator, 'webdriver', { get: () => undefined })
    Object.defineProperty(navigator, 'plugins', { get: () => [1, 2, 3, 4, 5] })
    Object.defineProperty(navigator, 'languages', { get: () => ['pt-BR', 'en-US', 'en'] })
  })

  return { browser, page }
}

export async function navigateToWhatsApp(page: Page): Promise<void> {
  await page.goto('https://web.whatsapp.com', { waitUntil: 'networkidle2', timeout: 60000 })
}

const PANEL_SELECTORS = [
  'div[data-testid="conversation-panel-main"]',
  'div[data-testid="conversation-panel-body"]',
  'div[data-testid="conversation-panel-header"]',
  'div[data-testid="main"]',
  'div[data-testid="chat-list"]',
  'header[data-testid="chat-list-header"]'
]

const QR_SELECTORS = [
  'canvas[aria-label]',
  'div[data-testid="qrcode"]',
  'div[data-ref]'
]

export async function waitForAuthentication(page: Page, timeoutMs = 180000): Promise<boolean> {
  const startTime = Date.now()

  const anySelector = async (selectors: string[]): Promise<boolean> => {
    for (const sel of selectors) {
      try {
        if (await page.$(sel)) return true
      } catch {
        continue
      }
    }
    return false
  }

  const panelFound = await anySelector(PANEL_SELECTORS)
  if (panelFound) return true

  const qrShowing = await anySelector(QR_SELECTORS)

  while (Date.now() - startTime < timeoutMs) {
    const hasPanel = await anySelector(PANEL_SELECTORS)
    if (hasPanel) return true

    const hasQR = await anySelector(QR_SELECTORS)

    if (!hasQR && qrShowing) {
      await sleep(1200)
      continue
    }

    await sleep(250)
  }

  return false
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}
