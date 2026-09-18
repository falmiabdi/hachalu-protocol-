import { Router } from 'express'
import { authMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { measurementSchema, isValidUuid } from '../utils/validation.js'
import { Prisma } from '@prisma/client'

const router = Router()

const measurementInclude = {
  template: { select: { id: true, name: true, fields: true, category: { select: { id: true, name: true } } } },
  customer: { select: { id: true, username: true, email: true, phone: true, profilePhoto: true } },
}

const canManage = (req: any, userId: string) =>
  req.user!.role === 'admin' || req.user!.userId === userId || req.user!.role === 'worker'


router.post('/', authMiddleware, async (req, res) => {
  try {
    const parsed = measurementSchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({ message: 'Validation error', errors: parsed.error.flatten() })
    }
    const { templateId, values, unit, notes, referencePhoto, orderId } = parsed.data

    const template = await prisma.measurementTemplate.findUnique({ where: { id: templateId } })
    if (!template) return res.status(404).json({ message: 'Measurement template not found' })

    const measurement = await prisma.customerMeasurement.create({
      data: {
        templateId,
        customerId: req.user!.userId,
        enteredById: req.user!.role === 'admin' ? req.user!.userId : null,
        orderId: orderId || null,
        values: (values as Prisma.InputJsonValue) || {},
        unit: unit ?? 'cm',
        notes: notes || null,
        referencePhoto: referencePhoto || null,
      },
      include: measurementInclude,
    })
    res.status(201).json({ message: 'Measurement saved', measurement })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to save measurement' })
  }
})


router.get('/', authMiddleware, async (req, res) => {
  try {
    const isAdmin = req.user!.role === 'admin'
    const where: any = isAdmin ? {} : { customerId: req.user!.userId }
    if (req.query.customerId) where.customerId = String(req.query.customerId)
    if (req.query.orderId) where.orderId = String(req.query.orderId)

    const measurements = await prisma.customerMeasurement.findMany({
      where,
      include: measurementInclude,
      orderBy: { createdAt: 'desc' },
    })
    res.json({ measurements })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch measurements' })
  }
})


router.get('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Measurement not found' })
    const measurement = await prisma.customerMeasurement.findUnique({ where: { id: req.params.id }, include: measurementInclude })
    if (!measurement) return res.status(404).json({ message: 'Measurement not found' })
    if (!canManage(req, measurement.customerId)) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    res.json({ measurement })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch measurement' })
  }
})


router.patch('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Measurement not found' })
    const measurement = await prisma.customerMeasurement.findUnique({ where: { id: req.params.id } })
    if (!measurement) return res.status(404).json({ message: 'Measurement not found' })
    if (!canManage(req, measurement.customerId)) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const updates: Record<string, any> = {}
    if (req.body.values !== undefined) updates.values = req.body.values
    if (req.body.unit !== undefined) updates.unit = req.body.unit
    if (req.body.notes !== undefined) updates.notes = req.body.notes
    if (req.body.referencePhoto !== undefined) updates.referencePhoto = req.body.referencePhoto

    const updated = await prisma.customerMeasurement.update({
      where: { id: req.params.id },
      data: updates,
      include: measurementInclude,
    })
    res.json({ message: 'Measurement updated', measurement: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update measurement' })
  }
})


router.delete('/:id', authMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Measurement not found' })
    const measurement = await prisma.customerMeasurement.findUnique({ where: { id: req.params.id } })
    if (!measurement) return res.status(404).json({ message: 'Measurement not found' })
    if (!canManage(req, measurement.customerId)) {
      return res.status(403).json({ message: 'Not authorized' })
    }
    await prisma.customerMeasurement.delete({ where: { id: req.params.id } })
    res.json({ message: 'Measurement removed' })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to remove measurement' })
  }
})

export default router