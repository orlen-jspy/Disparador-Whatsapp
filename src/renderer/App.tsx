import React, { useEffect, useState, useCallback, useRef } from 'react'
import type { LogEntry, ConnectionStatus, DispatchProgress, TabState, Contact } from '../types'
import Dashboard from './components/Dashboard'
import ContactsPanel from './components/ContactsPanel'
import MessageComposer from './components/MessageComposer'
import MediaSelector from './components/MediaSelector'
import DelayConfig from './components/DelayConfig'
import BatchConfig from './components/BatchConfig'
import SendButton from './components/SendButton'
import LogConsole from './components/LogConsole'
import TabSidebar from './components/TabSidebar'
import ResizableDivider from './components/ResizableDivider'

declare global {
  interface Window {
    electronAPI: import('../types').ElectronAPI
  }
}

function newTabId(): string {
  return crypto.randomUUID()
}

const clamp = (min: number, max: number, v: number) => Math.max(min, Math.min(max, v))

function createDefaultTab(id: string, profileDir: string): TabState {
  return {
    id,
    label: `Disparo ${id.slice(0, 4)}`,
    contacts: [],
    mensagem: '',
    delayMin: 60,
    delayMax: 180,
    lote: 1,
    recallMin: 300,
    recallMax: 500,
    imagemPath: null,
    progress: null,
    logs: [],
    connectionStatus: 'desconectado',
    disparando: false,
    profileDir
  }
}

export default function App(): React.ReactElement {
  const [tabs, setTabs] = useState<TabState[]>([])
  const [activeTabId, setActiveTabId] = useState<string>('')
  const [initialized, setInitialized] = useState(false)

  const [leftWidth, setLeftWidth] = useState(320)
  const [logHeight, setLogHeight] = useState(192)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [sidebarWidth, setSidebarWidth] = useState(192)
  const leftWidthRef = useRef(320)
  const logHeightRef = useRef(192)
  const sidebarWidthRef = useRef(192)

  useEffect(() => {
    initFirstTab()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  async function initFirstTab(): Promise<void> {
    const id = newTabId()
    const profileDir = await window.electronAPI.createProfile(id)
    const tab = createDefaultTab(id, profileDir)
    setTabs([tab])
    setActiveTabId(id)
    setInitialized(true)
  }

  const activeTab = tabs.find(t => t.id === activeTabId)

  const updateTab = useCallback((tabId: string, partial: Partial<TabState>) => {
    setTabs(prev => prev.map(t => t.id === tabId ? { ...t, ...partial } : t))
  }, [])

  useEffect(() => {
    if (!initialized) return

    const unsubLog = window.electronAPI.onLog((entry: LogEntry) => {
      if (entry.tabId) {
        setTabs(prev => prev.map(t => t.id === entry.tabId
          ? { ...t, logs: [...t.logs.slice(-499), { ...entry }] }
          : t))
      }
    })

    const unsubStatus = window.electronAPI.onConnectionStatus((status: ConnectionStatus, tabId: string) => {
      setTabs(prev => prev.map(t => t.id === tabId ? { ...t, connectionStatus: status } : t))
    })

    const unsubProgress = window.electronAPI.onDispatchProgress((p: DispatchProgress) => {
      if (p.tabId) {
        setTabs(prev => prev.map(t => t.id === p.tabId ? { ...t, progress: { ...p } } : t))
      }
    })

    return () => {
      unsubLog()
      unsubStatus()
      unsubProgress()
    }
  }, [initialized])

  const handleStart = useCallback(async () => {
    if (!activeTab) return
    if (!activeTab.mensagem.trim()) return

    updateTab(activeTab.id, { disparando: true, progress: null })

    try {
      await window.electronAPI.startDispatch(activeTab.id, {
        mensagem: activeTab.mensagem.trim(),
        delayMin: activeTab.delayMin,
        delayMax: activeTab.delayMax,
        imagemPath: activeTab.imagemPath,
        lote: activeTab.lote,
        recallMin: activeTab.recallMin,
        recallMax: activeTab.recallMax
      }, activeTab.contacts)
    } catch {
    } finally {
      updateTab(activeTab.id, { disparando: false })
    }
  }, [activeTab, updateTab])

  const handleStop = useCallback(async () => {
    if (!activeTab) return
    await window.electronAPI.stopDispatch(activeTab.id)
    updateTab(activeTab.id, { disparando: false })
  }, [activeTab, updateTab])

  const handleSelectImage = useCallback(async () => {
    if (!activeTab) return
    const path = await window.electronAPI.selectImage()
    if (path !== null) {
      updateTab(activeTab.id, { imagemPath: path })
    }
  }, [activeTab, updateTab])

  const handleClearStatus = useCallback(() => {
    if (!activeTab) return
    updateTab(activeTab.id, { progress: null, logs: [] })
  }, [activeTab, updateTab])

  const handleNewTab = useCallback(async () => {
    const id = newTabId()
    const profileDir = await window.electronAPI.createProfile(id)
    const tab = createDefaultTab(id, profileDir)
    setTabs(prev => [...prev, tab])
    setActiveTabId(id)
  }, [])

  const handleDuplicateTab = useCallback(async (sourceId: string) => {
    const source = tabs.find(t => t.id === sourceId)
    if (!source) return
    const id = newTabId()
    const profileDir = await window.electronAPI.createProfile(id)
    const tab: TabState = {
      ...createDefaultTab(id, profileDir),
      contacts: source.contacts.map(c => ({ ...c })),
      mensagem: source.mensagem,
      delayMin: source.delayMin,
      delayMax: source.delayMax,
      lote: source.lote,
      recallMin: source.recallMin,
      recallMax: source.recallMax,
      imagemPath: source.imagemPath,
      label: source.label + ' (cópia)'
    }
    setTabs(prev => [...prev, tab])
    setActiveTabId(id)
  }, [tabs])

  const handleRemoveTab = useCallback(async (tabId: string) => {
    const tab = tabs.find(t => t.id === tabId)
    if (tab?.disparando) {
      await window.electronAPI.stopDispatch(tabId)
    }
    await window.electronAPI.destroyProfile(tabId)

    if (tabs.length <= 1) {
      const id = newTabId()
      const profileDir = await window.electronAPI.createProfile(id)
      setTabs([createDefaultTab(id, profileDir)])
      setActiveTabId(id)
      return
    }

    setTabs(prev => prev.filter(t => t.id !== tabId))
    if (activeTabId === tabId) {
      const remaining = tabs.filter(t => t.id !== tabId)
      setActiveTabId(remaining[0].id)
    }
  }, [tabs, activeTabId])

  const handleRenameTab = useCallback((tabId: string, name: string) => {
    updateTab(tabId, { label: name })
  }, [updateTab])

  const handleSubscribe = useCallback(() => {
    if (!activeTab) return
    updateTab(activeTab.id, {
      progress: null,
      logs: [],
      disparando: false,
      connectionStatus: 'desconectado'
    })
  }, [activeTab, updateTab])

  const handleContactsChange = useCallback((newContacts: Contact[]) => {
    if (!activeTab) return
    updateTab(activeTab.id, { contacts: newContacts })
  }, [activeTab, updateTab])

  const handleMensagemChange = useCallback((value: string) => {
    if (!activeTab) return
    updateTab(activeTab.id, { mensagem: value })
  }, [activeTab, updateTab])

  if (!activeTab) {
    return (
      <div className="h-screen flex items-center justify-center bg-surface-900 text-surface-400">
        Inicializando...
      </div>
    )
  }

  return (
    <div className="h-screen flex flex-col bg-surface-900 text-white select-none">
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-700 bg-surface-800">
        <h1 className="text-lg font-semibold text-primary-400">DisparaZAP</h1>
        <div className="flex items-center gap-4">
          {(activeTab.progress || activeTab.logs.length > 0) && (
            <button
              onClick={handleClearStatus}
              className="text-xs text-surface-400 hover:text-surface-200 transition-colors"
            >
              Limpar Status
            </button>
          )}
          <Dashboard status={activeTab.connectionStatus} progress={activeTab.progress} />
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside style={{ width: leftWidth, minWidth: 200 }} className="shrink-0 border-r border-surface-700 flex flex-col bg-surface-800">
          <ContactsPanel
            disparando={activeTab.disparando}
            results={activeTab.progress?.results ?? {}}
            contacts={activeTab.contacts}
            onContactsChange={handleContactsChange}
          />
        </aside>

        <ResizableDivider
          direction="vertical"
          onResizeStart={() => { leftWidthRef.current = leftWidth }}
          onResize={(delta) => setLeftWidth(clamp(200, 600, leftWidthRef.current + delta))}
        />

        <main className="flex flex-col overflow-hidden min-w-0 flex-1">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <MessageComposer
              mensagem={activeTab.mensagem}
              onChange={handleMensagemChange}
              disparando={activeTab.disparando}
            />
            <MediaSelector
              imagemPath={activeTab.imagemPath}
              onSelect={handleSelectImage}
              onClear={() => updateTab(activeTab.id, { imagemPath: null })}
              disparando={activeTab.disparando}
            />
            <DelayConfig
              delayMin={activeTab.delayMin}
              delayMax={activeTab.delayMax}
              onChangeMin={(v) => updateTab(activeTab.id, { delayMin: v })}
              onChangeMax={(v) => updateTab(activeTab.id, { delayMax: v })}
              disparando={activeTab.disparando}
            />
            <BatchConfig
              lote={activeTab.lote}
              recallMin={activeTab.recallMin}
              recallMax={activeTab.recallMax}
              onChangeLote={(v) => updateTab(activeTab.id, { lote: v })}
              onChangeRecallMin={(v) => updateTab(activeTab.id, { recallMin: v })}
              onChangeRecallMax={(v) => updateTab(activeTab.id, { recallMax: v })}
              disparando={activeTab.disparando}
            />
            <SendButton
              disparando={activeTab.disparando}
              progress={activeTab.progress}
              onStart={handleStart}
              onStop={handleStop}
              podeIniciar={activeTab.mensagem.trim().length > 0}
            />
          </div>

          <ResizableDivider
            direction="horizontal"
            onResizeStart={() => { logHeightRef.current = logHeight }}
            onResize={(delta) => setLogHeight(clamp(100, 500, logHeightRef.current - delta))}
          />

          <div style={{ height: logHeight, minHeight: 100 }} className="shrink-0 border-t border-surface-700">
            <LogConsole logs={activeTab.logs} />
          </div>
        </main>

        {!sidebarCollapsed && (
          <ResizableDivider
            direction="vertical"
            onResizeStart={() => { sidebarWidthRef.current = sidebarWidth }}
            onResize={(delta) => setSidebarWidth(clamp(150, 400, sidebarWidthRef.current - delta))}
          />
        )}

        <div style={{ width: sidebarCollapsed ? 36 : sidebarWidth }} className="shrink-0">
          <TabSidebar
            tabs={tabs}
            activeTabId={activeTabId}
            collapsed={sidebarCollapsed}
            onToggleCollapse={() => setSidebarCollapsed(c => !c)}
            onSelectTab={setActiveTabId}
            onNewTab={handleNewTab}
            onDuplicateTab={handleDuplicateTab}
            onRemoveTab={handleRemoveTab}
            onRenameTab={handleRenameTab}
            onSubscribe={handleSubscribe}
          />
        </div>
      </div>
    </div>
  )
}
