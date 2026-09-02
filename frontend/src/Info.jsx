import { Box, Typography } from '@mui/material'

export default function Info({ rows }) {
  return (
    <Box component="dl" sx={{ m: 0 }}>
      {rows.map((r) =>
        r.value ? (
          <Box key={r.label} component="div" sx={{ display: 'flex', gap: 2, py: 0.5 }}>
            <Typography variant="body2" color="text.secondary" sx={{ minWidth: 90, flexShrink: 0 }}>
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
