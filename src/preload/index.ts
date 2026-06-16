import { contextBridge, ipcRenderer } from 'electron'
import type { ImportResult, Contact, DispatchConfig, LogEntry, ConnectionStatus, DispatchProgress } from '../types'

const electronAPI = {
  importContacts: (): Promise<ImportResult> => ipcRenderer.invoke('import-contacts'),
  getContacts: (): Promise<Contact[]> => ipcRenderer.invoke('get-contacts'),
  addContact: (contact: Omit<Contact, 'id'>): Promise<Contact> => ipcRenderer.invoke('add-contact', contact),
  removeContact: (id: string): Promise<void> => ipcRenderer.invoke('remove-contact', id),
  startDispatch: (config: DispatchConfig): Promise<void> => ipcRenderer.invoke('start-dispatch', config),
  stopDispatch: (): Promise<void> => ipcRenderer.invoke('stop-dispatch'),
  getConnectionStatus: (): Promise<ConnectionStatus> => ipcRenderer.invoke('get-connection-status'),
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('select-image'),

  onLog: (callback: (entry: LogEntry) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, entry: LogEntry): void => callback(entry)
    ipcRenderer.on('dispatch-log', handler)
    return () => ipcRenderer.removeListener('dispatch-log', handler)
  },

  onConnectionStatus: (callback: (status: ConnectionStatus) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, status: ConnectionStatus): void => callback(status)
    ipcRenderer.on('connection-status', handler)
    return () => ipcRenderer.removeListener('connection-status', handler)
  },

  onDispatchProgress: (callback: (progress: DispatchProgress) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, progress: DispatchProgress): void => callback(progress)
    ipcRenderer.on('dispatch-progress', handler)
    return () => ipcRenderer.removeListener('dispatch-progress', handler)
  }
} as const

contextBridge.exposeInMainWorld('electronAPI', electronAPI)
