import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as path from 'path'
import * as os from 'os'
import * as fs from 'fs'
import type { Contact, DispatchConfig, LogEntry, ConnectionStatus, DispatchProgress } from '../types'
import { parseXLSX, parseCSV } from '../engine/contact-parser'
import { launchBrowser, navigateToWhatsApp, waitForAuthentication } from '../engine/browser-manager'
import { Dispatcher } from '../engine/dispatcher'
import { v4 as uuidv4 } from 'uuid'

interface TabInstance {
  dispatcher: Dispatcher | null
  browser: import('puppeteer').Browser | null
  profileDir: string
}

const tabInstances = new Map<string, TabInstance>()

function getWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows()
  return wins.length > 0 ? wins[0] : null
}

function emitLog(entry: LogEntry): void {
  const win = getWindow()
  if (win) win.webContents.send('dispatch-log', entry)
}

function emitStatus(status: ConnectionStatus, tabId: string): void {
  const win = getWindow()
  if (win) win.webContents.send('connection-status', { status, tabId })
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

function emitProgress(progress: DispatchProgress): void {
  const win = getWindow()
  if (win) win.webContents.send('dispatch-progress', progress)
}

export function setupIpcHandlers(): void {
  ipcMain.handle('import-contacts', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Planilhas', extensions: ['xlsx', 'csv'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return { contatos: [], erros: [] }
    }

    const filePath = result.filePaths[0]
    const ext = path.extname(filePath).toLowerCase()

    try {
      let imported: Contact[]
      if (ext === '.xlsx') {
        imported = parseXLSX(filePath)
      } else if (ext === '.csv') {
        imported = parseCSV(filePath)
      } else {
        return { contatos: [], erros: [`Formato não suportado: ${ext}`] }
      }

      return { contatos: imported, erros: [] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na importação'
      return { contatos: [], erros: [msg] }
    }
  })

  ipcMain.handle('select-image', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openFile'],
      filters: [{ name: 'Imagens', extensions: ['jpg', 'jpeg', 'png'] }]
    })

    if (result.canceled || result.filePaths.length === 0) {
      return null
    }

    return result.filePaths[0]
  })

  ipcMain.handle('create-profile', (_event, tabId: string) => {
    const appData = process.env.APPDATA || path.join(os.homedir(), '.config')
    const profileDir = path.join(appData, 'disparazap', 'profiles', tabId)
    if (!fs.existsSync(profileDir)) {
      fs.mkdirSync(profileDir, { recursive: true })
    }
    tabInstances.set(tabId, { dispatcher: null, browser: null, profileDir })
    return profileDir
  })

  ipcMain.handle('destroy-profile', async (_event, tabId: string) => {
    const inst = tabInstances.get(tabId)
    if (!inst) return
    if (inst.dispatcher) {
      inst.dispatcher.stop()
      inst.dispatcher = null
    }
    if (inst.browser) {
      try { await inst.browser.close() } catch { /* ignora */ }
      inst.browser = null
    }
    tabInstances.delete(tabId)
  })

  ipcMain.handle('start-dispatch', async (_event, tabId: string, config: DispatchConfig, contacts: Contact[]) => {
    if (contacts.length === 0) {
      throw new Error('Nenhum contato na lista')
    }

    let inst = tabInstances.get(tabId)
    if (!inst) {
      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'error', message: 'Perfil não encontrado para esta aba', tabId })
      return
    }

    let browser: import('puppeteer').Browser | null = null

    try {
      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'info', message: 'Iniciando navegador...', tabId })

      const launched = await launchBrowser(inst.profileDir)
      browser = launched.browser
      inst.browser = browser
      const page = launched.page
      await navigateToWhatsApp(page)

      await sleep(3000)

      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'info', message: 'Verificando sessão do WhatsApp...', tabId })

      const authenticated = await waitForAuthentication(page, 180000)
      if (!authenticated) {
        emitStatus('desconectado', tabId)
        throw new Error('Falha na autenticação do WhatsApp — QR Code não escaneado a tempo')
      }

      emitStatus('autenticado', tabId)
      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'success', message: 'WhatsApp autenticado com sucesso', tabId })

      const tabLog = (entry: LogEntry): void => emitLog({ ...entry, tabId })
      const tabStatus = (status: ConnectionStatus): void => emitStatus(status, tabId)
      const tabProgress = (progress: DispatchProgress): void => emitProgress({ ...progress, tabId })

      const dispatcher = new Dispatcher(page, tabLog, tabStatus, tabProgress)
      inst.dispatcher = dispatcher

      const enforcedConfig: DispatchConfig = {
        ...config,
        delayMin: Math.max(60, config.delayMin)
      }

      await dispatcher.start(contacts, enforcedConfig)
      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'info', message: 'Disparo finalizado. Fechando navegador...', tabId })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no disparo'
      emitLog({ id: uuidv4(), timestamp: new Date().toLocaleTimeString('pt-BR'), level: 'error', message: msg, tabId })
      emitStatus('desconectado', tabId)
    } finally {
      inst.dispatcher = null
      inst.browser = null
      if (browser) {
        try { await browser.close() } catch { /* ignora */ }
      }
    }
  })

  ipcMain.handle('stop-dispatch', async (_event, tabId: string) => {
    const inst = tabInstances.get(tabId)
    if (inst && inst.dispatcher) {
      inst.dispatcher.stop()
      inst.dispatcher = null
    }
  })

  ipcMain.handle('get-connection-status', (_event, tabId: string) => {
    const inst = tabInstances.get(tabId)
    if (!inst) return 'desconectado'
    return 'desconectado'
  })
}
