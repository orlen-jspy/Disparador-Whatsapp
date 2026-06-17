import React from 'react'
import type { DispatchProgress } from '../../types'

interface Props {
  disparando: boolean
  progress: DispatchProgress | null
  onStart: () => void
  onStop: () => void
  podeIniciar: boolean
}

export default function SendButton({
  disparando,
  progress,
  onStart,
  onStop,
  podeIniciar
}: Props): React.ReactElement {
  if (disparando) {
    return (
      <div className="space-y-2">
        {progress && (
          <div className="w-full bg-surface-700 rounded-full h-2 overflow-hidden">
            <div
              className="h-full bg-primary-500 transition-all duration-500 rounded-full"
              style={{ width: `${((progress.enviados + progress.erros) / progress.total) * 100}%` }}
            />
          </div>
        )}
        <button
          onClick={onStop}
          className="w-full px-4 py-2 text-sm font-medium bg-red-600 hover:bg-red-500 text-white rounded transition-colors"
        >
          Parar Disparo
        </button>
      </div>
    )
  }

  return (
    <button
      onClick={onStart}
      disabled={!podeIniciar}
      className="w-full px-4 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-500 disabled:bg-surface-700 disabled:text-surface-600 text-white rounded transition-colors"
    >
      Iniciar Disparo
    </button>
  )
}
