import './config/env.js'
import express from 'express'
import cors from 'cors'
import rateLimit from 'express-rate-limit'
import { env } from './config/env.js'
import { log } from './lib/logger.js'
import paymentsRouter from './routes/payments.js'
import webhooksRouter from './routes/webhooks.js'
import ordersRouter from './routes/orders.js'

const app = express()

app.use(cors({ origin: env.frontendUrl, credentials: true }))
app.use(express.json())

app.use('/payments', rateLimit({
  windowMs: 60 * 1000,
  max: 10,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests' },
}))

app.use('/payments', paymentsRouter)
app.use('/webhooks', webhooksRouter)
app.use('/orders', ordersRouter)

app.get('/health', (_, res) => res.json({ ok: true }))

app.listen(env.port, () => {
  log.info(`Server running on http://localhost:${env.port}`)
})
