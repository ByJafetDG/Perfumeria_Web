import { env } from '../config/env.js'

const BASE_URL = 'https://app.tilopay.com/api/v1/'

let _tokenCache = null // { token, expiresAt }

async function getToken() {
  if (_tokenCache && Date.now() < _tokenCache.expiresAt) return _tokenCache.token

  const res = await fetch(`${BASE_URL}login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    body: JSON.stringify({
      email:    env.tilopayUser,
      password: env.tilopayPassword,
    }),
  })
  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Tilopay auth failed')

  // Cachear 55 min (tokens de Tilopay duran 60 min)
  _tokenCache = { token: data.access_token, expiresAt: Date.now() + 55 * 60 * 1000 }
  return data.access_token
}

export async function createPayment({ orderId, amount, currency = 'CRC', redirectUrl, billing = {} }) {
  const token = await getToken()

  const res = await fetch(`${BASE_URL}processPayment`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'application/json',
      Authorization: `bearer ${token}`,
    },
    body: JSON.stringify({
      key:             env.tilopayApiKey,
      redirect:        redirectUrl,
      orderNumber:     orderId,
      amount:          amount.toFixed(2),
      currency,
      capture:         1,
      platform:        'api',
      hashVersion:     'V2',
      callbackUrl:     env.tilopayCallbackUrl,
      billToFirstName: billing.firstName   ?? '',
      billToLastName:  billing.lastName    ?? '',
      billToEmail:     billing.email       ?? '',
      billToTelephone: billing.phone       ?? '',
      billToAddress:   billing.address     ?? '',
      billToCity:      billing.city        ?? '',
      billToState:     billing.state       ?? '',
      billToCountry:   billing.country     ?? 'CR',
      billToZipPostCode: '',
    }),
  })

  const data = await res.json()
  if (!res.ok) throw new Error(data.message ?? 'Tilopay payment creation failed')
  return data
}
