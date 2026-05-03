import { createContext, useContext, useState, useCallback, type ReactNode } from 'react'
import { clearCache, type DataSource } from '../api/dataSource'

const SOURCE_STORAGE_KEY = 'hevylog:data-source'

interface DataVersionContextValue {
  source: DataSource
  setSource: (source: DataSource) => void
  version: number
  refresh: () => void
}

const DataVersionContext = createContext<DataVersionContextValue>({
  source: 'hevy',
  setSource: () => {},
  version: 0,
  refresh: () => {},
})

function getInitialSource(): DataSource {
  const stored = localStorage.getItem(SOURCE_STORAGE_KEY)
  return stored === 'liftosaur' ? 'liftosaur' : 'hevy'
}

export function DataVersionProvider({ children }: { children: ReactNode }) {
  const [source, setSourceState] = useState<DataSource>(getInitialSource)
  const [version, setVersion] = useState(0)

  const setSource = useCallback((next: DataSource) => {
    localStorage.setItem(SOURCE_STORAGE_KEY, next)
    setSourceState(next)
    setVersion((v) => v + 1)
  }, [])

  const refresh = useCallback(() => {
    clearCache(source)
    setVersion((v) => v + 1)
  }, [source])

  return (
    <DataVersionContext.Provider value={{ source, setSource, version, refresh }}>
      {children}
    </DataVersionContext.Provider>
  )
}

// eslint-disable-next-line react-refresh/only-export-components
export const useDataVersion = () => useContext(DataVersionContext)
