import { useEffect, useState } from 'react'
import {
  AppBar,
  Box,
  Drawer,
  IconButton,
  List,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Toolbar,
  Tooltip,
  Typography,
} from '@mui/material'
import {
  Hub,
  Language,
  Dns,
  Search,
  Lan,
  LightMode,
  DarkMode,
} from '@mui/icons-material'
import { useThemeMode } from './main.jsx'
import versionText from './version.txt?raw'
import Network from './Network.jsx'
import IpInfo from './IpInfo.jsx'
import ASN from './ASN.jsx'
import DNS from './DNS.jsx'
import Whois from './Whois.jsx'

const VERSION = versionText.trim()
const DRAWER_WIDTH = 180

const MENU = [
  { id: 'network', label: 'Network', icon: <Lan /> },
  { id: 'ipinfo', label: 'IpInfo', icon: <Hub /> },
  { id: 'asn', label: 'ASN', icon: <Language /> },
  { id: 'dns', label: 'DNS', icon: <Dns /> },
  { id: 'whois', label: 'Whois', icon: <Search /> },
]

export default function App() {
  const [active, setActive] = useState('network')
  const { mode, toggleMode } = useThemeMode()

  // Fetched once on first load and shared across tabs. IpInfo loads from
  // these instead of re-fetching when you switch to it. Manual searches in
  // IpInfo never overwrite these.
  const [ipinfo, setIpinfo] = useState(null)
  const [asninfo, setAsninfo] = useState(null)

  useEffect(() => {
    fetch('/api/ipinfo')
      .then((r) => r.json())
      .then((d) => {
        const ip4 = d?.ipv4?.ip || d?.ipv6?.ip
        if (!ip4) return
        return fetch(`/api/ipinfo/${encodeURIComponent(ip4)}`)
          .then((r) => r.json())
          .then((ip) => {
            setIpinfo(ip)
            if (ip?.asn?.id) {
              return fetch(`/api/asn/${ip.asn.id}`).then((r) => r.json()).then(setAsninfo)
            }
          })
      })
      .catch(() => {})
  }, [])

  const title = MENU.find((m) => m.id === active)?.label ?? 'Net Kit'

  // Background image. All tabs share the tiled network background so the
  // glass effect holds everywhere.
  const bg = 'url(/network-bg.webp)'
  const bgSize = 'auto'
  const bgRepeat = 'repeat'
  const bgFilter = mode === 'dark' ? 'invert(1)' : 'none'

  return (
    <Box
      sx={{
        display: 'flex',
        height: '100vh',
        position: 'relative',
        '&::before': {
          content: '""',
          position: 'absolute',
          inset: 0,
          backgroundImage: bg,
          backgroundSize: bgSize,
          backgroundRepeat: bgRepeat,
          backgroundPosition: 'center',
          filter: bgFilter,
          zIndex: 0,
        },
      }}
    >
      {/* Sidebar */}
      <Drawer
        variant="permanent"
        sx={{
          width: DRAWER_WIDTH,
          flexShrink: 0,
          zIndex: 1,
          '& .MuiDrawer-paper': {
            width: DRAWER_WIDTH,
            boxSizing: 'border-box',
            display: 'flex',
            flexDirection: 'column',
            backgroundColor: 'rgba(255,255,255,0.06)',
            backdropFilter: 'blur(8px)',
            borderRight: 'none',
          },
        }}
      >
        <Toolbar>
          <Typography variant="h6" fontWeight={700}>
            Net Kit
          </Typography>
        </Toolbar>

        <List sx={{ flexGrow: 1, px: 1 }}>
          {MENU.map((item) => (
            <ListItemButton
              key={item.id}
              selected={active === item.id}
              onClick={() => setActive(item.id)}
              sx={{ borderRadius: 2, mb: 0.5 }}
            >
              <ListItemIcon>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          ))}
        </List>

        {/* Version pinned to bottom */}
        <Box sx={{ p: 2, borderTop: (t) => `1px solid ${t.palette.divider}` }}>
          <Typography variant="caption" color="text.secondary">
            v{VERSION}
          </Typography>
        </Box>
      </Drawer>

      {/* Main area */}
      <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
        <AppBar
          position="static"
          elevation={0}
          sx={{
            backgroundColor: mode === 'dark' ? 'rgba(0,0,0,0.4)' : 'rgba(255,255,255,0.6)',
            backdropFilter: 'blur(3px)',
          }}
        >
          <Toolbar>
            <Typography variant="h6" sx={{ flexGrow: 1, color: mode === 'dark' ? '#fff' : '#000' }}>
              {title}
            </Typography>
            <Tooltip title={`Switch to ${mode === 'dark' ? 'light' : 'dark'} mode`}>
              <IconButton onClick={toggleMode} sx={{ color: mode === 'dark' ? '#fff' : '#000' }}>
                {mode === 'dark' ? <LightMode /> : <DarkMode />}
              </IconButton>
            </Tooltip>
          </Toolbar>
        </AppBar>

        <Box
          component="main"
          sx={{
            flexGrow: 1,
            overflow: 'auto',
            position: 'relative',
            zIndex: 1,
          }}
        >
          <Box
            sx={{
              p: 3,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              boxSizing: 'border-box',
            }}
          >
            {active === 'network' && <Network onNavigate={setActive} />}
            {active === 'ipinfo' && <IpInfo ipinfo={ipinfo} asninfo={asninfo} />}
            {active === 'asn' && <ASN asninfo={asninfo} />}
            {active === 'dns' && <DNS />}
            {active === 'whois' && <Whois />}
          </Box>
        </Box>
      </Box>
    </Box>
  )
}
