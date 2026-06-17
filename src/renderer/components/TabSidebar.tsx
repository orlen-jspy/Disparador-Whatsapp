import React, { useState, useCallback, useEffect, useRef } from 'react'
import type { TabState } from '../../types'

interface Props {
  tabs: TabState[]
  activeTabId: string
  collapsed: boolean
  onToggleCollapse: () => void
  onSelectTab: (id: string) => void
  onNewTab: () => void
  onDuplicateTab: (id: string) => void
  onRemoveTab: (id: string) => void
  onRenameTab: (id: string, name: string) => void
  onSubscribe: () => void
}

export default function TabSidebar({
  tabs,
  activeTabId,
  collapsed,
  onToggleCollapse,
  onSelectTab,
  onNewTab,
  onDuplicateTab,
  onRemoveTab,
  onRenameTab,
  onSubscribe
}: Props): React.ReactElement {
  const [menuTarget, setMenuTarget] = useState<string | null>(null)
  const [menuPos, setMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [confirmRemove, setConfirmRemove] = useState<string | null>(null)
  const [showNewMenu, setShowNewMenu] = useState(false)
  const [confirmSubscribe, setConfirmSubscribe] = useState(false)
  const [renamingId, setRenamingId] = useState<string | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const menuRef = useRef<HTMLDivElement>(null)
  const renameInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!menuPos) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuPos(null)
        setMenuTarget(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [menuPos])

  useEffect(() => {
    if (renamingId && renameInputRef.current) {
      renameInputRef.current.focus()
      renameInputRef.current.select()
    }
  }, [renamingId])

  const handleContextMenu = useCallback((e: React.MouseEvent, tabId: string) => {
    e.preventDefault()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ x: rect.left + 20, y: rect.bottom + 2 })
    setMenuTarget(tabId)
  }, [])

  const handleStartRename = useCallback(() => {
    if (!menuTarget) return
    const tab = tabs.find(t => t.id === menuTarget)
    setRenameValue(tab?.label || '')
    setRenamingId(menuTarget)
    setMenuPos(null)
    setMenuTarget(null)
  }, [menuTarget, tabs])

  const handleRenameConfirm = useCallback(() => {
    if (!renamingId) return
    const name = renameValue.trim().slice(0, 50) || 'Disparador'
    onRenameTab(renamingId, name)
    setRenamingId(null)
    setRenameValue('')
  }, [renamingId, renameValue, onRenameTab])

  const handleRenameKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') handleRenameConfirm()
    if (e.key === 'Escape') {
      setRenamingId(null)
      setRenameValue('')
    }
  }, [handleRenameConfirm])

  const handleDuplicate = useCallback(() => {
    if (menuTarget) onDuplicateTab(menuTarget)
    setMenuPos(null)
    setMenuTarget(null)
  }, [menuTarget, onDuplicateTab])

  const handleRemoveConfirm = useCallback(() => {
    if (confirmRemove) {
      onRemoveTab(confirmRemove)
      setConfirmRemove(null)
    }
  }, [confirmRemove, onRemoveTab])

  const handleSubscribe = useCallback(() => {
    onSubscribe()
    setConfirmSubscribe(false)
    setShowNewMenu(false)
  }, [onSubscribe])

  return (
    <>
      {collapsed ? (
        <div className="w-9 border-l border-surface-700 bg-surface-800 flex flex-col items-center py-2 shrink-0">
          <button
            onClick={onToggleCollapse}
            className="text-surface-400 hover:text-surface-200 text-sm p-1"
            title="Mostrar disparadores"
          >
            &#9654;
          </button>
        </div>
      ) : (
        <div className="border-l border-surface-700 bg-surface-800 flex flex-col shrink-0 h-full">
          <div className="flex items-center justify-between px-3 py-2 border-b border-surface-700">
            <span className="text-xs font-semibold text-surface-400 uppercase tracking-wide">
              Disparadores
            </span>
            <button
              onClick={onToggleCollapse}
              className="text-surface-400 hover:text-surface-200 text-sm"
              title="Recolher"
            >
              &#9664;
            </button>
          </div>

          <div className="px-3 py-2 border-b border-surface-700">
            <div className="relative">
              <button
                onClick={() => setShowNewMenu(!showNewMenu)}
                className="w-full px-2 py-1 text-xs bg-primary-600 hover:bg-primary-500 rounded transition-colors text-center"
              >
                + Novo
              </button>
              {showNewMenu && (
                <div className="absolute top-full left-0 right-0 mt-1 bg-surface-700 border border-surface-600 rounded shadow-lg z-50">
                  <button
                    onClick={() => { setShowNewMenu(false); onNewTab() }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-600 text-surface-200 transition-colors"
                  >
                    Nova aba
                  </button>
                  <button
                    onClick={() => { setShowNewMenu(false); setConfirmSubscribe(true) }}
                    className="w-full text-left px-3 py-1.5 text-xs hover:bg-surface-600 text-surface-200 transition-colors"
                  >
                    Subscrever atual
                  </button>
                </div>
              )}
            </div>
          </div>

          {confirmSubscribe && (
            <div className="px-3 py-2 border-b border-surface-700 text-xs space-y-1">
              <p className="text-surface-300">Tem certeza? Essa ação irá excluir o disparo atual.</p>
              <div className="flex gap-2">
                <button onClick={handleSubscribe} className="text-red-400 hover:text-red-300 font-semibold">Confirmar</button>
                <button onClick={() => setConfirmSubscribe(false)} className="text-surface-400 hover:text-surface-200">Cancelar</button>
              </div>
            </div>
          )}

          {confirmRemove && (
            <div className="px-3 py-2 border-b border-surface-700 text-xs space-y-1">
              <p className="text-surface-300">Tem certeza que deseja excluir este disparador?</p>
              <div className="flex gap-2">
                <button onClick={handleRemoveConfirm} className="text-red-400 hover:text-red-300 font-semibold">Confirmar</button>
                <button onClick={() => setConfirmRemove(null)} className="text-surface-400 hover:text-surface-200">Cancelar</button>
              </div>
            </div>
          )}

          <div className="flex-1 overflow-y-auto">
            {tabs.map((tab) => (
              <div
                key={tab.id}
                onClick={() => {
                  if (renamingId !== tab.id) onSelectTab(tab.id)
                }}
                onContextMenu={(e) => handleContextMenu(e, tab.id)}
                className={`px-3 py-2 text-sm cursor-pointer border-b border-surface-700/50 transition-colors ${
                  tab.id === activeTabId
                    ? 'bg-primary-900/30 text-primary-300 border-l-2 border-l-primary-500'
                    : 'text-surface-300 hover:bg-surface-700/50'
                }`}
              >
                <div className="flex items-center justify-between">
                  {renamingId === tab.id ? (
                    <input
                      ref={renameInputRef}
                      value={renameValue}
                      onChange={(e) => setRenameValue(e.target.value.slice(0, 50))}
                      onBlur={handleRenameConfirm}
                      onKeyDown={handleRenameKeyDown}
                      maxLength={50}
                      className="flex-1 px-1 py-0.5 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500 text-surface-200"
                    />
                  ) : (
                    <span className="truncate">{tab.label}</span>
                  )}
                  {tab.disparando && <span className="text-green-400 text-xs ml-1 blink">&#9679;</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {menuPos && menuTarget && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', left: menuPos.x, top: menuPos.y, zIndex: 9999 }}
          className="bg-surface-700 border border-surface-600 rounded shadow-lg py-1 text-sm min-w-40"
        >
          <button
            onClick={handleStartRename}
            className="w-full text-left px-3 py-1.5 hover:bg-surface-600 text-surface-200 transition-colors"
          >
            Editar nome
          </button>
          <button
            onClick={handleDuplicate}
            className="w-full text-left px-3 py-1.5 hover:bg-surface-600 text-surface-200 transition-colors"
          >
            Duplicar disparador
          </button>
          <button
            onClick={() => { setConfirmRemove(menuTarget); setMenuPos(null); setMenuTarget(null) }}
            className="w-full text-left px-3 py-1.5 hover:bg-surface-600 text-red-400 transition-colors"
          >
            Excluir disparador
          </button>
        </div>
      )}
    </>
  )
}
