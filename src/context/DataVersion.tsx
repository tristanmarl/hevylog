import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clearCache } from '../api/hevy'

interface DataVersionContextValue {
  version: number
  refresh: () => void
}

const DataVersionContext = createContext<DataVersionContextValue>({ version: 0, refresh: () => {} })

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [version, setVersion] = useState(0)
  const refresh = useCallback(() => {
    clearCache()
    setVersion((v) => v + 1)
  }, [])
  return (
    <DataVersionContext.Provider value={{ version, refresh }}>
      {children}
    </DataVersionContext.Provider>
  )
}

export const useDataVersion = () => useContext(DataVersionContext)
