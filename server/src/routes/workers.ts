import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { workerSchema, machineSchema, isValidUuid } from '../utils/validation.js'

const router = Router()


router.get('/', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const set = await prisma.setting.findUnique({ where: { id: 'default' } })
    const lowStockThreshold = set?.lowStockThreshold ?? 10
    const workers = await prisma.worker.findMany({
      include: {
        user: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true, status: true } },
        machine: { select: { id: true, name: true, code: true, type: true, status: true } },
        _count: { select: { jobs: true } },
      },
      orderBy: { createdAt: 'asc' },
    })
    const mapped = workers.map((w) => ({
      ...w,
      lowStockThreshold,
      _count: undefined,
    }))
    res.json({ workers: mapped })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch workers' })
  }
})


router.post('/', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = workerSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }
    let userId = parsed.data.userId || null
    if (!userId && parsed.data.email) {
      const byEmail = await prisma.user.findUnique({ where: { email: parsed.data.email.toLowerCase() } })
      if (!byEmail) return res.status(404).json({ message: 'No account found with that email' })
      userId = byEmail.id
    }
    if (!userId) return res.status(400).json({ message: 'userId or email is required' })
    const user = await prisma.user.findUnique({ where: { id: userId } })
    if (!user) return res.status(404).json({ message: 'User not found' })

    const worker = await prisma.worker.create({
      data: {
        userId: user.id,
        specialty: parsed.data.specialty || null,
        phone: parsed.data.phone || user.phone || null,
        status: parsed.data.status ?? 'Available',
        machineId: parsed.data.machineId || null,
      },
      include: { user: { select: { id: true, username: true, email: true, phone: true } } },
    })
    await prisma.user.update({ where: { id: user.id }, data: { role: 'worker', roles: ['worker'] } })
    res.status(201).json({ message: 'Worker created', worker })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create worker' })
  }
})


router.patch('/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Worker not found' })
    const updates: Record<string, any> = {}
    const { specialty, phone, status, machineId } = req.body
    if (specialty !== undefined) updates.specialty = specialty
    if (phone !== undefined) updates.phone = phone
    if (status !== undefined) updates.status = status
    if (machineId !== undefined) updates.machineId = machineId
    const worker = await prisma.worker.update({
      where: { id: req.params.id },
      data: updates,
      include: { user: { select: { id: true, username: true, email: true, phone: true } } },
    })
    res.json({ message: 'Worker updated', worker })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update worker' })
  }
})


router.get('/machines', authMiddleware, adminMiddleware, async (_req, res) => {
  try {
    const machines = await prisma.machine.findMany({
      include: { _count: { select: { workers: true } } },
      orderBy: { createdAt: 'asc' },
    })
    res.json({ machines })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch machines' })
  }
})


router.post('/machines', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = machineSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }
    const machine = await prisma.machine.create({
      data: {
        name: parsed.data.name,
        type: parsed.data.type || null,
        code: parsed.data.code || null,
        status: parsed.data.status ?? 'Available',
        location: parsed.data.location || null,
        maintenanceNotes: parsed.data.maintenanceNotes || null,
      },
    })
    res.status(201).json({ message: 'Machine created', machine })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create machine' })
  }
})


router.patch('/machines/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Machine not found' })
    const updates: Record<string, any> = {}
    const { name, type, code, status, location, maintenanceNotes } = req.body
    if (name !== undefined) updates.name = name
    if (type !== undefined) updates.type = type
    if (code !== undefined) updates.code = code
    if (status !== undefined) updates.status = status
    if (location !== undefined) updates.location = location
    if (maintenanceNotes !== undefined) updates.maintenanceNotes = maintenanceNotes
    const machine = await prisma.machine.update({ where: { id: req.params.id }, data: updates })
    res.json({ message: 'Machine updated', machine })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update machine' })
  }
})

export default router