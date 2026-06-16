import * as fs from 'fs'
import * as XLSX from 'xlsx'
import Papa from 'papaparse'
import { sanitizePhone } from './sanitizer'
import type { Contact } from '../types'
import { v4 as uuidv4 } from 'uuid'

const NAME_HEADERS = ['nome', 'cliente', 'razao_social', 'name', 'contato', 'contato_nome', 'cliente_nome']
const PHONE_HEADERS = ['telefone', 'celular', 'whatsapp', 'numero', 'phone', 'mobile', 'whats', 'tel', 'contato_telefone']

function safeString(val: unknown): string {
  if (val === null || val === undefined) return ''
  return String(val).trim()
}

function findHeader(headers: string[], candidates: string[]): string | null {
  const lowerHeaders = headers.map((h) => h.toLowerCase().trim())
  for (const candidate of candidates) {
    const idx = lowerHeaders.indexOf(candidate)
    if (idx !== -1) return headers[idx]
  }
  for (const candidate of candidates) {
    const idx = lowerHeaders.findIndex((h) => h.includes(candidate))
    if (idx !== -1) return headers[idx]
  }
  return null
}

export function parseXLSX(filePath: string): Contact[] {
  const workbook = XLSX.readFile(filePath)
  const sheetName = workbook.SheetNames[0]
  const sheet = workbook.Sheets[sheetName]
  const json = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '' })

  if (json.length === 0) return []

  const headers = Object.keys(json[0])
  const nameCol = findHeader(headers, NAME_HEADERS)
  const phoneCol = findHeader(headers, PHONE_HEADERS)

  if (!nameCol || !phoneCol) {
    throw new Error(
      `Cabeçalhos não reconhecidos. Encontrados: ${headers.join(', ')}. ` +
        `Esperava colunas similares a "Nome" e "Telefone".`
    )
  }

  const contacts: Contact[] = []
  for (const row of json) {
    const nome = safeString(row[nameCol])
    const rawPhone = safeString(row[phoneCol])
    if (!nome || !rawPhone) continue
    const telefone = sanitizePhone(rawPhone)
    if (telefone) {
      contacts.push({ id: uuidv4(), nome, telefone })
    }
  }

  return contacts
}

export function parseCSV(filePath: string): Contact[] {
  const content = fs.readFileSync(filePath, 'utf-8')
  const result = Papa.parse<Record<string, string>>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (h) => h.trim()
  })

  if (result.data.length === 0) return []

  const headers = Object.keys(result.data[0])
  const nameCol = findHeader(headers, NAME_HEADERS)
  const phoneCol = findHeader(headers, PHONE_HEADERS)

  if (!nameCol || !phoneCol) {
    throw new Error(
      `Cabeçalhos não reconhecidos. Encontrados: ${headers.join(', ')}. ` +
        `Esperava colunas similares a "Nome" e "Telefone".`
    )
  }

  const contacts: Contact[] = []
  for (const row of result.data) {
    const nome = safeString(row[nameCol])
    const rawPhone = safeString(row[phoneCol])
    if (!nome || !rawPhone) continue
    const telefone = sanitizePhone(rawPhone)
    if (telefone) {
      contacts.push({ id: uuidv4(), nome, telefone })
    }
  }

  return contacts
}
