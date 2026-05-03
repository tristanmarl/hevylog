interface SpinnerProps {
  size?: number
}

export default function Spinner({ size = 32 }: SpinnerProps) {
  return (
    <div className="flex items-center justify-center p-8">
      <svg
        width={size}
        height={size}
        viewBox="0 0 24 24"
        fill="none"
        className="animate-spin"
        style={{ color: '#e86a2e' }}
      >
        <circle
          cx="12"
          cy="12"
          r="10"
          stroke="currentColor"
          strokeWidth="3"
          strokeLinecap="round"
          strokeDasharray="31.416"
          strokeDashoffset="10"
        />
      </svg>
    </div>
  )
}

export function FullPageSpinner() {
  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <Spinner size={48} />
    </div>
  )
}
