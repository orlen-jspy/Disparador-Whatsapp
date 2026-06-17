import React from 'react'

interface Props {
  lote: number
  recallMin: number
  recallMax: number
  onChangeLote: (value: number) => void
  onChangeRecallMin: (value: number) => void
  onChangeRecallMax: (value: number) => void
  disparando: boolean
}

export default function BatchConfig({
  lote,
  recallMin,
  recallMax,
  onChangeLote,
  onChangeRecallMin,
  onChangeRecallMax,
  disparando
}: Props): React.ReactElement {
  const handleLoteChange = (value: number) => {
    const clamped = Math.max(1, value)
    onChangeLote(clamped)
  }

  const handleRecallMinBlur = (value: number) => {
    const clamped = Math.max(300, Math.min(value, recallMax - 1))
    onChangeRecallMin(clamped)
  }

  const handleRecallMaxBlur = (value: number) => {
    const clamped = Math.max(recallMin + 1, value)
    onChangeRecallMax(clamped)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-2">
        Configuração de Lotes
      </label>
      <div className="space-y-4">
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
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="text-xs text-surface-400">Recall Mínimo (segundos)</label>
            <input
              type="number"
              min={300}
              value={recallMin}
              onChange={(e) => onChangeRecallMin(Number(e.target.value))}
              onBlur={(e) => handleRecallMinBlur(Number(e.target.value))}
              disabled={disparando}
              className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
            />
          </div>
          <div>
            <label className="text-xs text-surface-400">Recall Máximo (segundos)</label>
            <input
              type="number"
              min={recallMin + 1}
              value={recallMax}
              onChange={(e) => onChangeRecallMax(Number(e.target.value))}
              onBlur={(e) => handleRecallMaxBlur(Number(e.target.value))}
              disabled={disparando}
              className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
            />
          </div>
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-1">
        Divide {lote > 1 ? `os contatos em ${lote} lotes` : 'tudo em um lote único'}. Recall aleatório entre {recallMin}s e {recallMax}s entre lotes.
      </p>
    </div>
  )
}
