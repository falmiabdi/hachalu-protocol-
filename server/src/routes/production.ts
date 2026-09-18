import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { productionJobSchema, isValidUuid } from '../utils/validation.js'
import { createAndBroadcastNotification } from '../utils/notifications.js'

const router = Router()

const jobInclude = {
  order: { select: { id: true, orderNumber: true, type: true, status: true, customerId: true } },
  orderItem: { include: { product: { select: { id: true, name: true } }, template: { select: { id: true, name: true } } } },
  product: { select: { id: true, name: true } },
  assignees: {
    include: {
      worker: { include: { user: { select: { id: true, username: true, profilePhoto: true, phone: true } } } },
    },
  },
}


router.post('/jobs', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const parsed = productionJobSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }

    const order = await prisma.order.findUnique({ where: { id: parsed.data.orderId } })
    if (!order) return res.status(404).json({ message: 'Order not found' })

    const job = await prisma.productionJob.create({
      data: {
        orderId: parsed.data.orderId,
        orderItemId: parsed.data.orderItemId || null,
        productId: parsed.data.productId || null,
        notes: parsed.data.notes || null,
      },
      include: jobInclude,
    })
    res.status(201).json({ message: 'Production job created', job })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create production job' })
  }
})


router.get('/jobs', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'admin'
    const isWorker = req.user!.role === 'worker'

    let where: any = {}
    if (req.query.status && req.query.status !== 'all') {
      where.status = String(req.query.status)
    }
    if (!isAdmin && isWorker) {
      where.assignees = { some: { worker: { userId: req.user!.userId } } }
    } else if (!isAdmin) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const jobs = await prisma.productionJob.findMany({
      where,
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ jobs })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch production jobs' })
  }
})


router.get('/jobs/mine', authMiddleware, async (req, res) => {
  try {
    if (req.user!.role !== 'worker' && req.user!.role !== 'admin') {
      return res.status(403).json({ message: 'Worker access required' })
    }
    const jobs = await prisma.productionJob.findMany({
      where: { assignees: { some: { worker: { userId: req.user!.userId } } } },
      include: jobInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ jobs })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch your jobs' })
  }
})


router.get('/jobs/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Job not found' })
    const job = await prisma.productionJob.findUnique({ where: { id: req.params.id }, include: jobInclude })
    if (!job) return res.status(404).json({ message: 'Job not found' })
    res.json({ job })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch job' })
  }
})


router.post('/jobs/:id/assign', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Job not found' })
    const { workerIds } = req.body
    if (!Array.isArray(workerIds) || workerIds.length === 0) {
      return res.status(400).json({ message: 'workerIds array is required' })
    }

    const existing = await prisma.productionJob.findUnique({ where: { id: req.params.id } })
    if (!existing) return res.status(404).json({ message: 'Job not found' })

    const job = await prisma.$transaction(async (tx) => {
      await tx.workerAssignment.deleteMany({ where: { jobId: existing.id } })
      await tx.workerAssignment.createMany({
        data: workerIds.map((workerId) => ({ jobId: existing.id, workerId, role: 'tailor' })),
      })
      await tx.worker.updateMany({ where: { id: { in: workerIds } }, data: { status: 'Busy' } })
      return tx.productionJob.update({
        where: { id: existing.id },
        data: { status: 'Assigned', startTime: new Date() },
        include: jobInclude,
      })
    })

    for (const workerId of workerIds) {
      const worker = await prisma.worker.findUnique({
        where: { id: workerId },
        include: { user: { select: { id: true, username: true } } },
      })
      if (worker) {
        createAndBroadcastNotification(
          worker.userId,
          'New Production Task',
          `You have been assigned to job ${existing.id.slice(0, 8)} (order ${job.order.orderNumber}).`,
          'info',
          { jobId: existing.id, orderId: existing.orderId }
        ).catch(() => {})
      }
    }

    res.json({ message: 'Workers assigned', job })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to assign workers' })
  }
})


router.patch('/jobs/:id/status', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Job not found' })
    const job = await prisma.productionJob.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ message: 'Job not found' })

    const status = String(req.body.status || '')
    const allowed = ['Assigned', 'Started', 'InProgress25', 'InProgress50', 'InProgress75', 'Ready', 'QualityCheck', 'Completed']
    if (!allowed.includes(status)) {
      return res.status(400).json({ message: 'Invalid job status' })
    }

    const isAdmin = req.user!.role === 'admin'
    const isAssignee = req.user!.role === 'worker' && (await prisma.workerAssignment.count({
      where: { jobId: job.id, worker: { userId: req.user!.userId } },
    })) > 0
    if (!isAdmin && !isAssignee) {
      return res.status(403).json({ message: 'Only an assigned worker or admin can update this job' })
    }

    const updated = await prisma.productionJob.update({
      where: { id: job.id },
      data: {
        status: status as any,
        startTime: job.startTime || new Date(),
        endTime: ['Completed', 'QualityCheck'].includes(status) ? new Date() : job.endTime,
      },
      include: jobInclude,
    })

    res.json({ message: 'Job status updated', job: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update job status' })
  }
})


router.patch('/jobs/:id/qc', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Job not found' })
    const job = await prisma.productionJob.findUnique({ where: { id: req.params.id } })
    if (!job) return res.status(404).json({ message: 'Job not found' })

    const qcStatus = String(req.body.qcStatus || 'Approved')
    const notes = req.body.notes || null
    const updated = await prisma.productionJob.update({
      where: { id: job.id },
      data: { qcStatus, notes: notes || job.notes, status: qcStatus === 'Approved' ? 'Completed' : job.status },
      include: jobInclude,
    })
    res.json({ message: 'QC status updated', job: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update QC status' })
  }
})

export default router