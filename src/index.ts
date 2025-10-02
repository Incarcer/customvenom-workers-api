/**
 * Welcome to Cloudflare Workers! This is your first worker.
 *
 * - Run `npm run dev` in your terminal to start a development server
 * - Open a browser tab at http://localhost:8787/ to see your worker in action
 * - Run `npm run deploy` to publish your worker
 *
 * Bind resources to your worker in `wrangler.jsonc`. After adding bindings, a type definition for the
 * `Env` object can be regenerated with `npm run cf-typegen`.
 *
 * Learn more at https://developers.cloudflare.com/workers/
 */

import { Hono } from 'hono'

import { cors } from 'hono/cors'

import type { Env } from '../worker-configuration' 

const app = new Hono()

// CORS for local dev + your domain

app.use('*', cors({

origin: ['http://localhost:3000', 'https://customvenom.com', 'https://www.customvenom.com'],

allowMethods: ['GET', 'POST', 'OPTIONS'],

allowHeaders: ['Content-Type', 'Authorization'],

}))

app.get('/health', (c) => c.json({ ok: true }))

app.post('/league/config', async (c) => {

try {

const body = await c.req.json()

// TODO: validate & persist

return c.json({ received: body }, 200)

} catch {

return c.json({ error: 'Invalid JSON' }, 400)

}

})
app.get('/info', (c) => {

const env = c.env as Env

return c.json({ endpoint: env.R2_ENDPOINT, bucket: env.R2_BUCKET })

})
export default app