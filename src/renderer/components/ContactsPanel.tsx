import React, { useEffect, useState, useCallback } from 'react'
import type { Contact } from '../../types'

interface Props {
  disparando: boolean
  results: Record<string, 'success' | 'error'>
}

export default function ContactsPanel({ disparando, results }: Props): React.ReactElement {
  const [contacts, setContacts] = useState<Contact[]>([])
  const [nome, setNome] = useState('')
  const [telefone, setTelefone] = useState('')
  const [erro, setErro] = useState('')

  useEffect(() => {
    window.electronAPI.getContacts().then(setContacts)
  }, [])

  const handleImport = useCallback(async () => {
    const result = await window.electronAPI.importContacts()
    if (result.erros.length > 0) {
      setErro(result.erros.join('; '))
    }
    if (result.contatos.length > 0) {
      setContacts((prev) => [...prev, ...result.contatos])
    }
  }, [])

  const handleAdd = useCallback(async () => {
    if (!nome.trim() || !telefone.trim()) {
      setErro('Preencha nome e telefone')
      return
    }
    const contact = await window.electronAPI.addContact({ nome: nome.trim(), telefone: telefone.trim() })
    setContacts((prev) => [...prev, contact])
    setNome('')
    setTelefone('')
    setErro('')
  }, [nome, telefone])

  const handleRemove = useCallback(async (id: string) => {
    await window.electronAPI.removeContact(id)
    setContacts((prev) => prev.filter((c) => c.id !== id))
  }, [])

  const refresh = useCallback(async () => {
    const list = await window.electronAPI.getContacts()
    setContacts(list)
  }, [])

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
          className="w-full px-3 py-1.5 text-sm bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-400 rounded transition-colors"
        >
          Importar XLSX / CSV
        </button>

        <input
          placeholder="Nome"
          value={nome}
          onChange={(e) => setNome(e.target.value)}
          disabled={disparando}
          className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
        />
        <input
          placeholder="Telefone (com DDD)"
          value={telefone}
          onChange={(e) => setTelefone(e.target.value)}
          disabled={disparando}
          className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
        />
        <button
          onClick={handleAdd}
          disabled={disparando}
          className="w-full px-3 py-1.5 text-sm bg-surface-600 hover:bg-surface-500 disabled:bg-surface-700 disabled:text-surface-400 rounded transition-colors"
        >
          Adicionar
        </button>

        {erro && <p className="text-xs text-red-400">{erro}</p>}
      </div>

      <div className="flex-1 overflow-y-auto">
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
              {contacts.map((c) => {
                const result = results[c.id]
                return (
                  <tr key={c.id} className="border-t border-surface-700 hover:bg-surface-700/50">
                    <td className="px-1 py-2 text-center text-xs">
                      {result === 'success' ? (
                        <span className="text-green-400">&#10003;</span>
                      ) : result === 'error' ? (
                        <span className="text-red-400">&#9888;</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-2 truncate max-w-32">{c.nome}</td>
                    <td className="px-3 py-2 text-surface-400">{c.telefone}</td>
                    <td className="px-2 py-2">
                      <button
                        onClick={() => handleRemove(c.id)}
                        disabled={disparando}
                        className="text-red-400 hover:text-red-300 text-xs"
                      >
                        &#10005;
                      </button>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>

      {contacts.length > 0 && (
        <div className="px-3 py-2 border-t border-surface-700 bg-surface-800 flex items-center justify-between text-xs">
          <span className="text-surface-400">
            Total: <span className="text-surface-200 font-medium">{contacts.length}</span> contato(s)
          </span>
          <button onClick={refresh} className="text-primary-400 hover:text-primary-300 transition-colors">
            Atualizar
          </button>
        </div>
      )}
    </div>
  )
}
