import express from 'express'
import cors from 'cors'
import dotenv from 'dotenv'
import { connectDB, prisma } from './utils/db.js'
import { withPrismaRetry, startKeepAlive } from './lib/prisma.js'
import { ensureRootAdmin } from './bootstrap.js'
import authRoutes from './routes/auth.js'
import productRoutes from './routes/products.js'
import catalogRoutes from './routes/catalog.js'
import orderRoutes from './routes/orders.js'
import paymentRoutes from './routes/payments.js'
import uploadRoutes from './routes/upload.js'
import messageRoutes from './routes/messages.js'
import notificationRoutes from './routes/notifications.js'
import adminRoutes from './routes/admin.js'
import agentRoutes from './routes/agent.js'
import favoriteRoutes from './routes/favorites.js'
import chapaRoutes from './routes/chapa.js'
import telebirrRoutes from './routes/telebirr.js'
import announcementRoutes from './routes/announcements.js'
import pushTokenRoutes from './routes/pushTokens.js'
import settingsRoutes from './routes/settings.js'
import contactRoutes from './routes/contact.js'
import reviewRoutes from './routes/reviews.js'
import statsRoutes from './routes/stats.js'
import permissionRoutes from './routes/permissions.js'
import measurementRoutes from './routes/measurements.js'
import productionRoutes from './routes/production.js'
import workerRoutes from './routes/workers.js'
import inventoryRoutes from './routes/inventory.js'
import commissionRoutes from './routes/commissions.js'
import { startNotificationCleanup } from './routes/notifications.js'
import { setupWebSocket } from './ws/server.js'
import { errorHandler, notFoundHandler } from './middleware/error.js'
import { isResendConfigured } from './services/email.js'
import { isLocalStorage, ensureUploadDir, uploadDirExists, uploadDirPath } from './utils/storage.js'

dotenv.config()

const app = express()
const PORT = process.env.PORT || 4000



ensureUploadDir()
if (isLocalStorage() || uploadDirExists()) {
  app.use('/uploads', express.static(uploadDirPath()))
  console.log('📁 Serving uploaded files from disk at /uploads')
}



app.use((req, res, next) => {
  const start = Date.now()
  const path = (req.originalUrl || req.url || '/').split('?')[0]
  res.on('finish', () => {
    console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${path} ${res.statusCode} ${Date.now() - start}ms`)
  })
  next()
})


const allowedOrigins = [
  'http://localhost:3000',
  'http://localhost:4000',
  'capacitor://localhost',
  'http://localhost',
  'http://10.0.2.2',
  process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000',
  process.env.FRONTEND_URL || '',
  process.env.CONTACT_ALLOWED_ORIGIN || '',
  'https://dawolifes.vercel.app',
  'https://dawolife.jebugeneraltrading.com',
].filter(Boolean)

const allowAllOrigins = process.env.ALLOW_ALL_ORIGINS === 'true'

const isLocalhostOrigin = (origin: string) => {
  try {
    const { hostname } = new URL(origin)
    return hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '10.0.2.2'
  } catch {
    return false
  }
}

app.use(cors({
  origin: (origin, callback) => {
    if (allowAllOrigins || !origin || allowedOrigins.includes(origin) || isLocalhostOrigin(origin)) {
      callback(null, true)
    } else {
      callback(new Error('Not allowed by CORS'))
    }
  },
  credentials: true,
}))
app.use(express.json())
app.use(express.urlencoded({ extended: true }))


app.use('/api/auth', authRoutes)
app.use('/api/products', productRoutes)
app.use('/api/catalog', catalogRoutes)
app.use('/api/orders', orderRoutes)
app.use('/api/payments', paymentRoutes)
app.use('/api/upload', uploadRoutes)
app.use('/api/messages', messageRoutes)
app.use('/api/notifications', notificationRoutes)
app.use('/api/admin', adminRoutes)
app.use('/api/agent', agentRoutes)
app.use('/api/favorites', favoriteRoutes)
app.use('/api/chapa', chapaRoutes)
app.use('/api/telebirr', telebirrRoutes)
app.use('/api/announcements', announcementRoutes)
app.use('/api/push-tokens', pushTokenRoutes)
app.use('/api/settings', settingsRoutes)
app.use('/api/contact', contactRoutes)
app.use('/api/reviews', reviewRoutes)
app.use('/api/stats', statsRoutes)
app.use('/api/permissions', permissionRoutes)
app.use('/api/measurements', measurementRoutes)
app.use('/api/production', productionRoutes)
app.use('/api/workers', workerRoutes)
app.use('/api/inventory', inventoryRoutes)
app.use('/api/commissions', commissionRoutes)


app.get('/', (_req, res) => {
  res.json({
    name: 'Hachalu Protocol API',
    version: '1.0.0',
    status: 'running',
    endpoints: {
      health: '/api/health',
      auth: '/api/auth/*',
      products: '/api/products',
      catalog: '/api/catalog/*',
      orders: '/api/orders',
      payments: '/api/payments',
      chapa: '/api/chapa/*',
      telebirr: '/api/telebirr/*',
      measurements: '/api/measurements',
      production: '/api/production/*',
      workers: '/api/workers/*',
      inventory: '/api/inventory/*',
      commissions: '/api/commissions',
      agents: '/api/agent/*',
      admin: '/api/admin/*',
      favorites: '/api/favorites',
      upload: '/api/upload',
      announcements: '/api/announcements',
      pushTokens: '/api/push-tokens',
      contact: '/api/contact',
      reviews: '/api/reviews',
      stats: '/api/stats/overview',
    },
  })
})


app.get(['/api/health', '/health'], async (_req, res) => {
  let dbState = 'disconnected'
  try {
    await withPrismaRetry(() => prisma.$queryRaw`SELECT 1`)
    dbState = 'connected'
  } catch {
    dbState = 'disconnected'
  }
  res.status(dbState === 'connected' ? 200 : 503).json({
    status: dbState === 'connected' ? 'ok' : 'degraded',
    db: dbState,
    timestamp: new Date().toISOString(),
  })
})


async function start() {
  const db = await connectDB()
  if (db) {
    startKeepAlive()
  }

  try {
    await ensureRootAdmin()
    console.log('✅ Root admin ensured (falmitesfaye@gmail.com)')
  } catch (e: any) {
    console.error('⚠️ Failed to ensure root admin:', e?.message || e)
  }

  
  
  app.get('/api/debug/email', (_req, res) => {
    const mask = (v: string | undefined) => (v ? `${v.slice(0, 6)}…${v.slice(-4)} (len ${v.length})` : '(unset)')
    res.json({
      transport: isResendConfigured() ? 'RESEND' : 'NONE (emails skipped)',
      resend: {
        configured: isResendConfigured(),
        apiKey: process.env.RESEND_API_KEY ? mask(process.env.RESEND_API_KEY) : '(unset)',
        fromEmail: process.env.RESEND_FROM_EMAIL || '(unset)',
        fromName: process.env.RESEND_FROM_NAME || 'Hachalu',
      },
      baseUrl: process.env.BASE_URL || '(unset → http://localhost:4000)',
      frontendUrl: process.env.FRONTEND_URL || '(unset)',
    })
  })

  
  app.use(notFoundHandler)
  app.use(errorHandler)

  const server = app.listen(PORT, () => {
    console.log(`Hachalu Protocol API server running on port ${PORT} ✅`)

    if (isResendConfigured()) {
      console.log('Email transport: Resend API ✅')
    } else {
      console.log('Email transport: NOT CONFIGURED — emails will be skipped (set RESEND_API_KEY + RESEND_FROM_EMAIL)')
    }

    
    
    const selfUrl = process.env.RENDER_EXTERNAL_URL || `http://localhost:${PORT}`
    setInterval(() => {
      fetch(`${selfUrl}/api/health`).catch(() => {})
    }, 5 * 60 * 1000).unref()
  })
  setupWebSocket(server)
  startNotificationCleanup()
}

start().catch((err) => {
  console.error('Failed to start server:', err)
  process.exit(1)
})
