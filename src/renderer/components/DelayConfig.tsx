import React from 'react'

interface Props {
  delayMin: number
  delayMax: number
  onChangeMin: (value: number) => void
  onChangeMax: (value: number) => void
  disparando: boolean
}

export default function DelayConfig({
  delayMin,
  delayMax,
  onChangeMin,
  onChangeMax,
  disparando
}: Props): React.ReactElement {
  const handleMinChange = (value: number) => {
    const clamped = Math.max(60, Math.min(value, delayMax - 10))
    onChangeMin(clamped)
  }

  const handleMaxChange = (value: number) => {
    const clamped = Math.max(delayMin + 10, value)
    onChangeMax(clamped)
  }

  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-2">
        Delay entre disparos (segundos)
      </label>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="text-xs text-surface-400">Mínimo (≥ 60s)</label>
          <input
            type="number"
            min={60}
            max={delayMax - 10}
            value={delayMin}
            onChange={(e) => handleMinChange(Number(e.target.value))}
            disabled={disparando}
            className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
          />
        </div>
        <div>
          <label className="text-xs text-surface-400">Máximo</label>
          <input
            type="number"
            min={delayMin + 10}
            value={delayMax}
            onChange={(e) => handleMaxChange(Number(e.target.value))}
            disabled={disparando}
            className="w-full px-2 py-1 text-sm bg-surface-700 border border-surface-600 rounded focus:outline-none focus:border-primary-500"
          />
        </div>
      </div>
      <p className="text-xs text-surface-500 mt-1">
        O delay real será calculado com distribuição normal entre {delayMin}s e {delayMax}s
      </p>
    </div>
  )
}
