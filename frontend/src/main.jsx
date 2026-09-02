import { StrictMode, createContext, useContext, useEffect, useMemo, useState } from 'react'
import { createRoot } from 'react-dom/client'
import { CssBaseline, ThemeProvider, createTheme } from '@mui/material'
import App from './App.jsx'

const ThemeModeContext = createContext()
export const useThemeMode = () => useContext(ThemeModeContext)

function Root() {
  // Default to light, as requested; flip to system theme when known.
  const [mode, setMode] = useState('light')

  useEffect(() => {
    let active = true
    fetch('/api/theme')
      .then((r) => r.json())
      .then((data) => {
        if (active && (data?.theme === 'light' || data?.theme === 'dark')) {
          setMode(data.theme)
        }
      })
      .catch(() => {}) // keep light on error
    return () => {
      active = false
    }
  }, [])

  const theme = useMemo(
    () =>
      createTheme({
        palette: {
          mode,
          primary: { main: '#2a6dff' },
        },
      }),
    [mode],
  )

  const toggleMode = () => setMode((m) => (m === 'light' ? 'dark' : 'light'))

  return (
    <ThemeModeContext.Provider value={{ mode, toggleMode }}>
      <ThemeProvider theme={theme}>
        <CssBaseline />
        <App />
      </ThemeProvider>
    </ThemeModeContext.Provider>
  )
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Root />
  </StrictMode>,
)
