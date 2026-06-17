import React from 'react'

interface Props {
  mensagem: string
  onChange: (value: string) => void
  disparando: boolean
}

export default function MessageComposer({ mensagem, onChange, disparando }: Props): React.ReactElement {
  const insertAtCursor = (text: string) => {
    onChange(mensagem + text)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1">
        Mensagem (suporta Spintax {'{opção1|opção2}'} e [NOME])
      </label>
      <div className="flex gap-1 mb-2 flex-wrap">
        <button
          onClick={() => insertAtCursor('[NOME]')}
          disabled={disparando}
          className="px-3 py-1 text-xs border border-surface-700 rounded transition-colors"
          style={{ backgroundColor: 'rgb(var(--bg-help-btn))', color: 'rgb(var(--text-help-btn))' }}
        >
          [NOME]
        </button>
        <button
          onClick={() => insertAtCursor('{opção1|opção2|opção3}')}
          disabled={disparando}
          className="px-3 py-1 text-xs border border-surface-700 rounded transition-colors"
          style={{ backgroundColor: 'rgb(var(--bg-help-btn))', color: 'rgb(var(--text-help-btn))' }}
        >
          {'{...|...}'}
        </button>
        <button
          onClick={() => insertAtCursor('{Olá|Oi {amigo|colega|parceiro}}')}
          disabled={disparando}
          className="px-3 py-1 text-xs border border-surface-700 rounded transition-colors"
          style={{ backgroundColor: 'rgb(var(--bg-help-btn))', color: 'rgb(var(--text-help-btn))' }}
        >
          Exemplo aninhado
        </button>
      </div>
      <textarea
        value={mensagem}
        onChange={(e) => onChange(e.target.value)}
        disabled={disparando}
        rows={5}
        className="w-full px-3 py-2 text-sm rounded focus:outline-none focus:border-primary-500 resize-none font-mono"
        style={{ backgroundColor: 'rgb(var(--surface-800))', color: 'rgb(var(--surface-200))', border: '1px solid rgb(var(--border-textarea))' }}
        placeholder="Digite a mensagem pronta. Use {opção1|opção2} para spintax e [NOME] para o nome do contato."
      />
    </div>
  )
}
