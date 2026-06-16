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
        this.log('info', `Processando ${i + 1}/${batch.length}: ${contact.nome}`)

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

    await this.sleep(2000 + Math.floor(Math.random() * 1000))

    if (config.imagemPath) {
      this.log('info', 'Colando imagem...')
      await pasteImageToClipboard(this.page, config.imagemPath)
      await this.sleep(2000 + Math.floor(Math.random() * 1000))

      this.log('info', 'Fechando preview da imagem...')
      await this.page.keyboard.press('Escape')
      await this.sleep(1000)
    }

    const input = await this.getMessageInput()
    if (!input) throw new Error('Campo de mensagem não encontrado')
    await input.focus()
    await this.sleep(500 + Math.floor(Math.random() * 400))

    this.log('info', 'Digitando mensagem...')
    await humanType(this.page, message)

    await this.clickSend()
  }

  private async openConversation(phone: string): Promise<boolean> {
    return await this.openViaDirectURL(phone)
  }

  private async openViaDirectURL(phone: string): Promise<boolean> {
    try {
      const url = `https://web.whatsapp.com/send?phone=${phone}&type=phone_number&app_absent=0`
      this.log('info', `Navegando para ${url}`)

      await this.page.goto(url, {
        waitUntil: 'networkidle2',
        timeout: 30000
      })

      await this.sleep(3000)

      const found = await this.waitForChatInput(45000)
      if (found) {
        this.log('info', 'Campo de mensagem encontrado')
        return true
      }

      this.log('warning', 'Timeout aguardando campo de mensagem')
      return false
    } catch (err) {
      this.log('error', `Erro na navegação: ${err instanceof Error ? err.message : err}`)
      return false
    }
  }

  private async waitForChatInput(timeoutMs: number): Promise<boolean> {
    const start = Date.now()
    while (Date.now() - start < timeoutMs) {
      try {
        const result = await this.page.evaluate(() => {
          const continueBtns = document.querySelectorAll<HTMLElement>(
            'button, div[role="button"]'
          )
          for (const btn of continueBtns) {
            const text = (btn.textContent || '').trim().toLowerCase()
            if (text === 'continuar' || text === 'continue' || text === 'continue to chat') {
              btn.click()
              return 'continue-clicked'
            }
          }

          const footer = document.querySelector('footer')
          if (footer) {
            const ce = footer.querySelector<HTMLElement>('[contenteditable="true"]')
            if (ce) return 'input-found'
          }

          return null
        })

        if (result === 'continue-clicked') {
          this.log('info', 'Botão Continuar clicado')
          await this.sleep(2000)
        }

        if (result === 'input-found') return true
      } catch {
        // page may be in transition
      }
      await this.sleep(500)
    }
    return false
  }

  private async getMessageInput(): Promise<any> {
    const el = await this.page.$('footer [contenteditable="true"]')
    return el || null
  }

  private async clickSend(): Promise<void> {
    const sent = await this.page.evaluate(() => {
      const buttons = document.querySelectorAll<HTMLElement>('button')
      for (const btn of buttons) {
        const label = (btn.getAttribute('aria-label') || '').toLowerCase()
        const text = (btn.textContent || '').trim().toLowerCase()
        if (
          btn.getAttribute('data-testid') === 'send' ||
          label === 'enviar' || label === 'send' ||
          text === 'enviar' || text === 'send'
        ) {
          btn.click()
          return 'button'
        }
      }
      return null
    })

    if (!sent) {
      this.log('info', 'Pressionando Enter...')
      await this.page.keyboard.press('Enter')
    }

    await this.sleep(2000 + Math.floor(Math.random() * 1500))

    const vazio = await this.page.evaluate(() => {
      const ce = document.querySelector<HTMLElement>('footer [contenteditable="true"]')
      if (!ce) return false
      return (ce.textContent || '').trim().length === 0
    })

    if (!vazio) {
      this.log('warning', 'Campo ainda tem texto, aguardando mais...')
      await this.sleep(2000)
    }

    this.log('info', 'Mensagem enviada')
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms))
  }
}
