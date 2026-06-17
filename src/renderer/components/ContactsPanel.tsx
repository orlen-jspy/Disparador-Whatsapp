import React, { useState, useCallback, useRef, useEffect } from 'react'
import type { Contact } from '../../types'

interface Props {
  disparando: boolean
  results: Record<string, 'success' | 'error'>
  contacts: Contact[]
  onContactsChange: (contacts: Contact[]) => void
}

function newId(): string {
  return crypto.randomUUID()
}

export default function ContactsPanel({ disparando, results, contacts, onContactsChange }: Props): React.ReactElement {
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')
  const [confirming, setConfirming] = useState(false)
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null)
  const [contextMenuTarget, setContextMenuTarget] = useState<Contact | null>(null)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editNome, setEditNome] = useState('')
  const [editTelefone, setEditTelefone] = useState('')
  const [dragIndex, setDragIndex] = useState<number | null>(null)
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!contextMenuPos) return
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setContextMenuPos(null)
        setContextMenuTarget(null)
      }
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [contextMenuPos])

  const handleImport = useCallback(async () => {
    const result = await window.electronAPI.importContacts()
    if (result.erros.length > 0) {
      setErro(result.erros.join('; '))
    }
    if (result.contatos.length > 0) {
      onContactsChange([...contacts, ...result.contatos])
    }
  }, [contacts, onContactsChange])

  const handleAdd = useCallback(() => {
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preencha nome e telefone')
      return
    }
    const contact: Contact = { id: newId(), nome: nome.trim(), telefone: telefone.trim() }
    onContactsChange([...contacts, contact])
    setNome('')
    setTelefone('')
    setErro('')
  }, [nome, telefone, contacts, onContactsChange])

  const handleRemove = useCallback((id: string) => {
    onContactsChange(contacts.filter((c) => c.id !== id))
  }, [contacts, onContactsChange])

  const handleRemoveSelected = useCallback(() => {
    if (selectedIds.size === 0) return
    onContactsChange(contacts.filter((c) => !selectedIds.has(c.id)))
    setSelectedIds(new Set())
  }, [contacts, selectedIds, onContactsChange])

  const handleClearAll = useCallback(() => {
    onContactsChange([])
    setConfirming(false)
  }, [onContactsChange])

  const handleContextMenu = useCallback((e: React.MouseEvent, contact: Contact) => {
    e.preventDefault()
    setContextMenuPos({ x: e.clientX, y: e.clientY })
    setContextMenuTarget(contact)
  }, [])

  const startEditing = useCallback((contact: Contact) => {
    setEditingId(contact.id)
    setEditNome(contact.nome)
    setEditTelefone(contact.telefone)
    setContextMenuPos(null)
    setContextMenuTarget(null)
  }, [])

  const cancelEditing = useCallback(() => {
    setEditingId(null)
    setEditNome('')
    setEditTelefone('')
  }, [])

  const saveEditing = useCallback((id: string) => {
    if (!editNome.trim() || !editTelefone.trim()) return
    onContactsChange(contacts.map((c) => (c.id === id ? { ...c, nome: editNome.trim(), telefone: editTelefone.trim() } : c)))
    setEditingId(null)
    setEditNome('')
    setEditTelefone('')
  }, [editNome, editTelefone, contacts, onContactsChange])

  const handleRemoveByStatus = useCallback((status: 'success' | 'error') => {
    const toRemove = contacts.filter((c) => results[c.id] === status).map((c) => c.id)
    if (toRemove.length === 0) return
    onContactsChange(contacts.filter((c) => !toRemove.includes(c.id)))
    setContextMenuPos(null)
    setContextMenuTarget(null)
  }, [contacts, results, onContactsChange])

  const handleDragStart = useCallback((e: React.DragEvent, index: number) => {
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', String(index))
    setDragIndex(index)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const handleDrop = useCallback((e: React.DragEvent, dropIndex: number) => {
    e.preventDefault()
    const fromIndex = Number(e.dataTransfer.getData('text/plain'))
    if (isNaN(fromIndex) || fromIndex === dropIndex) {
      setDragIndex(null)
      return
    }
    const reordered = [...contacts]
    const [moved] = reordered.splice(fromIndex, 1)
    reordered.splice(dropIndex, 0, moved)
    onContactsChange(reordered)
    setDragIndex(null)
  }, [contacts, onContactsChange])

  const handleDragEnd = useCallback(() => {
    setDragIndex(null)
  }, [])

  const handleRowClick = useCallback((e: React.MouseEvent, id: string) => {
    if (e.ctrlKey || e.metaKey) {
      setSelectedIds(prev => {
        const next = new Set(prev)
        if (next.has(id)) next.delete(id)
        else next.add(id)
        return next
      })
    } else {
      setSelectedIds(new Set())
    }
  }, [])

  const contextStatus = contextMenuTarget ? results[contextMenuTarget.id] : null

  return (
    <div className="flex flex-col h-full">
      <div className="p-3 border-b border-surface-700 space-y-2">
        <h2 className="text-sm font-semibold text-surface-200 uppercase tracking-wide">
          Contatos
          <span className="ml-2 text-primary-400 font-normal">({contacts.length})</span>
        </h2>

        <button
          onClick={handleImport}
          disabled={disparando}
          className="w-full px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-600 text-white rounded transition-colors"
        >
          Importar XLSX / CSV
        </button>

        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={disparando}
          className="w-full px-3 py-1.5 text-sm bg-surface-800 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
        />
        <input
          placeholder="Telefone (com DDD)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          disabled={disparando}
          className="w-full px-3 py-1.5 text-sm bg-surface-800 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={handleAdd}
          disabled={disparando}
          className="w-full px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:bg-surface-700 disabled:text-surface-600 rounded transition-colors"
        >
          Adicionar
        </button>

        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>

      <div className="flex-1 overflow-y-auto relative">
        {contacts.length === 0 ? (
          <p className="text-sm text-surface-400 text-center py-8">
            Nenhum contato. Importe uma planilha ou adicione manualmente.
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="text-surface-400 text-xs uppercase">
                <th className="w-6 px-1 py-2" />
                <th className="text-left px-3 py-2 font-medium">Nome</th>
                <th className="text-left px-3 py-2 font-medium">Telefone</th>
                <th className="px-2 py-2 w-8" />
              </tr>
            </thead>
            <tbody>
              {contacts.map((c, idx) => {
                const result = results[c.id]
                const isEditing = editingId === c.id
                const isDragging = dragIndex === idx
                const isSelected = selectedIds.has(c.id)
                return (
                  <tr
                    key={c.id}
                    draggable={!disparando}
                    onClick={(e) => handleRowClick(e, c.id)}
                    onContextMenu={(e) => handleContextMenu(e, c)}
                    onDragStart={(e) => handleDragStart(e, idx)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, idx)}
                    onDragEnd={handleDragEnd}
                    className={`border-t border-surface-700 transition-colors cursor-default ${
                      isSelected
                        ? 'bg-primary-900/40'
                        : 'hover:bg-surface-700/50'
                    } ${isDragging ? 'opacity-50' : ''}`}
                  >
                    <td className="px-1 py-2 text-center text-xs">
                      {result === 'success' ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : result === 'error' ? (
                        <span className="text-red-400">&#9888;</span>
                      ) : null}
                    </td>
                    {isEditing ? (
                      <>
                        <td className="px-1 py-1">
                          <input
                            value={editNome}
                            onChange={(e) => setEditNome(e.target.value)}
                            className="w-full px-1 py-0.5 text-sm bg-surface-800 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <input
                            value={editTelefone}
                            onChange={(e) => setEditTelefone(e.target.value)}
                            className="w-full px-1 py-0.5 text-sm bg-surface-800 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
                          />
                        </td>
                        <td className="px-1 py-1">
                          <div className="flex gap-1">
                            <button
                              onClick={() => saveEditing(c.id)}
                              className="text-green-400 hover:text-green-300 text-xs"
                            >
                              S
                            </button>
                            <button
                              onClick={cancelEditing}
                              className="text-surface-400 hover:text-surface-200 text-xs"
                            >
                              X
                            </button>
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="px-3 py-2 truncate max-w-32">{c.nome}</td>
                        <td className="px-3 py-2 text-surface-400">{c.telefone}</td>
                        <td className="px-2 py-2">
                          <button
                            onClick={(e) => { e.stopPropagation(); handleRemove(c.id) }}
                            disabled={disparando}
                            className="text-red-400 hover:text-red-300 text-xs"
                          >
                            &#10005;
                          </button>
                        </td>
                      </>
                    )}
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}

        {contextMenuPos && contextMenuTarget && (
          <div
            ref={menuRef}
            style={{ position: 'fixed', left: contextMenuPos.x, top: contextMenuPos.y, zIndex: 9999 }}
            className="bg-surface-700 border border-surface-600 rounded shadow-lg py-1 text-sm min-w-40"
          >
            <button
              onClick={() => startEditing(contextMenuTarget)}
              className="w-full text-left px-3 py-1.5 hover:bg-surface-600 text-surface-200 transition-colors"
            >
              Editar contato
            </button>
            {contextStatus && (
              <button
                onClick={() => handleRemoveByStatus(contextStatus)}
                className="w-full text-left px-3 py-1.5 hover:bg-surface-600 text-surface-200 transition-colors"
              >
                Remover todos com este status
              </button>
            )}
          </div>
        )}
      </div>

      {selectedIds.size > 0 && (
        <div className="px-3 py-2 border-t border-b border-surface-700 bg-surface-800 flex items-center justify-between text-xs">
          <span className="text-surface-400">{selectedIds.size} selecionado(s)</span>
          <button
            onClick={handleRemoveSelected}
            className="text-red-400 hover:text-red-300 transition-colors"
          >
            Remover selecionados
          </button>
        </div>
      )}

      {contacts.length > 0 && (
        <div className="px-3 py-2 border-t border-surface-700 bg-surface-800 flex items-center justify-between text-xs">
          <span className="text-surface-400">
            Total: <span className="text-surface-200 font-medium">{contacts.length}</span> contato(s)
          </span>
          {confirming ? (
            <div className="space-x-2">
              <span className="text-surface-300">Apagar todos?</span>
              <button
                onClick={handleClearAll}
                className="text-red-400 hover:text-red-300 transition-colors font-semibold"
              >
                Confirmar
              </button>
              <button
                onClick={() => setConfirming(false)}
                className="text-surface-400 hover:text-surface-200 transition-colors"
              >
                Cancelar
              </button>
            </div>
          ) : (
            <div className="space-x-2">
              <button
                onClick={() => setConfirming(true)}
                disabled={disparando}
                className="text-red-400 hover:text-red-300 transition-colors"
              >
                Limpar lista
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
