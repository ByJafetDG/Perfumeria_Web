import 'dotenv/config'

const required = [
  'SUPABASE_URL',
  'SUPABASE_SERVICE_ROLE_KEY',
  'TILOPAY_API_KEY',
  'TILOPAY_API_USER',
  'TILOPAY_API_PASSWORD',
]

for (const key of required) {
  if (!process.env[key]) throw new Error(`Missing env var: ${key}`)
}

export const env = {
  supabaseUrl: process.env.SUPABASE_URL,
  supabaseServiceKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
  tilopayApiKey: process.env.TILOPAY_API_KEY,
  tilopayUser: process.env.TILOPAY_API_USER,
  tilopayPassword: process.env.TILOPAY_API_PASSWORD,
  tilopayCallbackUrl: process.env.TILOPAY_CALLBACK_URL,
  port: parseInt(process.env.PORT ?? '3001'),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:5173',
}
