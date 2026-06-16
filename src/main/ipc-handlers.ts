import { ipcMain, dialog, BrowserWindow } from 'electron'
import * as path from 'path'
import type { Contact, DispatchConfig, LogEntry, ConnectionStatus, DispatchProgress } from '../types'
import { parseXLSX, parseCSV } from '../engine/contact-parser'
import { launchBrowser, navigateToWhatsApp, waitForAuthentication } from '../engine/browser-manager'
import { Dispatcher } from '../engine/dispatcher'
import { loadContacts, saveContacts, createContact } from './contact-store'
import { v4 as uuidv4 } from 'uuid'

let contacts: Contact[] = loadContacts()
let dispatcher: Dispatcher | null = null
let connectionStatus: ConnectionStatus = 'desconectado'

function getWindow(): BrowserWindow | null {
  const wins = BrowserWindow.getAllWindows()
  return wins.length > 0 ? wins[0] : null
}

function emitLog(entry: LogEntry): void {
  const win = getWindow()
  if (win) win.webContents.send('dispatch-log', entry)
}

function emitStatus(status: ConnectionStatus): void {
  connectionStatus = status
  const win = getWindow()
  if (win) win.webContents.send('connection-status', status)
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

      contacts = contacts.concat(imported)
      saveContacts(contacts)
      return { contatos: imported, erros: [] }
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro na importação'
      return { contatos: [], erros: [msg] }
    }
  })

  ipcMain.handle('get-contacts', () => {
    return contacts
  })

  ipcMain.handle('add-contact', (_event, contact: Omit<Contact, 'id'>) => {
    const newContact = createContact(contact.nome, contact.telefone)
    contacts.push(newContact)
    saveContacts(contacts)
    return newContact
  })

  ipcMain.handle('remove-contact', (_event, id: string) => {
    contacts = contacts.filter((c) => c.id !== id)
    saveContacts(contacts)
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

  ipcMain.handle('start-dispatch', async (_event, config: DispatchConfig) => {
    if (contacts.length === 0) {
      throw new Error('Nenhum contato na lista')
    }

    let browser: import('puppeteer').Browser | null = null

    try {
      const launched = await launchBrowser()
      browser = launched.browser
      const page = launched.page
      await navigateToWhatsApp(page)

      await sleep(3000)

      emitLog({
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level: 'info',
        message: 'Verificando sessão do WhatsApp...'
      })

      const authenticated = await waitForAuthentication(page, 180000)
      if (!authenticated) {
        emitStatus('desconectado')
        throw new Error('Falha na autenticação do WhatsApp — QR Code não escaneado a tempo')
      }

      emitStatus('autenticado')
      emitLog({
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level: 'success',
        message: 'WhatsApp autenticado com sucesso'
      })

      dispatcher = new Dispatcher(page, emitLog, emitStatus, emitProgress)

      const enforcedConfig: DispatchConfig = {
        ...config,
        delayMin: Math.max(60, config.delayMin)
      }

      await dispatcher.start(contacts, enforcedConfig)
      emitLog({
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level: 'info',
        message: 'Disparo finalizado. Fechando navegador...'
      })
    } catch (err) {
      const msg = err instanceof Error ? err.message : 'Erro no disparo'
      emitLog({
        id: uuidv4(),
        timestamp: new Date().toLocaleTimeString('pt-BR'),
        level: 'error',
        message: msg
      })
      emitStatus('desconectado')
    } finally {
      dispatcher = null
      if (browser) {
        try { await browser.close() } catch { /* ignora */ }
      }
    }
  })

  ipcMain.handle('stop-dispatch', async () => {
    if (dispatcher) {
      dispatcher.stop()
      dispatcher = null
    }
  })

  ipcMain.handle('get-connection-status', () => {
    return connectionStatus
  })
}
