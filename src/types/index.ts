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
  tempoEntreLotes: number
}

export type ConnectionStatus = 'buscando-qr' | 'autenticado' | 'desconectado'

export interface LogEntry {
  id: string
  timestamp: string
  level: 'info' | 'success' | 'warning' | 'error'
  message: string
}

export interface DispatchProgress {
  total: number
  enviados: number
  erros: number
  atual: number
  results: Record<string, 'success' | 'error'>
}

export interface ImportResult {
  contatos: Contact[]
  erros: string[]
}

export interface ElectronAPI {
  importContacts: () => Promise<ImportResult>
  getContacts: () => Promise<Contact[]>
  addContact: (contact: Omit<Contact, 'id'>) => Promise<Contact>
  removeContact: (id: string) => Promise<void>
  startDispatch: (config: DispatchConfig) => Promise<void>
  stopDispatch: () => Promise<void>
  getConnectionStatus: () => Promise<ConnectionStatus>
  selectImage: () => Promise<string | null>
  onLog: (callback: (entry: LogEntry) => void) => () => void
  onConnectionStatus: (callback: (status: ConnectionStatus) => void) => () => void
  onDispatchProgress: (callback: (progress: DispatchProgress) => void) => () => void
}
