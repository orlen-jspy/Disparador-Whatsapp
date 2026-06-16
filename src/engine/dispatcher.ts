import type { Page } from 'puppeteer'
import type { Contact, DispatchConfig, LogEntry, ConnectionStatus, DispatchProgress } from '../types'
import { processSpintax } from './spintax-engine'
import { gaussianDelay } from './delay-calculator'
import { humanType } from './human-typer'
import { pasteImageToClipboard } from './media-attacher'
import { clipboard } from 'electron'
import { v4 as uuidv4 } from 'uuid'

type LogCallback = (entry: LogEntry) => void
type StatusCallback = (status: ConnectionStatus) => void
type ProgressCallback = (progress: DispatchProgress) => void

export class Dispatcher {
  private page: Page
  private onLog: LogCallback
  private onStatus: StatusCallback
  private onProgress: ProgressCallback
  private stopped = false

  constructor(
    page: Page,
    onLog: LogCallback,
    onStatus: StatusCallback,
    onProgress: ProgressCallback
  ) {
    this.page = page
    this.onLog = onLog
    this.onStatus = onStatus
    this.onProgress = onProgress

    page.on('filechooser', (fc) => fc.cancel().catch(() => {}))
  }

  private log(level: LogEntry['level'], message: string): void {
    this.onLog({
      id: uuidv4(),
      timestamp: new Date().toLocaleTimeString('pt-BR'),
      level,
      message
    })
  }

  stop(): void {
    this.stopped = true
  }

  async start(contacts: Contact[], config: DispatchConfig): Promise<void> {
    this.stopped = false
    const total = contacts.length
    let enviados = 0
    let erros = 0
    const results: Record<string, 'success' | 'error'> = {}

    const lote = Math.max(1, config.lote || 1)
    const pauseLote = Math.max(0, config.tempoEntreLotes || 0)
    const batchSize = Math.ceil(contacts.length / lote)

    const batches: Contact[][] = []
    for (let i = 0; i < contacts.length; i += batchSize) {
      batches.push(contacts.slice(i, i + batchSize))
    }

    this.log('info', `Iniciando disparo para ${total} contato(s) em ${batches.length} lote(s)`)

    for (let b = 0; b < batches.length; b++) {
      if (this.stopped) break
      const batch = batches[b]

      if (batches.length > 1) {
        this.log('info', `--- Lote ${b + 1}/${batches.length} (${batch.length} contatos) ---`)
      }

      for (let i = 0; i < batch.length; i++) {
        if (this.stopped) break

        const contact = batch[i]
        this.log('info', `Processando ${i + 1}/${batch.length}: ${contact.nome} (${contact.telefone})`)

        try {
          await this.sendToContact(contact, config)
          enviados++
          results[contact.id] = 'success'
          this.log('success', `Mensagem enviada para ${contact.nome}`)
        } catch (err) {
          erros++
          results[contact.id] = 'error'
          const reason = err instanceof Error ? err.message : 'Erro desconhecido'
          this.log('error', `Erro ao enviar para ${contact.nome}: ${reason}`)
        }

        const totalProcessed = enviados + erros
        this.onProgress({ total, enviados, erros, atual: totalProcessed, results: { ...results } })

        if (i < batch.length - 1 && !this.stopped) {
          const delay = gaussianDelay(config.delayMin, config.delayMax)
          this.log('info', `Aguardando ${delay} segundos...`)
          await this.sleep(delay * 1000)
        }
      }

      if (b < batches.length - 1 && !this.stopped) {
        this.log('info', `Aguardando ${pauseLote}s entre lotes...`)
        await this.sleep(pauseLote * 1000)
      }
    }

    this.onProgress({ total, enviados, erros, atual: total, results: { ...results } })
    this.log('info', `Disparo concluído. Enviados: ${enviados} | Erros: ${erros}`)
  }

  private async sendToContact(contact: Contact, config: DispatchConfig): Promise<void> {
    clipboard.clear()
    const phone = contact.telefone.replace(/\D/g, '')
    const message = processSpintax(config.mensagem, contact.nome)

    this.log('info', `Abrindo conversa com ${contact.nome}...`)
    const opened = await this.openConversation(phone)
    if (!opened) {
      throw new Error(`Não foi possível abrir conversa com ${contact.nome}`)
    }

    this.log('info', 'Campo de mensagem detectado, aguardando estabilização...')
    await this.sleep(2000 + Math.floor(Math.random() * 1000))

    if (config.imagemPath) {
      this.log('info', 'Colando imagem primeiro...')
      await pasteImageToClipboard(this.page, config.imagemPath)
      await this.sleep(2000 + Math.floor(Math.random() * 1000))
    }

    const input = await this.getMessageInput()
    if (!input) throw new Error('Campo de mensagem não encontrado')
    await input.click()
    await this.sleep(500 + Math.floor(Math.random() * 400))

    this.log('info', 'Digitando mensagem...')
    await humanType(this.page, message)

    await this.clickSend()
  }

  private async openConversation(phone: string): Promise<boolean> {
    if (await this.openViaDirectURL(phone)) return true

    this.log('warning', 'URL direta falhou. Voltando pra home e tentando Ctrl+N...')
    await this.goHome()

    if (await this.openViaShortcut(phone)) return true

    this.log('warning', 'Ctrl+N falhou. Tentando barra de busca...')
    await this.goHome()

    return await this.openViaSearchBar(phone)
  }

  private async openViaDirectURL(phone: string): Promise<boolean> {
    try {
      const url = `https://web.whatsapp.com/send?phone=${phone}&type=phone_number&app_absent=0`
      this.log('info', `Navegando para ${url}`)

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      const currentUrl = await this.page.evaluate(() => window.location.href)
      this.log('info', `URL atual após navegação: ${currentUrl}`)

      await this.sleep(3000)

      await this.tryClickContinue()

      const found = await this.waitForChatInput(40000)
      if (found) {
        this.log('info', 'Campo de mensagem encontrado via URL direta')
        return true
      }

      this.log('warning', 'Timeout: campo de mensagem não apareceu')
      return false
    } catch (err) {
      this.log('error', `Exceção na URL direta: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  private async tryClickContinue(): Promise<void> {
    try {
      const clicked = await this.page.evaluate(() => {
        const buttons = document.querySelectorAll<HTMLElement>('button, div[role="button"]')
        for (const btn of buttons) {
          const text = (btn.textContent || '').trim().toLowerCase()
          if (text === 'continuar' || text === 'continue' || text === 'continue to chat') {
            btn.click()
            return true
          }
        }
        return false
      })
      if (clicked) {
        this.log('info', 'Botão Continuar clicado')
        await this.sleep(3000)
        const afterContinue = await this.page.evaluate(() => window.location.href)
        this.log('info', `URL após clicar Continuar: ${afterContinue}`)
      }
    } catch {
      // ignore
    }
  }

  private async waitForChatInput(timeoutMs: number): Promise<boolean> {
    const start = Date.now()
    let lastLog = 0
    while (Date.now() - start < timeoutMs) {
      try {
        const elapsed = Math.floor((Date.now() - start) / 1000)
        if (elapsed - lastLog >= 5) {
          lastLog = elapsed
          this.log('info', `Aguardando campo de mensagem... (${elapsed}s)`)
        }

        const onScreen = await this.page.evaluate(() => {
          const footer = document.querySelector('footer')
          if (footer) {
            const ce = footer.querySelector<HTMLElement>('[contenteditable="true"]')
            if (ce) return 'chat-input'
          }
          return null
        })
        if (onScreen === 'chat-input') return true
      } catch {
        // page might be in transition
      }
      await this.sleep(500)
    }
    return false
  }

  private async openViaShortcut(phone: string): Promise<boolean> {
    try {
      await this.page.keyboard.down('Control')
      await this.page.keyboard.press('n')
      await this.page.keyboard.up('Control')
      await this.sleep(2500)

      const typed = await this.page.evaluate(() => {
        const editables = document.querySelectorAll<HTMLElement>('[contenteditable="true"]')
        if (editables.length > 0) {
          editables[0].focus()
          editables[0].click()
          return true
        }
        return false
      })
      if (!typed) return false

      await this.sleep(500)
      await this.page.keyboard.type(phone, { delay: 80 + Math.floor(Math.random() * 60) })
      await this.sleep(3000)

      const clicked = await this.page.evaluate(() => {
        const items = document.querySelectorAll<HTMLElement>(
          '[role="listitem"], div[data-testid="cell-frame-container"]'
        )
        if (items.length > 0) {
          items[0].click()
          return true
        }
        return false
      })
      if (!clicked) return false

      await this.sleep(3000)
      return await this.waitForChatInput(25000)
    } catch (err) {
      this.log('error', `Erro Ctrl+N: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  private async openViaSearchBar(phone: string): Promise<boolean> {
    try {
      const focused = await this.page.evaluate(() => {
        const editables = document.querySelectorAll<HTMLElement>('[contenteditable="true"]')
        if (editables.length > 0) {
          editables[0].focus()
          editables[0].click()
          return true
        }
        return false
      })
      if (!focused) return false

      await this.sleep(500)
      await this.page.keyboard.type(phone, { delay: 80 + Math.floor(Math.random() * 60) })
      await this.sleep(3000)

      const clicked = await this.page.evaluate(() => {
        const items = document.querySelectorAll<HTMLElement>(
          '[role="listitem"], div[data-testid="cell-frame-container"]'
        )
        if (items.length > 0) {
          items[0].click()
          return true
        }
        return false
      })
      if (!clicked) return false

      await this.sleep(3000)
      return await this.waitForChatInput(25000)
    } catch (err) {
      this.log('error', `Erro busca: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  private async goHome(): Promise<void> {
    try {
      await this.page.goto('https://web.whatsapp.com', {
        waitUntil: 'networkidle2',
        timeout: 15000
      }).catch(() => {})
      await this.sleep(2500)
    } catch {
      // ignore
    }
  }

  private async getMessageInput(): Promise<any> {
    const selectors = [
      'div[data-testid="media-preview"] [contenteditable="true"]',
      'div[data-testid="preview-container"] [contenteditable="true"]',
      'footer [contenteditable="true"]',
      '[contenteditable="true"]'
    ]
    for (const sel of selectors) {
      const el = await this.page.$(sel)
      if (el) return el
    }
    return null
  }

  private async clickSend(): Promise<void> {
    const clicked = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll<HTMLElement>('button')
      for (const btn of buttons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase()
        const text = (btn.textContent || '').trim().toLowerCase()
        if (label === 'enviar' || label === 'send' || text === 'enviar' || text === 'send') {
          btn.click()
          return true
        }
      }
      return false
    })

    if (!clicked) {
      this.log('info', 'Pressionando Enter como fallback...')
      await this.page.keyboard.press('Enter')
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
