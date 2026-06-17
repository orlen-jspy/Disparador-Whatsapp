export interface Contact {
  id: string
  nome: string
  telefone: string
}

export interface DispatchConfig {
  mensagem: string
  delayMin: number
  delayMax: number
  imagemPath: string | null
  lote: number
  recallMin: number
  recallMax: number
}

export type ConnectionStatus = 'buscando-qr' | 'autenticado' | 'desconectado'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
  tabId?: string
}

export interface DispatchProgress {
  total: number
  enviados: number
  erros: number
  atual: number
  results: Record<string, 'success' | 'error'>
  tabId?: string
}

export interface ImportResult {
  contatos: Contact[]
  erros: string[]
}

export interface TabState {
  id: string
  label: string
  contacts: Contact[]
  mensagem: string
  delayMin: number
  delayMax: number
  lote: number
  recallMin: number
  recallMax: number
  imagemPath: string | null
  progress: DispatchProgress | null
  logs: LogEntry[]
  connectionStatus: ConnectionStatus
  disparando: boolean
  profileDir: string
}

export interface ElectronAPI {
  importContacts: () => Promise<ImportResult>
  selectImage: () => Promise<string | null>
  createProfile: (tabId: string) => Promise<string>
  destroyProfile: (tabId: string) => Promise<void>
  startDispatch: (tabId: string, config: DispatchConfig, contacts: Contact[]) => Promise<void>
  stopDispatch: (tabId: string) => Promise<void>
  getConnectionStatus: (tabId: string) => Promise<ConnectionStatus>
  onLog: (callback: (entry: LogEntry) => void) => () => void
  onConnectionStatus: (callback: (status: ConnectionStatus, tabId: string) => void) => () => void
  onDispatchProgress: (callback: (progress: DispatchProgress) => void) => () => void
}
