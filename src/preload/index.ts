import { contextBridge, ipcRenderer } from 'electron'
import type { ImportResult, Contact, DispatchConfig, LogEntry, ConnectionStatus, DispatchProgress } from '../types'

const electronAPI = {
  importContacts: (): Promise<ImportResult> => ipcRenderer.invoke('import-contacts'),
  selectImage: (): Promise<string | null> => ipcRenderer.invoke('select-image'),
  createProfile: (tabId: string): Promise<string> => ipcRenderer.invoke('create-profile', tabId),
  destroyProfile: (tabId: string): Promise<void> => ipcRenderer.invoke('destroy-profile', tabId),
  startDispatch: (tabId: string, config: DispatchConfig, contacts: Contact[]): Promise<void> => ipcRenderer.invoke('start-dispatch', tabId, config, contacts),
  stopDispatch: (tabId: string): Promise<void> => ipcRenderer.invoke('stop-dispatch', tabId),
  getConnectionStatus: (tabId: string): Promise<ConnectionStatus> => ipcRenderer.invoke('get-connection-status', tabId),

  onLog: (callback: (entry: LogEntry) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, entry: LogEntry): void => callback(entry)
    ipcRenderer.on('dispatch-log', handler)
    return () => ipcRenderer.removeListener('dispatch-log', handler)
  },

  onConnectionStatus: (callback: (status: ConnectionStatus, tabId: string) => void): (() => void) => {
    const handler = (_event: Electron.IpcRendererEvent, payload: { status: ConnectionStatus; tabId: string }): void => callback(payload.status, payload.tabId)
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
