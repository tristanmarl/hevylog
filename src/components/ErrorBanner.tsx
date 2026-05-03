interface ErrorBannerProps {
  message: string
  onRetry?: () => void
}

export default function ErrorBanner({ message, onRetry }: ErrorBannerProps) {
  const isMissingKey = message.includes('VITE_HEVY_API_KEY')
  const displayMessage = isMissingKey
    ? 'Connect your Hevy API key to load workouts. Create a .env file with VITE_HEVY_API_KEY, then restart the dev server.'
    : message

  return (
    <div
      className="rounded-lg p-4 flex items-center justify-between gap-4"
      style={{ backgroundColor: 'rgba(239,68,68,0.1)', border: '1px solid rgba(239,68,68,0.3)' }}
    >
      <div className="flex items-center gap-3">
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          style={{ color: '#ef4444', flexShrink: 0 }}
        >
          <circle cx="12" cy="12" r="10" />
          <line x1="12" y1="8" x2="12" y2="12" />
          <line x1="12" y1="16" x2="12.01" y2="16" />
        </svg>
        <div>
          {isMissingKey && (
            <p className="text-sm font-semibold" style={{ color: '#fee2e2' }}>
              Setup needed
            </p>
          )}
          <p className="text-sm" style={{ color: '#fca5a5' }}>
            {displayMessage}
          </p>
        </div>
      </div>
      {onRetry && (
        <button
          onClick={onRetry}
          className="text-sm font-medium px-3 py-1.5 rounded transition-colors"
          style={{
            backgroundColor: 'rgba(239,68,68,0.2)',
            color: '#fca5a5',
            border: '1px solid rgba(239,68,68,0.4)',
          }}
        >
          Retry
        </button>
      )}
    </div>
  )
}
