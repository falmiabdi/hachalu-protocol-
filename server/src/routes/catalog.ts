import { Router } from 'express'
import { authMiddleware, adminMiddleware } from '../middleware/auth.js'
import { prisma } from '../lib/prisma.js'
import { isValidUuid } from '../utils/validation.js'
import { Prisma } from '@prisma/client'

const router = Router()

router.get('/categories', async (_req, res) => {
  try {
    const categories = await prisma.category.findMany({
      where: { active: true },
      include: { _count: { select: { products: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ categories })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch categories' })
  }
})

router.post('/categories', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, slug, gender, description, sortOrder } = req.body
    if (!name || !slug || !gender) {
      return res.status(400).json({ message: 'name, slug, and gender are required' })
    }
    const category = await prisma.category.create({
      data: {
        name: String(name),
        slug: String(slug).toLowerCase().replace(/[^a-z0-9]+/g, '-'),
        gender,
        description: description || null,
        sortOrder: Number(sortOrder) || 0,
        active: true,
      },
    })
    res.status(201).json({ message: 'Category created', category })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create category' })
  }
})

router.patch('/categories/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updates: Record<string, any> = {}
    const { name, slug, gender, description, sortOrder, active } = req.body
    if (name !== undefined) updates.name = name
    if (slug !== undefined) updates.slug = String(slug).toLowerCase().replace(/[^a-z0-9]+/g, '-')
    if (gender !== undefined) updates.gender = gender
    if (description !== undefined) updates.description = description
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder)
    if (active !== undefined) updates.active = active
    const category = await prisma.category.update({ where: { id: req.params.id }, data: updates })
    res.json({ message: 'Category updated', category })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update category' })
  }
})


router.get('/brands', async (_req, res) => {
  try {
    const brands = await prisma.brand.findMany({
      where: { active: true },
      include: { _count: { select: { products: true } } },
      orderBy: { name: 'asc' },
    })
    res.json({ brands })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch brands' })
  }
})

router.post('/brands', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, origin } = req.body
    if (!name) return res.status(400).json({ message: 'name is required' })
    const brand = await prisma.brand.create({ data: { name: String(name), origin: origin || null } })
    res.status(201).json({ message: 'Brand created', brand })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create brand' })
  }
})

router.patch('/brands/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updates: Record<string, any> = {}
    const { name, origin, active } = req.body
    if (name !== undefined) updates.name = name
    if (origin !== undefined) updates.origin = origin
    if (active !== undefined) updates.active = active
    const brand = await prisma.brand.update({ where: { id: req.params.id }, data: updates })
    res.json({ message: 'Brand updated', brand })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update brand' })
  }
})


router.get('/colors', async (_req, res) => {
  try {
    const colors = await prisma.colorOption.findMany({
      where: { active: true },
      orderBy: { name: 'asc' },
    })
    res.json({ colors })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch colors' })
  }
})

router.post('/colors', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, hex } = req.body
    if (!name) return res.status(400).json({ message: 'name is required' })
    const color = await prisma.colorOption.create({ data: { name: String(name), hex: hex || null } })
    res.status(201).json({ message: 'Color created', color })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create color' })
  }
})


router.get('/sizes', async (_req, res) => {
  try {
    const sizes = await prisma.sizeOption.findMany({
      where: { active: true },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ sizes })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch sizes' })
  }
})

router.post('/sizes', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, sortOrder } = req.body
    if (!name) return res.status(400).json({ message: 'name is required' })
    const size = await prisma.sizeOption.create({ data: { name: String(name), sortOrder: Number(sortOrder) || 0 } })
    res.status(201).json({ message: 'Size created', size })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create size' })
  }
})


router.get('/templates', async (req, res) => {
  try {
    const where: any = { active: true }
    if (req.query.categoryId) where.categoryId = String(req.query.categoryId)
    const templates = await prisma.measurementTemplate.findMany({
      where,
      include: { category: { select: { id: true, name: true, slug: true } } },
      orderBy: { sortOrder: 'asc' },
    })
    res.json({ templates })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch templates' })
  }
})

router.get('/templates/:id', async (req, res) => {
  try {
    if (!isValidUuid(req.params.id)) return res.status(404).json({ message: 'Template not found' })
    const template = await prisma.measurementTemplate.findUnique({ where: { id: req.params.id } })
    if (!template) return res.status(404).json({ message: 'Template not found' })
    res.json({ template })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to fetch template' })
  }
})

router.post('/templates', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const { name, categoryId, fields, sortOrder } = req.body
    if (!name || !Array.isArray(fields)) {
      return res.status(400).json({ message: 'name and fields are required' })
    }
    const template = await prisma.measurementTemplate.create({
      data: {
        name: String(name),
        categoryId: categoryId || null,
        fields: (fields as Prisma.InputJsonValue[]) ?? [],
        sortOrder: Number(sortOrder) || 0,
      },
    })
    res.status(201).json({ message: 'Template created', template })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to create template' })
  }
})

router.patch('/templates/:id', authMiddleware, adminMiddleware, async (req, res) => {
  try {
    const updates: Record<string, any> = {}
    const { name, categoryId, fields, sortOrder, active } = req.body
    if (name !== undefined) updates.name = name
    if (categoryId !== undefined) updates.categoryId = categoryId
    if (fields !== undefined) updates.fields = fields
    if (sortOrder !== undefined) updates.sortOrder = Number(sortOrder)
    if (active !== undefined) updates.active = active
    const template = await prisma.measurementTemplate.update({ where: { id: req.params.id }, data: updates })
    res.json({ message: 'Template updated', template })
  } catch (err: any) {
    res.status(500).json({ message: err.message || 'Failed to update template' })
  }
})

export default router