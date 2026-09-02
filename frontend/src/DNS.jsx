import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  IconButton,
  TextField,
  Typography,
} from '@mui/material'
import { ExpandLess, ExpandMore, Search } from '@mui/icons-material'
import Info from './Info.jsx'
import { sanitizeDomain } from './domain.js'

const glassCard = (t) => ({
  backgroundColor: t.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(4px)',
})

const typeColor = {
  A: 'primary',
  AAAA: 'secondary',
  MX: 'success',
  TXT: 'warning',
  CNAME: 'info',
  NS: 'default',
  SOA: 'error',
  OTHER: 'default',
}

export default function DNS() {
  const [input, setInput] = useState('google.com')
  const [data, setData] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [expanded, setExpanded] = useState({})

  const fetchDNS = async (raw) => {
    const domain = sanitizeDomain(raw)
    if (!domain) return
    setLoading(true)
    setError(null)
    setData(null)
    setExpanded({})
    try {
      const res = await fetch(`/api/dns/${encodeURIComponent(domain)}`)
      const d = await res.json()
      setData(d)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDNS('google.com')
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const recordTypes = data
    ? Object.entries(data).filter(([k, v]) => Array.isArray(v) && v.length > 0)
    : []

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
          onKeyDown={(e) => e.key === 'Enter' && fetchDNS(input)}
        />
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={() => fetchDNS(input)}
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
        ) : data ? (
          recordTypes.length > 0 ? (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
              {recordTypes.map(([type, records]) => (
                <RecordGroup
                  key={type}
                  type={type}
                  records={records}
                  expanded={!!expanded[type]}
                  onToggle={() =>
                    setExpanded((prev) => ({ ...prev, [type]: !prev[type] }))
                  }
                />
              ))}
            </Box>
          ) : (
            <Typography color="text.secondary">No DNS records found.</Typography>
          )
        ) : (
          !loading && (
            <Typography color="text.secondary">Enter a domain to look up DNS records.</Typography>
          )
        )}
      </Box>
    </Box>
  )
}

function RecordGroup({ type, records, expanded, onToggle }) {
  const showAll = expanded
  const first = records[0]
  const rest = records.slice(1)
  const count = records.length

  return (
    <Card sx={glassCard}>
      <CardContent sx={{ '&:last-child': { pb: 2 } }}>
        {/* Header: type + count */}
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
          <Chip label={type} color={typeColor[type] || 'default'} size="small" variant="outlined" />
          <Typography variant="body2" color="text.secondary">
            {count} {count === 1 ? 'record' : 'records'}
          </Typography>
        </Box>

        <RecordView record={first} />

        {rest.length > 0 && (
          <>
            {showAll && rest.map((r, i) => <RecordView key={i} record={r} />)}
            <Box sx={{ display: 'flex', justifyContent: 'center', mt: 1 }}>
              <IconButton size="small" onClick={onToggle} aria-label="toggle records">
                {showAll ? <ExpandLess /> : <ExpandMore />}
                <Typography variant="caption" sx={{ ml: 0.5, color: 'text.secondary' }}>
                  {showAll ? 'Show less' : `Show ${rest.length} more`}
                </Typography>
              </IconButton>
            </Box>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function RecordView({ record }) {
  // Present common fields first, then any type-specific fields.
  const ordered = ['host', 'class', 'ttl', 'type']
  const restFields = Object.entries(record).filter(([k]) => !ordered.includes(k))
  const rows = [
    ...ordered.filter((k) => record[k] !== undefined).map((k) => ({ label: k, value: record[k] })),
    ...restFields.map(([k, v]) => ({ label: k, value: v })),
  ]
  return (
    <Box sx={{ ml: 0.5 }}>
      <Info rows={rows} />
    </Box>
  )
}
