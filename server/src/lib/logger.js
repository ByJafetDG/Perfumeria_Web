const isDev = process.env.NODE_ENV !== 'production'

function fmt(level, data, msg) {
  if (isDev) {
    const prefix = `[${level.toUpperCase()}]`
    if (msg) console[level === 'error' ? 'error' : 'log'](prefix, msg, data ?? '')
    else      console[level === 'error' ? 'error' : 'log'](prefix, data)
  } else {
    console[level === 'error' ? 'error' : 'log'](
      JSON.stringify({ level, ts: new Date().toISOString(), ...(msg ? { msg, ...data } : data) })
    )
  }
}

export const log = {
  info:  (data, msg) => fmt('info',  data, msg),
  warn:  (data, msg) => fmt('warn',  data, msg),
  error: (data, msg) => fmt('error', data, msg),
}
