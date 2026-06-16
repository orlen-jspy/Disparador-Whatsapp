import React from 'react'

interface Props {
  imagemPath: string | null
  onSelect: () => void
  onClear: () => void
  disparando: boolean
}

export default function MediaSelector({ imagemPath, onSelect, onClear, disparando }: Props): React.ReactElement {
  return (
    <div>
      <label className="block text-sm font-medium text-surface-300 mb-1">
        Imagem (opcional - JPG/PNG)
      </label>
      <div className="flex items-center gap-3">
        <button
          onClick={onSelect}
          disabled={disparando}
          className="px-3 py-1.5 text-sm bg-surface-700 hover:bg-surface-600 disabled:opacity-40 rounded transition-colors"
        >
          {imagemPath ? 'Trocar imagem' : 'Selecionar imagem'}
        </button>
        {imagemPath && (
          <>
            <span className="text-xs text-surface-400 truncate max-w-60">{imagemPath}</span>
            <button
              onClick={() => onClear()}
              disabled={disparando}
              className="text-red-400 hover:text-red-300 text-xs"
            >
              Remover
            </button>
          </>
        )}
      </div>
    </div>
  )
}
