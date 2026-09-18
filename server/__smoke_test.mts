import { writeFileSync } from 'node:fs'
import { join } from 'node:path'

const BASE = 'http://localhost:4000'
const out: string[] = []
const save = () => writeFileSync(join(import.meta.dirname, 'smoke-test.log'), out.join('\n'), 'utf8')

async function req(path: string, opts: any = {}) {
  const res = await fetch(`${BASE}${path}`, {
    method: 'GET',
    ...opts,
    headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
  })
  let body: any = null
  try { body = await res.json() } catch {}
  return { status: res.status, body }
}

let failures = 0
async function check(label: string, cond: boolean, detail: any = '') {
  out.push(`${cond ? 'PASS' : 'FAIL'}  ${label}${detail ? '  -> ' + JSON.stringify(detail).slice(0, 300) : ''}`)
  if (!cond) failures++
}

try {
  const health = await req('/api/health')
  await check('GET /api/health', health.status === 200 && health.body?.db === 'connected', health.body)

  const products = await req('/api/products')
  await check('GET /api/products', products.status === 200 && Array.isArray(products.body?.products) && products.body.products.length > 0, { count: products.body?.products?.length })

  const catalog = await req('/api/catalog/categories')
  await check('GET /api/catalog/categories', catalog.status === 200 && Array.isArray(catalog.body?.categories), { count: catalog.body?.categories?.length })

  const templates = await req('/api/catalog/templates')
  await check('GET /api/catalog/templates', templates.status === 200 && templates.body?.templates?.length === 5, { count: templates.body?.templates?.length })

  const sizes = await req('/api/catalog/sizes')
  await check('GET /api/catalog/sizes', sizes.status === 200 && sizes.body?.sizes?.length === 8, { count: sizes.body?.sizes?.length })

  const brands = await req('/api/catalog/brands')
  await check('GET /api/catalog/brands', brands.status === 200 && Array.isArray(brands.body?.brands), { count: brands.body?.brands?.length })

  const colors = await req('/api/catalog/colors')
  await check('GET /api/catalog/colors', colors.status === 200 && Array.isArray(colors.body?.colors), { count: colors.body?.colors?.length })

  const stats = await req('/api/stats/overview')
  await check('GET /api/stats/overview', stats.status === 200 && stats.body?.listedProducts > 0, stats.body)

  const login = await req('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email: 'falmitesfaye@gmail.com', password: 'SecurePass@123' }) })
  await check('POST /api/auth/signin (admin)', login.status === 200 && !!login.body?.accessToken)
  const adminHeaders = { Authorization: `Bearer ${login.body?.accessToken}` }

  const adminOverview = await req('/api/admin/overview', { headers: adminHeaders })
  await check('GET /api/admin/overview', adminOverview.status === 200 && adminOverview.body?.counts?.products > 0, adminOverview.body?.counts)

  const adminProducts = await req('/api/admin/products', { headers: adminHeaders })
  await check('GET /api/admin/products', adminProducts.status === 200 && adminProducts.body?.products?.length > 0)

  const ordersAdmin = await req('/api/orders', { headers: adminHeaders })
  await check('GET /api/orders (admin)', ordersAdmin.status === 200)

  const buyerLogin = await req('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email: 'buyer@hachalu.com', password: 'SecurePass@123' }) })
  await check('POST /api/auth/signin (buyer)', buyerLogin.status === 200 && !!buyerLogin.body?.accessToken)

  const variant = products.body.products[0]?.variants?.[0]
  const orderCreate = await req('/api/orders', {
    method: 'POST',
    headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` },
    body: JSON.stringify({
      type: 'ready_made',
      items: [{ productId: products.body.products[0].id, variantId: variant?.id, quantity: 1 }],
    }),
  })
  await check('POST /api/orders (buyer ready-made)', orderCreate.status === 201 && orderCreate.body?.order?.totalPrice > 0, { status: orderCreate.status, orderNumber: orderCreate.body?.order?.orderNumber })

  const myOrders = await req('/api/orders/my-orders', { headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` } })
  await check('GET /api/orders/my-orders', myOrders.status === 200 && myOrders.body?.orders?.length >= 1, { count: myOrders.body?.orders?.length })

  const measurements = await req('/api/measurements', { method: 'POST', headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` }, body: JSON.stringify({ templateId: templates.body.templates[0].id, values: { height: 180, chest: 100 }, unit: 'cm' }) })
  await check('POST /api/measurements', measurements.status === 201, measurements.body)

  const mechList = await req('/api/measurements', { headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` } })
  await check('GET /api/measurements (buyer)', mechList.status === 200 && mechList.body?.measurements?.length === 1)

  const saved = await req('/api/favorites', { method: 'POST', headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` }, body: JSON.stringify({ itemType: 'product', itemId: products.body.products[0].id }) })
  await check('POST /api/favorites', saved.status === 201, saved.body?.message)

  const favoritesList = await req('/api/favorites', { headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` } })
  await check('GET /api/favorites', favoritesList.status === 200 && favoritesList.body?.items?.length === 1)

  const msg = await req('/api/messages', { method: 'POST', headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` }, body: JSON.stringify({ productId: products.body.products[0].id, recipientId: 'seller@hachalu.com' === 'x' ? '' : products.body.products[0].seller.id, content: 'Is this available?' }) })
  await check('POST /api/messages (to seller)', msg.status === 201, msg.body?.message)

  const workerLogin = await req('/api/auth/signin', { method: 'POST', body: JSON.stringify({ email: 'worker@hachalu.com', password: 'SecurePass@123' }) })
  await check('POST /api/auth/signin (worker)', workerLogin.status === 200 && !!workerLogin.body?.accessToken)

  const jobs = await req('/api/production/jobs/mine', { headers: { Authorization: `Bearer ${workerLogin.body?.accessToken}` } })
  await check('GET /api/production/jobs/mine', jobs.status === 200)

  const inventory = await req('/api/inventory/materials', { headers: adminHeaders })
  await check('GET /api/inventory/materials', inventory.status === 200 && Array.isArray(inventory.body?.materials))

  const workers = await req('/api/workers', { headers: adminHeaders })
  await check('GET /api/workers', workers.status === 200 && workers.body?.workers?.length === 1, { count: workers.body?.workers?.length })

  const permissions = await req('/api/permissions/admin', { headers: adminHeaders })
  await check('GET /api/permissions/admin', permissions.status === 200)

  const productDetail = await req('/api/products/' + products.body.products[0].id)
  await check('GET /api/products/:id', productDetail.status === 200 && !!productDetail.body?.product?.id)

  const payments = await req('/api/payments', { headers: { Authorization: `Bearer ${buyerLogin.body?.accessToken}` } })
  await check('GET /api/payments (buyer)', payments.status === 200)
} catch (err: any) {
  out.push(`ERROR ${err?.message || err}`)
  failures++
}

out.push(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`)
save()
console.log(out.join('\n'))
process.exit(failures === 0 ? 0 : 1)
