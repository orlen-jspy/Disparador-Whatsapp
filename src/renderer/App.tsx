import React, { useEffect, useState, useCallback } from 'react'
import type { LogEntry, ConnectionStatus, DispatchProgress } from '../types'
import Dashboard from './components/Dashboard'
import ContactsPanel from './components/ContactsPanel'
import MessageComposer from './components/MessageComposer'
import MediaSelector from './components/MediaSelector'
import DelayConfig from './components/DelayConfig'
import BatchConfig from './components/BatchConfig'
import SendButton from './components/SendButton'
import LogConsole from './components/LogConsole'

declare global {
  interface Window {
    electronAPI: import('../types').ElectronAPI
  }
}

export default function App(): React.ReactElement {
  const [connectionStatus, setConnectionStatus] = useState<ConnectionStatus>('desconectado')
  const [logs, setLogs] = useState<LogEntry[]>([])
  const [progress, setProgress] = useState<DispatchProgress | null>(null)
  const [disparando, setDisparando] = useState(false)
  const [mensagem, setMensagem] = useState('')
  const [delayMin, setDelayMin] = useState(60)
  const [delayMax, setDelayMax] = useState(180)
  const [lote, setLote] = useState(1)
  const [tempoEntreLotes, setTempoEntreLotes] = useState(300)
  const [imagemPath, setImagemPath] = useState<string | null>(null)

  useEffect(() => {
    window.electronAPI.getConnectionStatus().then(setConnectionStatus)

    const unsubLog = window.electronAPI.onLog((entry) => {
      setLogs((prev) => [...prev.slice(-499), entry])
    })

    const unsubStatus = window.electronAPI.onConnectionStatus((status) => {
      setConnectionStatus(status)
    })

    const unsubProgress = window.electronAPI.onDispatchProgress((p) => {
      setProgress(p)
    })

    return () => {
      unsubLog()
      unsubStatus()
      unsubProgress()
    }
  }, [])

  const handleStart = useCallback(async () => {
    if (!mensagem.trim()) return
    setDisparando(true)
    setProgress(null)
    setLogs([])
    try {
      await window.electronAPI.startDispatch({
        mensagem: mensagem.trim(),
        delayMin,
        delayMax,
        imagemPath,
        lote,
        tempoEntreLotes
      })
    } catch {
    } finally {
      setDisparando(false)
      setProgress(null)
    }
  }, [mensagem, delayMin, delayMax, imagemPath, lote, tempoEntreLotes])

  const handleStop = useCallback(async () => {
    await window.electronAPI.stopDispatch()
    setDisparando(false)
  }, [])

  const handleSelectImage = useCallback(async () => {
    const path = await window.electronAPI.selectImage()
    setImagemPath(path)
  }, [])

  return (
    <div className="h-screen flex flex-col bg-surface-900 text-white select-none">
      <header className="flex items-center justify-between px-6 py-3 border-b border-surface-700 bg-surface-800">
        <h1 className="text-lg font-semibold text-primary-400">Novo Disparador</h1>
        <Dashboard status={connectionStatus} progress={progress} />
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 border-r border-surface-700 flex flex-col bg-surface-800">
          <ContactsPanel disparando={disparando} results={progress?.results ?? {}} />
        </aside>

        <main className="flex-1 flex flex-col overflow-hidden">
          <div className="flex-1 p-4 space-y-4 overflow-y-auto">
            <MessageComposer
              mensagem={mensagem}
              onChange={setMensagem}
              disparando={disparando}
            />
            <MediaSelector
              imagemPath={imagemPath}
              onSelect={handleSelectImage}
              onClear={() => setImagemPath(null)}
              disparando={disparando}
            />
            <DelayConfig
              delayMin={delayMin}
              delayMax={delayMax}
              onChangeMin={setDelayMin}
              onChangeMax={setDelayMax}
              disparando={disparando}
            />
            <BatchConfig
              lote={lote}
              tempoEntreLotes={tempoEntreLotes}
              onChangeLote={setLote}
              onChangeTempoEntreLotes={setTempoEntreLotes}
              disparando={disparando}
            />
            <SendButton
              disparando={disparando}
              progress={progress}
              onStart={handleStart}
              onStop={handleStop}
              podeIniciar={mensagem.trim().length > 0}
            />
          </div>

          <LogConsole logs={logs} />
        </main>
      </div>
    </div>
  )
}
