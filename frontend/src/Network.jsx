import { useEffect, useState } from 'react'
import {
  Box,
  Button,
  Card,
  CardContent,
  CircularProgress,
  Grid,
  Stack,
  Typography,
} from '@mui/material'
import {
  Dns,
  Public,
  Language,
  Radar,
  Router,
  DevicesOther,
  ArrowForward,
} from '@mui/icons-material'
import Info from './Info.jsx'

export default function Network({ onNavigate }) {
  const [myIP, setMyIP] = useState(null)
  const [ipInfo, setIpInfo] = useState(null)
  const [asnInfo, setAsnInfo] = useState(null)
  const [error, setError] = useState(null)
  const [scanning, setScanning] = useState(false)
  const [scanResult, setScanResult] = useState(null)

  const runScan = async () => {
    setScanning(true)
    setScanResult(null)
    try {
      const res = await fetch('/api/scan')
      const data = await res.json()
      setScanResult(data)
    } catch (e) {
      setError(e.message)
    } finally {
      setScanning(false)
    }
  }

  useEffect(() => {
    fetch('/api/myip')
      .then((r) => r.json())
      .then(setMyIP)
      .catch(() => {})
  }, [])

  useEffect(() => {
    fetch('/api/ipinfo')
      .then((r) => r.json())
      .then((data) => {
        setIpInfo(data)
        const asnId = data?.ipv4?.asn?.id || data?.ipv6?.asn?.id
        if (asnId) {
          fetch(`/api/asn/${asnId}`)
            .then((r) => r.json())
            .then(setAsnInfo)
            .catch(() => {})
        }
      })
      .catch((e) => setError(e.message))
  }, [])

  if (error) {
    return <Typography color="error">Error: {error}</Typography>
  }

  return (
    <Box sx={{ display: 'flex', gap: 3, flexWrap: 'wrap' }}>
      {/* Left card — 70% local info + network scan */}
      <Card sx={{ flex: '1 1 600px', minWidth: 300 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Dns fontSize="small" /> Local Network
          </Typography>
          {myIP ? (
            <Info rows={[
              { label: 'Hostname', value: myIP.hostname || '—' },
              { label: 'Local IP', value: myIP.ip || '—' },
            ]} />
          ) : (
            <CircularProgress size={20} />
          )}

          {/* Network scan — device discovery */}
          <Box sx={{ mt: 3 }}>
            <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 2 }}>
              <Typography variant="subtitle1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Radar fontSize="small" /> Network Scan
              </Typography>
              <Button
                size="small"
                variant="contained"
                onClick={runScan}
                disabled={scanning}
                startIcon={scanning ? <CircularProgress size={14} /> : <Radar />}
              >
                {scanning ? 'Scanning…' : 'Scan'}
              </Button>
            </Stack>

            {scanning && (
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1 }}>
                Probing {scanResult?.subnet || 'local network'} for live devices…
              </Typography>
            )}

            {scanResult && !scanning && (
              <Box>
                <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                  Scanned {scanResult.subnet} in {scanResult.elapsed_seconds?.toFixed(1)}s —{' '}
                  {scanResult.hosts.length} device(s) found
                </Typography>

                {scanResult.hosts.length === 0 ? (
                  <Typography variant="body2" color="text.secondary">
                    No devices responded. Ensure you're connected to a LAN and try again.
                  </Typography>
                ) : (
                  <Stack spacing={1}>
                    {scanResult.hosts.map((d) => (
                      <DeviceRow key={d.ip} device={d} gateway={scanResult.gateway} />
                    ))}
                  </Stack>
                )}
              </Box>
            )}
          </Box>
        </CardContent>
      </Card>

      {/* Right card — 30% public IP info */}
      <Card sx={{ flex: '1 1 300px', minWidth: 280 }}>
        <CardContent>
          <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Public fontSize="small" /> Public IP
          </Typography>
          {ipInfo ? (
            <>
              <Info rows={[
                { label: 'IPv4', value: ipInfo.ipv4?.ip },
                { label: 'IPv6', value: ipInfo.ipv6?.ip },
              ]} />
              <Info rows={[
                { label: 'City', value: ipInfo.ipv4?.city || ipInfo.ipv6?.city },
                { label: 'Region', value: ipInfo.ipv4?.region || ipInfo.ipv6?.region },
                { label: 'Country', value: ipInfo.ipv4?.country || ipInfo.ipv6?.country },
                { label: 'Org', value: ipInfo.ipv4?.org || ipInfo.ipv6?.org },
                { label: 'Timezone', value: ipInfo.ipv4?.timezone || ipInfo.ipv6?.timezone },
              ]} />
            </>
          ) : (
            <CircularProgress size={20} />
          )}
          <Button
            size="small"
            endIcon={<ArrowForward />}
            onClick={() => onNavigate?.('ipinfo')}
            sx={{ mt: 1 }}
          >
            View More
          </Button>
        </CardContent>
      </Card>

      {/* ASN card — full width */}
      {asnInfo && (
        <Card sx={{ width: '100%' }}>
          <CardContent>
            <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                <Language fontSize="small" />
                <Box>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block' }}>
                    Internet Service Provider
                  </Typography>
                  <Typography variant="h6" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    {asnInfo.name}
                    {asnInfo.website && (
                      <img
                        src={`https://api.tridentlab.in/assets/img/asn/${asnInfo.website}.svg`}
                        alt={asnInfo.website}
                        width="28"
                        height="28"
                        style={{ borderRadius: 4 }}
                        loading="lazy"
                        onError={(e) => (e.currentTarget.style.display = 'none')}
                      />
                    )}
                  </Typography>
                </Box>
              </Box>
              <Button
                size="small"
                endIcon={<ArrowForward />}
                onClick={() => onNavigate?.('asn')}
              >
                View More
              </Button>
            </Box>
            <Grid container spacing={3}>
              <Grid item xs={12} md={6}>
                <Info rows={[
                  { label: 'ASN ID', value: ipInfo?.ipv4?.asn?.id || ipInfo?.ipv6?.asn?.id },
                  { label: 'Network', value: ipInfo?.ipv4?.asn?.net || ipInfo?.ipv6?.asn?.net },
                  { label: 'Country', value: asnInfo.country },
                  { label: 'Website', value: asnInfo.website },
                ]} />
              </Grid>
              <Grid item xs={12} md={6}>
                <Info rows={[
                  { label: 'Registered', value: asnInfo.dates?.registered },
                  { label: 'Updated', value: asnInfo.dates?.updated },
                ]} />
              </Grid>
            </Grid>

            {/* Contacts */}
            {asnInfo.contacts && (
              <Box sx={{ mt: 3 }}>
                <Typography variant="subtitle2" gutterBottom>Contacts</Typography>
                <Grid container spacing={2}>
                  {Object.entries(asnInfo.contacts).map(([type, list]) =>
                    list.length > 0 ? (
                      <Grid item xs={12} md={6} key={type}>
                        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'capitalize' }}>
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
      )}

      {/* Loading skeleton */}
      {!ipInfo && (
        <Card sx={{ width: '100%' }}>
          <CardContent sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
            <CircularProgress />
          </CardContent>
        </Card>
      )}
    </Box>
  )
}

function DeviceRow({ device, gateway }) {
  const isGateway = device.ip === gateway
  const Icon = isGateway ? Router : DevicesOther
  return (
    <Box
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        p: 1.5,
        borderRadius: 2,
        bgcolor: 'action.hover',
      }}
    >
      <Icon color={isGateway ? 'primary' : 'inherit'} />
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="body1" sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          {device.hostname || device.vendor || 'Unknown device'}
          {device.vendor && (
            <Typography component="span" variant="caption" color="text.secondary">
              · {device.vendor}
            </Typography>
          )}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {device.ip}
          {device.mac && ` · ${device.mac}`}
        </Typography>
      </Box>
      <Typography
        variant="body2"
        color={isGateway ? 'primary' : 'text.secondary'}
        sx={{ alignSelf: 'flex-start', whiteSpace: 'nowrap' }}
      >
        {device.type}
      </Typography>
    </Box>
  )
}
