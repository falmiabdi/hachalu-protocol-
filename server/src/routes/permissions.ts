import { Router } from 'express'
import { z } from 'zod'
import { authMiddleware, agentMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma, withPrismaRetry } from '../lib/prisma.js'
import { notifyAdmins, createAndBroadcastNotification } from '../utils/notifications.js'
import { isValidUuid } from '../utils/validation.js'

const router = Router()

export type PermissionAction = 'EDIT' | 'DELETE'
export type PermissionEntity = 'PRODUCT' | 'ORDER'

export async function assertListingPermissionAllowed(opts: {
  requesterId: string
  isAdmin: boolean
  entityType: PermissionEntity
  entityId: string
  listingStatus: string
  type: PermissionAction
}): Promise<{ allowed: true } | { allowed: false; code: string }> {
  if (opts.isAdmin || opts.listingStatus !== 'Approved') {
    return { allowed: true }
  }

  return withPrismaRetry(async () => {
    const request = await prisma.permissionRequest.findFirst({
      where: {
        entityType: opts.entityType,
        entityId: opts.entityId,
        requesterId: opts.requesterId,
        type: opts.type,
        status: 'Approved',
        used: false,
      },
    })
    if (!request) {
      return { allowed: false, code: 'PERMISSION_REQUIRED' } as const
    }
    await prisma.permissionRequest.update({ where: { id: request.id }, data: { used: true } })
    return { allowed: true } as const
  })
}

const createSchema = z.object({
  entityType: z.enum(['PRODUCT', 'ORDER']),
  entityId: z.string(),
  type: z.enum(['EDIT', 'DELETE']),
  reason: z.string().max(500).optional(),
})

router.post('/', authMiddleware, agentMiddleware, async (req, res) => {
  try {
    const parsed = createSchema.safeParse(req.body)
    if (!parsed.success || !isValidUuid(parsed.data.entityId)) {
      return res.status(400).json({ message: 'Validation error' })
    }
    const { entityType, entityId, type, reason } = parsed.data
    const requesterId = req.user!.userId

    const listing =
      entityType === 'PRODUCT'
        ? await withPrismaRetry(() => prisma.product.findUnique({ where: { id: entityId } }))
        : await withPrismaRetry(() => prisma.order.findUnique({ where: { id: entityId } }))
    if (!listing) {
      return res.status(404).json({ message: 'Listing not found' })
    }
    const ownerId = entityType === 'PRODUCT' ? (listing as any).sellerId : (listing as any).sellerId
    if (ownerId !== requesterId) {
      return res.status(403).json({ message: 'Not authorized' })
    }

    const request = await withPrismaRetry(async () => {
      const existing = await prisma.permissionRequest.findFirst({
        where: {
          entityType,
          entityId,
          type,
          requesterId,
          status: { in: ['Pending', 'Approved'] },
          used: false,
        },
      })
      if (existing) {
        return { existing }
      }
      return { created: await prisma.permissionRequest.create({
        data: { entityType, entityId, type, requesterId, reason: reason || null },
      }) }
    })
    if (request.existing) {
      return res.status(200).json({ message: 'Permission already requested', request: request.existing })
    }

    notifyAdmins(
      'Permission Request',
      `A seller requests permission to ${type === 'EDIT' ? 'edit' : 'delete'} a ${entityType === 'PRODUCT' ? 'product' : 'order'}.`,
      'info',
      { entityType: 'PERMISSION', entityId: request.created!.id, permissionId: request.created!.id, listingType: entityType, listingId: entityId, requestType: type }
    ).catch(() => {})

    res.status(201).json({ message: 'Permission requested', request: request.created })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to request permission' })
  }
})

router.get('/admin', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { requests, pendingCount } = await withPrismaRetry(async () => {
      const requests = await prisma.permissionRequest.findMany({
        where: req.query.status ? { status: String(req.query.status) as any } : undefined,
        include: { requester: { select: { id: true, username: true, email: true, profilePhoto: true } } },
        orderBy: { createdAt: 'desc' },
      })
      const pendingCount = await prisma.permissionRequest.count({ where: { status: 'Pending' } })
      return { requests, pendingCount }
    })
    res.json({ requests, pendingCount })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch permission requests' })
  }
})

router.get('/mine', authMiddleware, async (req, res) => {
  try {
    const { entityId, entityType, type } = req.query
    const requests = await withPrismaRetry(async () => {
      const where: any = { requesterId: req.user!.userId }
      if (entityId) where.entityId = String(entityId)
      if (entityType) where.entityType = String(entityType)
      if (type) where.type = String(type)
      return prisma.permissionRequest.findMany({
        where,
        orderBy: { createdAt: 'desc' },
      })
    })
    res.json({ requests })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch permission requests' })
  }
})

router.patch('/:id/decide', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) {
      return res.status(404).json({ message: 'Request not found' })
    }
    const approve = req.body.approve === true

    const updated = await withPrismaRetry(async () => {
      const request = await prisma.permissionRequest.findUnique({ where: { id: req.params.id } })
      if (!request) {
        return null
      }
      return prisma.permissionRequest.update({
        where: { id: request.id },
        data: { status: approve ? 'Approved' : 'Rejected', decidedAt: new Date(), decidedById: req.user!.userId },
      })
    })
    if (!updated) {
      return res.status(404).json({ message: 'Request not found' })
    }

    createAndBroadcastNotification(
      updated.requesterId,
      approve ? 'Permission Approved' : 'Permission Rejected',
      approve
        ? `Your request to ${updated.type === 'EDIT' ? 'edit' : 'delete'} has been approved.`
        : `Your request to ${updated.type === 'EDIT' ? 'edit' : 'delete'} was rejected.`,
      approve ? 'success' : 'error',
      { entityType: 'PERMISSION', permissionId: updated.id, approved: approve }
    ).catch(() => {})

    res.json({ message: approve ? 'Permission approved' : 'Permission rejected', request: updated })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to decide permission request' })
  }
})

export default router