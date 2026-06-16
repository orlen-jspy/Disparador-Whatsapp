import * as path from 'path'
import * as fs from 'fs'
import * as os from 'os'
import type { Contact } from '../types'
import { v4 as uuidv4 } from 'uuid'

function getDataDir(): string {
  const appData = process.env.APPDATA || path.join(os.homedir(), '.config')
  const dir = path.join(appData, 'novo-disparador')
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true })
  return dir
}

function getStorePath(): string {
  return path.join(getDataDir(), 'contacts.json')
}

export function loadContacts(): Contact[] {
  try {
    const filePath = getStorePath()
    if (!fs.existsSync(filePath)) return []
    const raw = fs.readFileSync(filePath, 'utf-8')
    return JSON.parse(raw)
  } catch {
    return []
  }
}

export function saveContacts(contacts: Contact[]): void {
  try {
    fs.writeFileSync(getStorePath(), JSON.stringify(contacts, null, 2), 'utf-8')
  } catch {
  }
}

export function createContact(nome: string, telefone: string): Contact {
  return { id: uuidv4(), nome, telefone }
}
