import React, { useEffect, useRef } from 'react'
import type { LogEntry } from '../../types'

interface Props {
  logs: LogEntry[]
}

const LEVEL_STYLES: Record<LogEntry['level'], string> = {
  info: 'text-blue-400',
  success: 'text-green-400',
  warning: 'text-yellow-400',
  error: 'text-red-400'
}

export default function LogConsole({ logs }: Props): React.ReactElement {
  const bottomRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [logs.length])

  return (
    <div className="h-full border-t border-surface-700 bg-surface-800 flex flex-col">
      <div className="px-4 py-1.5 text-xs font-medium text-surface-400 uppercase border-b border-surface-700">
        Console
        {logs.length > 0 && <span className="ml-2 text-surface-500">({logs.length} entradas)</span>}
      </div>
      <div className="flex-1 overflow-y-auto px-4 py-2 font-mono text-xs space-y-0.5">
        {logs.length === 0 ? (
          <p className="text-surface-500 italic">Nenhum evento registrado.</p>
        ) : (
          logs.map((entry) => (
            <div key={entry.id} className="flex gap-2">
              <span className="text-surface-500 shrink-0">{entry.timestamp}</span>
              <span className={`${LEVEL_STYLES[entry.level]} break-all`}>{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  )
}
