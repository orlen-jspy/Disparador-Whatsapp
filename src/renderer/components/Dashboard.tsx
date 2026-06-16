import React from 'react'
import type { ConnectionStatus, DispatchProgress } from '../../types'
import StatusBadge from './StatusBadge'

interface Props {
  status: ConnectionStatus
  progress: DispatchProgress | null
}

export default function Dashboard({ status, progress }: Props): React.ReactElement {
  return (
    <div className="flex items-center gap-6">
      {progress && (
        <div className="text-sm text-surface-200">
          <span className="font-medium">{progress.enviados}</span>
          <span className="text-surface-400">/{progress.total}</span>
          {progress.erros > 0 && (
            <span className="text-red-400 ml-1">({progress.erros} erros)</span>
          )}
        </div>
      )}
      <StatusBadge status={status} />
    </div>
  )
}
