// Strip protocol and anything after the domain (path, query, fragment, port).
export const sanitizeDomain = (raw) => {
  let d = String(raw).trim().toLowerCase()
  d = d.replace(/^https?:\/\//i, '')
  d = d.split(/[/?#]/)[0]
  return d.split(':')[0]
}
