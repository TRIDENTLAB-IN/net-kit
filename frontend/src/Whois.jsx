import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Chip,
  TextField,
  Typography,
} from '@mui/material'
import { Search, VerifiedUser } from '@mui/icons-material'
import Info from './Info.jsx'
import { sanitizeDomain } from './domain.js'

const glassCard = (t) => ({
  backgroundColor: t.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(4px)',
})

const fmtDate = (raw) => {
  if (!raw) return null
  const d = new Date(raw)
  return isNaN(d) ? raw : d.toUTCString()
}

const daysBetween = (from, to) => {
  const a = new Date(from)
  const b = new Date(to)
  if (isNaN(a) || isNaN(b)) return null
  return Math.floor((b - a) / 86400000)
}

const yearsBetween = (from, to) => {
  const a = new Date(from)
  const b = new Date(to)
  if (isNaN(a) || isNaN(b)) return null
  const years = (b - a) / (365.25 * 24 * 60 * 60 * 1000)
  return Math.floor(years)
}

export default function Whois() {
  const [input, setInput] = useState('google.com')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  const lookup = async (raw) => {
    const domain = sanitizeDomain(raw)
    if (!domain) return
    setLoading(true)
    setError(null)
    setData(null)
    try {
      const res = await fetch(`/api/whois/${encodeURIComponent(domain)}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    lookup('google.com')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Input + fetch button */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          sx={{ width: '70%' }}
          label="Domain"
          placeholder="e.g. google.com"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup(input)}
        />
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={() => lookup(input)}
          disabled={loading}
        >
          Fetch info
        </Button>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
        {loading && !data ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : data?.status ? (
          <Card sx={{ ...glassCard, '& .MuiTypography-root': { fontSize: '1.1em' } }}>
            <CardContent>
              {/* Domain header + DNSSEC badge */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 2 }}>
                <Typography variant="h4">{data.domain}</Typography>
                {data.dnssec !== undefined && (
                  <Chip
                    icon={<VerifiedUser />}
                    label={data.dnssec ? 'DNSSEC' : 'No DNSSEC'}
                    color={data.dnssec ? 'success' : 'default'}
                    size="small"
                  />
                )}
              </Box>

              {/* Domain age & days remaining */}
              {data.creation_date && (
                <Box sx={{ display: 'flex', gap: 2, mb: 2, flexWrap: 'wrap' }}>
                  <StatBlock
                    label="Domain Age"
                    value={yearsBetween(data.creation_date, new Date().toISOString())}
                    unit="years"
                  />
                  {data.expiration_date && (
                    <StatBlock
                      label="Days Remaining"
                      value={daysBetween(new Date().toISOString(), data.expiration_date)}
                      unit="days"
                    />
                  )}
                </Box>
              )}

              {/* Main info */}
              <GridRows
                rows={[
                  { label: 'Registrar', value: data.registrar },
                  { label: 'Registrar URL', value: data.registrar_url },
                  { label: 'Whois Server', value: data.whois_server },
                  { label: 'Org', value: data.org },
                  { label: 'Created', value: fmtDate(data.creation_date) },
                  { label: 'Updated', value: fmtDate(data.updated_date) },
                  { label: 'Expires', value: fmtDate(data.expiration_date) },
                ]}
              />

              {/* Name servers */}
              {data.ns?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Name Servers ({data.ns.length})
                  </Typography>
                  {data.ns.map((ns, i) => (
                    <Typography key={i} variant="body2" sx={{ ml: 1 }}>
                      {ns}
                    </Typography>
                  ))}
                </Box>
              )}

              {/* Emails */}
              {data.emails?.length > 0 && (
                <Box sx={{ mt: 2 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Emails ({data.emails.length})
                  </Typography>
                  {data.emails.map((email, i) => (
                    <Typography key={i} variant="body2" sx={{ color: 'text.secondary', ml: 1 }}>
                      {email}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Typography color="text.secondary">Enter a domain to look up WHOIS info.</Typography>
          )
        )}
      </Box>
    </Box>
  )
}

function GridRows({ rows }) {
  return (
    <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 1 }}>
      {rows.map((r) =>
        r.value ? (
          <Box key={r.label} sx={{ display: 'flex', flexDirection: 'column' }}>
            <Typography variant="caption" color="text.secondary">
              {r.label}
            </Typography>
            <Typography variant="body2" sx={{ wordBreak: 'break-all' }}>
              {r.value}
            </Typography>
          </Box>
        ) : null,
      )}
    </Box>
  )
}

function StatBlock({ label, value, unit }) {
  return (
    <Box
      sx={{
        flex: '1 1 180px',
        p: 1.5,
        borderRadius: 2,
        border: '1px solid',
        borderColor: 'divider',
        bgcolor: (t) =>
          t.palette.mode === 'dark' ? 'rgba(0,0,0,0.3)' : 'rgba(255,255,255,0.5)',
      }}
    >
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="h5" sx={{ fontWeight: 700 }}>
        {value !== null ? value : '—'}
        {value !== null && (
          <Typography component="span" variant="body2" color="text.secondary" sx={{ ml: 0.5 }}>
            {unit}
          </Typography>
        )}
      </Typography>
    </Box>
  )
}
