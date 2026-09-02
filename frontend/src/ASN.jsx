import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  TextField,
  Typography,
} from '@mui/material'
import { Search } from '@mui/icons-material'
import Info from './Info.jsx'

const glassCard = (t) => ({
  backgroundColor: t.palette.mode === 'dark' ? 'rgba(0,0,0,0.55)' : 'rgba(255,255,255,0.78)',
  backdropFilter: 'blur(4px)',
})

export default function ASN({ asninfo }) {
  const [asnInput, setAsnInput] = useState(asninfo?.name ? '' : '')
  const [asnInfo, setAsnInfo] = useState(asninfo || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)

  // Keep local display in sync with the shared variable.
  useEffect(() => {
    if (asninfo) setAsnInfo(asninfo)
  }, [asninfo])

  // Manual search: fetches fresh but does NOT overwrite the shared variable.
  const lookup = async (raw) => {
    const id = String(raw).trim()
    if (!id) return
    setLoading(true)
    setError(null)
    setAsnInfo(null)
    try {
      const res = await fetch(`/api/asn/${encodeURIComponent(id)}`)
      const data = await res.json()
      if (!data?.status) throw new Error(data?.error || 'ASN not found')
      setAsnInfo(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0 }}>
      {/* Input + fetch button */}
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 2 }}>
        <TextField
          size="small"
          sx={{ width: '70%' }}
          label="ASN Number"
          placeholder="e.g. 13335"
          value={asnInput}
          onChange={(e) => setAsnInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && lookup(asnInput)}
        />
        <Button
          variant="contained"
          startIcon={<Search />}
          onClick={() => lookup(asnInput)}
          disabled={loading}
        >
          Fetch info
        </Button>
      </Box>

      {error && <Typography color="error" sx={{ mb: 2 }}>Error: {error}</Typography>}

      <Box sx={{ flexGrow: 1, minHeight: 0, overflow: 'auto' }}>
        {loading && !asnInfo ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
            <CircularProgress />
          </Box>
        ) : asnInfo ? (
          <Card sx={{ ...glassCard, '& .MuiTypography-root': { fontSize: '1.1em' } }}>
            <CardContent sx={{ position: 'relative' }}>
              {/* Header: name (logo floats top-right) */}
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 1 }}>
                <Typography variant="h2">{asnInfo.name}</Typography>
              </Box>

              {/* Logo pinned to top-right corner of the card */}
              {asnInfo.website && (
                <img
                  src={`https://api.tridentlab.in/assets/img/asn/${asnInfo.website}.svg`}
                  alt={asnInfo.website}
                  width="100"
                  height="100"
                  style={{
                    position: 'absolute',
                    top: 12,
                    right: 12,
                  }}
                  loading="lazy"
                  onError={(e) => (e.currentTarget.style.display = 'none')}
                />
              )}

              {/* Basic info */}
              <Grid container spacing={3} sx={{ mt: 1 }}>
                <Grid item xs={12} md={6}>
                  <Info
                    rows={[
                      { label: 'Country', value: asnInfo.country },
                      { label: 'Country Code', value: asnInfo.country_code },
                      { label: 'Website', value: asnInfo.website },
                    ]}
                  />
                </Grid>
                <Grid item xs={12} md={6}>
                  <Info
                    rows={[
                      { label: 'Registered', value: asnInfo.dates?.registered },
                      { label: 'Updated', value: asnInfo.dates?.updated },
                    ]}
                  />
                </Grid>
              </Grid>

              {/* Contacts */}
              {asnInfo.contacts && (
                <Box sx={{ mt: 3 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Contacts
                  </Typography>
                  <Grid container spacing={2}>
                    {Object.entries(asnInfo.contacts).map(([type, list]) =>
                      list.length > 0 ? (
                        <Grid item xs={12} md={6} key={type}>
                          <Typography
                            variant="caption"
                            color="text.secondary"
                            sx={{ textTransform: 'capitalize' }}
                          >
                            {type}
                          </Typography>
                          {list.map((c, i) => (
                            <Box
                              key={i}
                              sx={{
                                ml: 1,
                                mb: 1,
                                p: 1.5,
                                border: '1px solid',
                                borderColor: 'divider',
                                borderRadius: 2,
                              }}
                            >
                              <Typography variant="body2">{c.name}</Typography>
                              {c.email && (
                                <Typography
                                  component="div"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', mt: 0.5 }}
                                >
                                  {c.email}
                                </Typography>
                              )}
                              {c.phone && (
                                <Typography
                                  component="div"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', mt: 0.5 }}
                                >
                                  {c.phone}
                                </Typography>
                              )}
                              {c.address && (
                                <Typography
                                  component="div"
                                  variant="caption"
                                  color="text.secondary"
                                  sx={{ display: 'block', mt: 0.5 }}
                                >
                                  {c.address}
                                </Typography>
                              )}
                            </Box>
                          ))}
                        </Grid>
                      ) : null,
                    )}
                  </Grid>
                </Box>
              )}
            </CardContent>
          </Card>
        ) : (
          !loading && (
            <Typography color="text.secondary">
              Enter an ASN number above (e.g. 13335) and click Fetch info.
            </Typography>
          )
        )}
      </Box>
    </Box>
  )
}
