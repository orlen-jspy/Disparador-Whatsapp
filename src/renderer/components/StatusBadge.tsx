import React from 'react'
import type { ConnectionStatus } from '../../types'

const STATUS_CONFIG: Record<ConnectionStatus, { label: string; color: string; dot: string }> = {
  'buscando-qr': {
    label: 'Buscando QR Code',
    color: 'text-yellow-400',
    dot: 'bg-yellow-400 animate-pulse'
  },
  autenticado: {
    label: 'Autenticado',
    color: 'text-green-400',
    dot: 'bg-green-400'
  },
  desconectado: {
    label: 'Desconectado',
    color: 'text-red-400',
    dot: 'bg-red-400'
  }
}

interface Props {
  status: ConnectionStatus
}

export default function StatusBadge({ status }: Props): React.ReactElement {
  const cfg = STATUS_CONFIG[status]
  return (
    <div className={`flex items-center gap-2 text-sm ${cfg.color}`}>
      <span className={`w-2 h-2 rounded-full ${cfg.dot}`} />
      <span>{cfg.label}</span>
    </div>
  )
}
