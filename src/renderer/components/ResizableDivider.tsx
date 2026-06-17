import React, { useCallback, useRef } from 'react'

interface Props {
  direction: 'vertical' | 'horizontal'
  onResizeStart: () => void
  onResize: (delta: number) => void
}

export default function ResizableDivider({ direction, onResizeStart, onResize }: Props): React.ReactElement {
  const startPos = useRef(0)

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    startPos.current = direction === 'vertical' ? e.clientX : e.clientY
    onResizeStart()

    const cursor = direction === 'vertical' ? 'col-resize' : 'row-resize'
    document.body.style.cursor = cursor
    document.body.style.userSelect = 'none'

    const handleMouseMove = (e: MouseEvent): void => {
      const currentPos = direction === 'vertical' ? e.clientX : e.clientY
      onResize(currentPos - startPos.current)
    }

    const handleMouseUp = (): void => {
      document.removeEventListener('mousemove', handleMouseMove)
      document.removeEventListener('mouseup', handleMouseUp)
      document.body.style.cursor = ''
      document.body.style.userSelect = ''
    }

    document.addEventListener('mousemove', handleMouseMove)
    document.addEventListener('mouseup', handleMouseUp)
  }, [direction, onResizeStart, onResize])

  return (
    <div
      onMouseDown={handleMouseDown}
      className={`shrink-0 bg-surface-700 hover:bg-primary-600/50 transition-colors ${
        direction === 'vertical' ? 'w-1.5 cursor-col-resize' : 'h-1.5 cursor-row-resize'
      }`}
    />
  )
}
