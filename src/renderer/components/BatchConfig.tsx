import React from 'react'

interface Props {
  lote: number
  tempoEntreLotes: number
  onChangeLote: (value: number) => void
  onChangeTempoEntreLotes: (value: number) => void
  disparando: boolean
}

export default function BatchConfig({
  lote,
  tempoEntreLotes,
  onChangeLote,
  onChangeTempoEntreLotes,
  disparando
}: Props): React.ReactElement {
  const handleLoteChange = (value: number) => {
    const clamped = Math.max(1, value)
    onChangeLote(clamped)
  }

  const handleTempoEntreLotesChange = (value: number) => {
    const clamped = Math.max(60, value)
    onChangeTempoEntreLotes(clamped)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-2">
        Configuração de Lotes
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-surface-400">Quantidade de Lotes</label>
          <input
            type="number"
            min={1}
            value={lote}
            onChange={(e) => handleLoteChange(Number(e.target.value))}
            disabled={disparando}
            className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-xs text-surface-400">Pausa entre Lotes (segundos)</label>
          <input
            type="number"
            min={60}
            value={tempoEntreLotes}
            onChange={(e) => handleTempoEntreLotesChange(Number(e.target.value))}
            disabled={disparando}
            className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-1">
        Divide {lote > 1 ? `os contatos em ${lote} lotes` : 'tudo em um lote único'}. Pausa de {tempoEntreLotes}s entre lotes.
      </p>
    </div>
  )
}
