import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  TextField,
  Typography,
} from '@mui/material'
import { Public, Search } from '@mui/icons-material'
import Info from './Info.jsx'

const glassCard = (t) => ({
  backgroundColor: t.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(4px)',
})

export default function IpInfo({ ipinfo, asninfo }) {
  const [ipInput, setIpInput] = useState(ipinfo?.ip || '')
  const [info, setInfo] = useState(ipinfo || null)
  const [asnInfo, setAsnInfo] = useState(asninfo || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Keep local display in sync with the shared variables (first-load fetch
  // completes asynchronously, possibly after this component mounts).
  useEffect(() => {
    if (ipinfo) {
      setInfo(ipinfo)
      setIpInput(ipinfo.ip || ipInput)
    }
    if (asninfo) setAsnInfo(asninfo)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ipinfo, asninfo])

  // Manual search: fetches fresh but does NOT overwrite the shared ipinfo /
  // asninfo variables.
  const lookup = async (ip) => {
    if (!ip) return
    setLoading(true)
    setError(null)
    setInfo(null)
    setAsnInfo(null)
    try {
      const res = await fetch(`/api/ipinfo/${encodeURIComponent(ip)}`)
      const data = await res.json()
      setInfo(data)
      setIpInput(data?.ip || ip)
      if (data?.asn?.id) {
        const ar = await fetch(`/api/asn/${data.asn.id}`)
        setAsnInfo(await ar.json())
      }
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  const loc = info?.loc ? String(info.loc) : ''

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Top region — flex grows (60%) : col-8 IP form + col-4 ASN */}
      <Box sx={{ flex: 3, minHeight: 0, display: 'flex', gap: 2 }}>
        {/* col-8: IP input + info */}
        <Box sx={{ flex: 2, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Card sx={{ ...glassCard, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                minHeight: 0,
                gap: 2,
                '&:last-child': { pb: 2 },
              }}
            >
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <TextField
                  size="small"
                  sx={{ width: '70%' }}
                  label="IP Address"
                  value={ipInput}
                  onChange={(e) => setIpInput(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && lookup(ipInput)}
                />
                <Button
                  variant="contained"
                  startIcon={<Search />}
                  onClick={() => lookup(ipInput)}
                  disabled={loading}
                >
                  Get info
                </Button>
              </Box>

              {error && <Typography color="error">Error: {error}</Typography>}

              <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
                {loading && !info ? (
                  <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
                    <CircularProgress />
                  </Box>
                ) : info?.status ? (
                  <Info
                    rows={[
                      { label: 'IP', value: info.ip },
                      { label: 'City', value: info.city },
                      { label: 'Region', value: info.region },
                      { label: 'Country', value: info.country },
                      { label: 'Org', value: info.org },
                      { label: 'Timezone', value: info.timezone },
                    ]}
                  />
                ) : (
                  !loading && (
                    <Typography color="text.secondary">
                      No information returned for this IP.
                    </Typography>
                  )
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>

        {/* col-4: ASN info */}
        <Box sx={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
          <Card sx={{ ...glassCard, flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 0 }}>
            <CardContent
              sx={{
                display: 'flex',
                flexDirection: 'column',
                flexGrow: 1,
                minHeight: 0,
                '&:last-child': { pb: 2 },
              }}
            >
              <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Public fontSize="small" /> ASN {info?.asn?.id || '—'}
              </Typography>
              <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto', mt: 1 }}>
                {asnInfo ? (
                  <Info
                    rows={[
                      { label: 'Name', value: asnInfo.name },
                      { label: 'Org', value: info?.asn?.org || asnInfo.org },
                      { label: 'Network', value: info?.asn?.net },
                      { label: 'Country', value: asnInfo.country },
                      { label: 'Registered', value: asnInfo.dates?.registered },
                    ]}
                  />
                ) : loading ? (
                  <CircularProgress size={18} />
                ) : (
                  <Typography variant="body2" color="text.secondary">
                    No ASN for this IP.
                  </Typography>
                )}
              </Box>
            </CardContent>
          </Card>
        </Box>
      </Box>

      {/* Map — fills the remaining (bottom 40%) */}
      <Box
        sx={{
          flex: 2,
          minHeight: 0,
          mt: 2,
          display: 'flex',
          borderRadius: '10px',
          overflow: 'hidden',
        }}
      >
        {loc ? (
          <MapView lat={parseFloat(loc.split(',')[0])} lon={parseFloat(loc.split(',')[1])} />
        ) : (
          <Box
            sx={{
              p: 3,
              flexGrow: 1,
              textAlign: 'center',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
            }}
          >
            <Typography color="text.secondary">No location data available.</Typography>
          </Box>
        )}
      </Box>
    </Box>
  )
}

function MapView({ lat, lon }) {
  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - 0.02}%2C${lat - 0.02}%2C${lon + 0.02}%2C${lat + 0.02}&layer=mapnik&marker=${lat}%2C${lon}`
  return (
    <iframe
      title="Location map"
      src={src}
      style={{ width: '100%', height: '100%', border: 0, display: 'block' }}
      loading="lazy"
    />
  )
}
