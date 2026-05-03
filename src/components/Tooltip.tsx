import { useState, useRef } from 'react'

interface TooltipProps {
  text: string          // plain English explanation
  children: React.ReactNode
}

export default function Tooltip({ text, children }: TooltipProps) {
  const [visible, setVisible] = useState(false)
  const ref = useRef<HTMLSpanElement>(null)

  return (
    <span
      ref={ref}
      className="relative inline-flex items-center"
      onMouseEnter={() => setVisible(true)}
      onMouseLeave={() => setVisible(false)}
    >
      {children}
      {visible && (
        <span
          className="absolute z-50 bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 text-xs rounded-lg pointer-events-none whitespace-normal"
          style={{
            backgroundColor: '#1a1a1a',
            border: '1px solid #333',
            color: '#ccc',
            width: 220,
            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
            lineHeight: '1.4',
          }}
        >
          {text}
          <span
            className="absolute left-1/2 -translate-x-1/2 top-full"
            style={{
              width: 0, height: 0,
              borderLeft: '5px solid transparent',
              borderRight: '5px solid transparent',
              borderTop: '5px solid #333',
            }}
          />
        </span>
      )}
    </span>
  )
}
