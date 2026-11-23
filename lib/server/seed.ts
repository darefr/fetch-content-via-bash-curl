import { addDays } from '@/lib/format'
import type {
  Db, DeliveryMode, Item, Movement, MoveType, Order, OrderStatus, Org, Payment, Product, Receipt, Shipment, User,
} from '@/lib/types'
import { hashPassword } from './hash'

export const DB_VERSION = 5
export const DEMO_PASSWORD = 'feristock123'
export const DEMO_USERS = { retailer: 'u_ram', supplier: 'u_sita', both: 'u_hari' } as const
export const DEMO_ORG_IDS = ['o_ram', 'o_sita', 'o_lumbini']

const HOUR = 3_600_000
const DAY = 24 * HOUR
const FLOW: OrderStatus[] = ['pending', 'accepted', 'packed', 'dispatched', 'delivered']
const STEP_HOURS = [0, 2, 6, 10, 30]

type Tiers = [number, number][]
// sku, supplier, name, category, unit, price, moq, tiers, scheme
const CATALOG: [string, string, string, string, string, number, number, Tiers, string?][] = [
  ['ST-RCE-01', 'o_sita', 'Basmati rice 25 kg', 'Rice & Grains', 'bag', 3150, 1, [[5, 3090], [10, 3040]]],
  ['ST-RCE-02', 'o_sita', 'Sona Mansuli rice 25 kg', 'Rice & Grains', 'bag', 2050, 1, [[10, 1990]]],
  ['ST-SGR-01', 'o_sita', 'Sugar 50 kg', 'Sugar & Salt', 'sack', 5150, 1, [[4, 5080]]],
  ['ST-SLT-01', 'o_sita', 'Iodised salt 1 kg (bag of 25)', 'Sugar & Salt', 'bag', 520, 1, []],
  ['ST-DAL-01', 'o_sita', 'Masoor dal 25 kg', 'Pulses (Dal)', 'bag', 3900, 1, [[4, 3820]]],
  ['ST-OIL-01', 'o_sita', 'Sunflower oil 5 L', 'Oil & Ghee', 'jar', 1490, 2, [[6, 1460], [12, 1435]], 'Buy 12 jars, get 1 free'],
  ['ST-OIL-02', 'o_sita', 'Mustard oil 1 L (box of 12)', 'Oil & Ghee', 'carton', 3360, 1, [[5, 3290]]],
  ['ST-NDL-01', 'o_sita', 'Wai Wai noodles (carton of 30)', 'Noodles & Snacks', 'carton', 580, 2, [[10, 565], [25, 550]], 'Buy 10 cartons, get 1 free'],
  ['ST-SOP-01', 'o_sita', 'Bathing soap 100 g (box of 72)', 'Soap & Detergent', 'carton', 2520, 1, [[5, 2460]]],
  ['ST-TEA-01', 'o_sita', 'Ilam CTC tea 500 g (box of 20)', 'Tea & Beverages', 'carton', 3400, 1, [[5, 3320]]],
  ['HD-NDL-02', 'o_himal', 'Chicken instant noodles (carton of 30)', 'Noodles & Snacks', 'carton', 570, 5, [[20, 548]]],
  ['HD-BSC-01', 'o_himal', 'Glucose biscuits (carton of 48)', 'Biscuits', 'carton', 960, 2, [[10, 930]], 'Buy 20 cartons, get 2 free'],
  ['HD-BSC-02', 'o_himal', 'Cream biscuits assorted (carton of 36)', 'Biscuits', 'carton', 1440, 2, []],
  ['HD-DTG-01', 'o_himal', 'Detergent powder 1 kg (bag of 20)', 'Soap & Detergent', 'bag', 2300, 1, [[5, 2240]]],
  ['HD-DTG-02', 'o_himal', 'Dishwash bar 250 g (box of 60)', 'Soap & Detergent', 'carton', 1650, 1, []],
  ['HD-GHE-01', 'o_himal', 'Ghee 1 L (box of 12)', 'Oil & Ghee', 'carton', 9600, 1, []],
  ['HD-OIL-03', 'o_himal', 'Soyabean oil 1 L (box of 10)', 'Oil & Ghee', 'carton', 2150, 2, [[10, 2100]]],
  ['HD-TEA-02', 'o_himal', 'Tea dust 1 kg (bag of 10)', 'Tea & Beverages', 'bag', 2900, 1, []],
  ['PS-CHR-01', 'o_pokhara', 'Beaten rice (chiura) 25 kg', 'Rice & Grains', 'bag', 2100, 1, []],
  ['PS-RCE-03', 'o_pokhara', 'Jeera Masino rice 25 kg', 'Rice & Grains', 'bag', 2450, 1, [[10, 2390]]],
  ['PS-DAL-02', 'o_pokhara', 'Chana dal 25 kg', 'Pulses (Dal)', 'bag', 3300, 1, []],
  ['PS-DAL-03', 'o_pokhara', 'Moong dal 25 kg', 'Pulses (Dal)', 'bag', 4450, 1, []],
  ['PS-SGR-02', 'o_pokhara', 'Sugar 50 kg', 'Sugar & Salt', 'sack', 5190, 1, [[5, 5100]]],
  ['PS-OIL-04', 'o_pokhara', 'Sunflower oil 5 L', 'Oil & Ghee', 'jar', 1475, 4, []],
  ['PS-ATA-01', 'o_pokhara', 'Wheat flour (atta) 50 kg', 'Flour', 'sack', 3250, 1, []],
  ['LW-RCE-01', 'o_lumbini', 'Basmati rice 25 kg', 'Rice & Grains', 'bag', 3120, 2, [[10, 3050]]],
  ['LW-SGR-01', 'o_lumbini', 'Sugar 50 kg', 'Sugar & Salt', 'sack', 5170, 1, []],
  ['LW-NDL-01', 'o_lumbini', 'Veg instant noodles (carton of 30)', 'Noodles & Snacks', 'carton', 560, 5, [[20, 540]], 'Buy 20 cartons, get 1 free'],
]

type Pay = 'esewa' | 'khalti' | 'qr' | 'unpaid' | 'proof' | `udharo:${number}`
// no, retailer, supplier, days ago, lines, status, payment
const ORDERS: [number, string, string, number, [string, number][], OrderStatus, Pay][] = [
  [1001, 'o_ram', 'o_sita', 168, [['ST-RCE-02', 6], ['ST-SLT-01', 10]], 'delivered', 'esewa'],
  [1002, 'o_sajha', 'o_sita', 160, [['ST-SGR-01', 4]], 'delivered', 'qr'],
  [1003, 'o_ram', 'o_himal', 152, [['HD-BSC-01', 10], ['HD-NDL-02', 10]], 'delivered', 'khalti'],
  [1004, 'o_ram', 'o_sita', 135, [['ST-SGR-01', 3], ['ST-NDL-01', 10]], 'delivered', 'esewa'],
  [1005, 'o_sajha', 'o_himal', 130, [['HD-DTG-01', 5]], 'delivered', 'esewa'],
  [1006, 'o_ram', 'o_pokhara', 122, [['PS-DAL-02', 4], ['PS-ATA-01', 3]], 'delivered', 'qr'],
  [1007, 'o_lumbini', 'o_sita', 118, [['ST-RCE-01', 10]], 'delivered', 'esewa'],
  [1008, 'o_ram', 'o_sita', 108, [['ST-RCE-01', 10], ['ST-OIL-02', 5], ['ST-TEA-01', 5]], 'delivered', 'esewa'],
  [1009, 'o_ram', 'o_himal', 100, [['HD-GHE-01', 2], ['HD-OIL-03', 10]], 'delivered', 'khalti'],
  [1010, 'o_sajha', 'o_sita', 95, [['ST-DAL-01', 4], ['ST-SGR-01', 4]], 'delivered', 'qr'],
  [1011, 'o_ram', 'o_lumbini', 90, [['LW-SGR-01', 4]], 'delivered', 'esewa'],
  [1012, 'o_ram', 'o_sita', 78, [['ST-SGR-01', 5], ['ST-SOP-01', 5]], 'delivered', 'qr'],
  [1013, 'o_sajha', 'o_sita', 72, [['ST-RCE-02', 10], ['ST-NDL-01', 25]], 'delivered', 'esewa'],
  [1014, 'o_ram', 'o_pokhara', 65, [['PS-RCE-03', 10]], 'delivered', 'esewa'],
  [1015, 'o_lumbini', 'o_pokhara', 60, [['PS-SGR-02', 5]], 'delivered', 'khalti'],
  [1016, 'o_ram', 'o_sita', 50, [['ST-SGR-01', 8], ['ST-DAL-01', 4], ['ST-RCE-01', 5]], 'delivered', 'esewa'],
  [1017, 'o_ram', 'o_himal', 44, [['HD-DTG-01', 8], ['HD-TEA-02', 4]], 'delivered', 'qr'],
  [1018, 'o_sajha', 'o_sita', 40, [['ST-OIL-01', 12], ['ST-SGR-01', 4]], 'delivered', 'esewa'],
  [1019, 'o_ram', 'o_pokhara', 35, [['PS-DAL-03', 3], ['PS-CHR-01', 6]], 'delivered', 'khalti'],
  [1020, 'o_ram', 'o_lumbini', 30, [['LW-RCE-01', 4], ['LW-NDL-01', 20]], 'delivered', 'esewa'],
  [1021, 'o_lumbini', 'o_sita', 27, [['ST-SGR-01', 6]], 'delivered', 'qr'],
  [1022, 'o_ram', 'o_sita', 21, [['ST-SGR-01', 6], ['ST-TEA-01', 5], ['ST-SLT-01', 12]], 'delivered', 'esewa'],
  [1023, 'o_sajha', 'o_sita', 19, [['ST-RCE-01', 5], ['ST-OIL-02', 5]], 'delivered', 'qr'],
  [1024, 'o_ram', 'o_himal', 17, [['HD-DTG-01', 6], ['HD-BSC-02', 6]], 'delivered', 'khalti'],
  [1025, 'o_lumbini', 'o_sita', 15, [['ST-NDL-01', 25]], 'delivered', 'udharo:-2'],
  [1026, 'o_ram', 'o_pokhara', 13, [['PS-RCE-03', 6], ['PS-DAL-02', 3]], 'delivered', 'esewa'],
  [1027, 'o_sajha', 'o_himal', 11, [['HD-NDL-02', 20], ['HD-OIL-03', 4]], 'delivered', 'udharo:19'],
  [1028, 'o_ram', 'o_lumbini', 9, [['LW-SGR-01', 4]], 'delivered', 'esewa'],
  [1029, 'o_ram', 'o_himal', 7, [['HD-GHE-01', 1], ['HD-OIL-03', 2], ['HD-BSC-01', 4]], 'delivered', 'udharo:6'],
  [1030, 'o_ram', 'o_sita', 3, [['ST-RCE-02', 5], ['ST-OIL-02', 3]], 'dispatched', 'esewa'],
  [1031, 'o_ram', 'o_pokhara', 2, [['PS-RCE-03', 4], ['PS-ATA-01', 2]], 'packed', 'unpaid'],
  [1032, 'o_ram', 'o_sita', 1, [['ST-DAL-01', 2], ['ST-SLT-01', 15]], 'accepted', 'unpaid'],
  [1033, 'o_ram', 'o_himal', 0.2, [['HD-DTG-02', 4], ['HD-TEA-02', 2], ['HD-NDL-02', 10]], 'pending', 'unpaid'],
  [1034, 'o_ram', 'o_pokhara', 5, [['PS-OIL-04', 4]], 'rejected', 'unpaid'],
  [1035, 'o_sajha', 'o_sita', 0.15, [['ST-SGR-01', 4], ['ST-RCE-02', 5]], 'pending', 'unpaid'],
  [1036, 'o_sajha', 'o_himal', 4, [['HD-BSC-01', 10], ['HD-DTG-01', 2]], 'dispatched', 'khalti'],
  [1037, 'o_sajha', 'o_sita', 1.2, [['ST-OIL-02', 5], ['ST-DAL-01', 2]], 'accepted', 'proof'],
  [1038, 'o_lumbini', 'o_pokhara', 2, [['PS-SGR-02', 5]], 'accepted', 'unpaid'],
  [1039, 'o_lumbini', 'o_sita', 1, [['ST-TEA-01', 5]], 'accepted', 'unpaid'],
]

// sku, name, category, unit, qty, threshold, cost, supplier, expiry in days
const RAM_STOCK: [string, string, string, string, number, number, number, string?, number?][] = [
  ['ST-RCE-01', 'Basmati rice 25 kg', 'Rice & Grains', 'bag', 0, 3, 3090, 'o_sita'],
  ['HD-BSC-01', 'Glucose biscuits (carton of 48)', 'Biscuits', 'carton', 0, 4, 930, 'o_himal', 60],
  ['ST-SOP-01', 'Bathing soap 100 g (box of 72)', 'Soap & Detergent', 'carton', 1, 2, 2520, 'o_sita'],
  ['PS-CHR-01', 'Beaten rice (chiura) 25 kg', 'Rice & Grains', 'bag', 1, 3, 2100, 'o_pokhara', 90],
  ['HD-OIL-03', 'Soyabean oil 1 L (box of 10)', 'Oil & Ghee', 'carton', 2, 4, 2150, 'o_himal', 12],
  ['ST-OIL-01', 'Sunflower oil 5 L', 'Oil & Ghee', 'jar', 3, 6, 1460, 'o_sita', 25],
  ['ST-NDL-01', 'Wai Wai noodles (carton of 30)', 'Noodles & Snacks', 'carton', 2, 5, 565, 'o_sita', 180],
  ['HD-BSC-02', 'Cream biscuits assorted (carton of 36)', 'Biscuits', 'carton', 5, 2, 1440, 'o_himal', -3],
  ['LOCAL-EGG', 'Local eggs (crate of 30)', 'Other', 'crate', 6, 2, 480, undefined, 9],
  ['ST-SGR-01', 'Sugar 50 kg', 'Sugar & Salt', 'sack', 8, 4, 5080, 'o_sita'],
  ['ST-DAL-01', 'Masoor dal 25 kg', 'Pulses (Dal)', 'bag', 6, 2, 3820, 'o_sita', 240],
  ['PS-DAL-02', 'Chana dal 25 kg', 'Pulses (Dal)', 'bag', 5, 2, 3300, 'o_pokhara', 150],
  ['HD-DTG-01', 'Detergent powder 1 kg (bag of 20)', 'Soap & Detergent', 'bag', 7, 3, 2300, 'o_himal'],
  ['ST-TEA-01', 'Ilam CTC tea 500 g (box of 20)', 'Tea & Beverages', 'carton', 4, 2, 3400, 'o_sita', 200],
  ['ST-SLT-01', 'Iodised salt 1 kg (bag of 25)', 'Sugar & Salt', 'bag', 12, 5, 520, 'o_sita'],
  ['PS-RCE-03', 'Jeera Masino rice 25 kg', 'Rice & Grains', 'bag', 9, 4, 2450, 'o_pokhara', 120],
]

const OTHER_STOCK: [string, string, number, number][] = [
  ['o_sajha', 'ST-SGR-01', 3, 4], ['o_sajha', 'ST-RCE-02', 12, 5], ['o_sajha', 'ST-OIL-02', 2, 3],
  ['o_sajha', 'HD-NDL-02', 18, 10], ['o_sajha', 'HD-DTG-01', 0, 2], ['o_sajha', 'ST-DAL-01', 5, 2],
  ['o_lumbini', 'ST-TEA-01', 2, 3], ['o_lumbini', 'PS-SGR-02', 9, 4], ['o_lumbini', 'ST-NDL-01', 30, 10],
  ['o_lumbini', 'ST-RCE-01', 4, 5],
]

function tierPrice(p: Product, qty: number) {
  return p.tiers.reduce((price, t) => (qty >= t.min ? t.price : price), p.price)
}

export function buildSeed(nowMs = Date.now()): Db {
  const at = (days: number) => new Date(nowMs - days * DAY).toISOString()
  const passHash = hashPassword(DEMO_PASSWORD)
  const created = at(200)

  const org = (o: Omit<Org, 'createdAt' | 'seed'>): Org => ({ ...o, createdAt: created, seed: true })
  const orgs: Org[] = [
    org({ id: 'o_ram', name: 'Ram Kirana', role: 'retailer', pan: '301245678', city: 'Butwal', address: 'Traffic Chowk, Butwal-8', phone: '9847012345', email: 'ram@ramkirana.com.np' }),
    org({ id: 'o_sajha', name: 'Sajha Kirana Pasal', role: 'retailer', pan: '302456789', city: 'Itahari', address: 'Main Road, Itahari-6', phone: '9842023456', email: 'gita@sajhakirana.com.np' }),
    org({
      id: 'o_sita', name: 'Sita Traders', role: 'supplier', pan: '600123456', city: 'Butwal', address: 'Golpark, Butwal-4', phone: '9857011223', email: 'sita@sitatraders.com.np',
      supplier: { esewaId: 'EPAYSITA4410', khaltiId: 'KHL-SITA-2210', bank: 'Nabil Bank, Butwal Branch\nA/C 0410017500123\nSita Traders', modes: ['van', 'bilti', 'pickup'], creditDays: 15, deliveryNote: 'Own van inside Butwal by next morning. Outside Butwal by transport bilti.' },
    }),
    org({
      id: 'o_himal', name: 'Himalayan Distributors', role: 'supplier', pan: '601234567', city: 'Kathmandu', address: 'Teku, Kathmandu-12', phone: '9851034567', email: 'orders@himalayandist.com.np',
      supplier: { esewaId: 'EPAYHIMAL7781', khaltiId: 'KHL-HIMAL-9034', bank: 'Global IME Bank, Teku Branch\nA/C 21007010045678\nHimalayan Distributors Pvt. Ltd.', modes: ['bilti'], creditDays: 30, deliveryNote: 'Dispatch by transport within 2 working days. Bilti number shared on dispatch.' },
    }),
    org({
      id: 'o_pokhara', name: 'Pokhara Suppliers', role: 'supplier', pan: '602345678', city: 'Pokhara', address: 'Prithvi Chowk, Pokhara-9', phone: '9856045678', email: 'maya@pokharasuppliers.com.np',
      supplier: { esewaId: 'EPAYPKR3302', khaltiId: '', bank: 'NIC Asia Bank, Prithvi Chowk Branch\nA/C 5523001987654\nPokhara Suppliers', modes: ['bilti', 'pickup'], creditDays: 0, deliveryNote: 'Payment before dispatch. Goods leave Pokhara every morning.' },
    }),
    org({
      id: 'o_lumbini', name: 'Lumbini Wholesale & Mart', role: 'both', pan: '603456789', city: 'Butwal', address: 'Milan Chowk, Butwal-11', phone: '9867056789', email: 'hari@lumbiniwholesale.com.np',
      supplier: { esewaId: 'EPAYLUMB5567', khaltiId: 'KHL-LUMB-1180', bank: 'Siddhartha Bank, Milan Chowk Branch\nA/C 00915087654\nLumbini Wholesale & Mart', modes: ['van', 'pickup'], creditDays: 7, deliveryNote: 'Free van delivery inside Butwal for orders above Rs 10,000.' },
    }),
  ]

  const user = (id: string, orgId: string, name: string, email: string, phone: string, role: User['role'] = 'owner'): User => ({
    id, orgId, name, email, phone, role, active: true, passHash, createdAt: created,
  })
  const users: User[] = [
    user('u_ram', 'o_ram', 'Ram Bahadur Thapa', 'ram@ramkirana.com.np', '9847012345'),
    user('u_bikash', 'o_ram', 'Bikash Thapa', 'bikash@ramkirana.com.np', '9847012346', 'staff'),
    user('u_gita', 'o_sajha', 'Gita Rai', 'gita@sajhakirana.com.np', '9842023456'),
    user('u_sita', 'o_sita', 'Sita Gurung', 'sita@sitatraders.com.np', '9857011223'),
    user('u_dipak', 'o_sita', 'Dipak Gurung', 'dipak@sitatraders.com.np', '9857011224', 'manager'),
    user('u_suresh', 'o_himal', 'Suresh Shrestha', 'orders@himalayandist.com.np', '9851034567'),
    user('u_maya', 'o_pokhara', 'Maya Poudel', 'maya@pokharasuppliers.com.np', '9856045678'),
    user('u_hari', 'o_lumbini', 'Hari Prasad Sharma', 'hari@lumbiniwholesale.com.np', '9867056789'),
  ]

  const links = [
    ['o_ram', 'o_sita'], ['o_ram', 'o_himal'], ['o_ram', 'o_pokhara'], ['o_ram', 'o_lumbini'],
    ['o_sajha', 'o_sita'], ['o_sajha', 'o_himal'], ['o_lumbini', 'o_sita'], ['o_lumbini', 'o_pokhara'],
  ].map(([retailerId, supplierId]) => ({ retailerId, supplierId, createdAt: created }))

  const products: Product[] = CATALOG.map(([sku, supplierId, name, category, unit, price, moq, tiers, scheme]) => ({
    id: `p_${sku.toLowerCase()}`, supplierId, name, sku, category, unit, price, moq,
    tiers: tiers.map(([min, p]) => ({ min, price: p })), scheme: scheme ?? '', available: true, archived: false,
  }))
  const bySku = new Map(products.map((p) => [p.sku, p]))
  const orgName = new Map(orgs.map((o) => [o.id, o.name]))

  const items: Item[] = RAM_STOCK.map(([sku, name, category, unit, qty, threshold, cost, supplierId, expiryIn]) => ({
    id: `i_ram_${sku.toLowerCase()}`, retailerId: 'o_ram', name, sku, category, unit, qty, threshold, cost,
    expiry: expiryIn === undefined ? undefined : addDays(nowMs, expiryIn), supplierId,
    productId: bySku.get(sku)?.id, alert: true, updatedAt: at(1),
  }))
  for (const [retailerId, sku, qty, threshold] of OTHER_STOCK) {
    const p = bySku.get(sku)!
    items.push({
      id: `i_${retailerId.slice(2)}_${sku.toLowerCase()}`, retailerId, name: p.name, sku, category: p.category, unit: p.unit,
      qty, threshold, cost: p.price, supplierId: p.supplierId, productId: p.id, alert: true, updatedAt: at(2),
    })
  }

  const orders: Order[] = []
  const shipments: Shipment[] = []
  const payments: Payment[] = []
  const receipts: Receipt[] = []
  let receiptNo = 5000
  const drivers = ['Bishnu Thapa', 'Krishna BK', 'Santosh Pun']
  const transports = ['Lumbini Yatayat Transport', 'Shree Yatayat Transport', 'Pokhara Cargo Sewa']

  for (const [no, retailerId, supplierId, daysAgo, rawLines, status, pay] of ORDERS) {
    const start = nowMs - daysAgo * DAY
    const lines = rawLines.map(([sku, qty]) => {
      const p = bySku.get(sku)!
      const price = tierPrice(p, qty)
      return { productId: p.id, name: p.name, sku, unit: p.unit, qty, price, amount: price * qty }
    })
    const total = lines.reduce((sum, l) => sum + l.amount, 0)
    const reached = status === 'rejected' ? 0 : FLOW.indexOf(status)
    const stepAt = (i: number) => new Date(Math.min(start + STEP_HOURS[i] * HOUR, nowMs - (reached - i) * 60_000)).toISOString()
    const history = FLOW.slice(0, reached + 1).map((s, i) => ({
      status: s, at: stepAt(i), by: orgName.get(s === 'pending' || s === 'delivered' ? retailerId : supplierId)!,
    }))
    if (status === 'rejected') history.push({ status: 'rejected', at: stepAt(0), by: orgName.get(supplierId)! })

    const paid = pay === 'esewa' || pay === 'khalti' || pay === 'qr'
    const order: Order = {
      id: `o_${no}`, no: `FS-${no}`, retailerId, supplierId, lines, total, note: no === 1033 ? 'Please send with the Friday lot.' : '',
      status, history, payStatus: paid ? 'paid' : pay === 'proof' ? 'proof' : pay.startsWith('udharo') ? 'udharo' : 'unpaid',
      payMethod: paid ? pay : undefined, createdAt: stepAt(0),
      rejectReason: status === 'rejected' ? 'Sunflower oil is out of stock until next week.' : undefined,
    }
    if (pay.startsWith('udharo')) order.udharo = { amount: total, due: addDays(nowMs, Number(pay.split(':')[1])) }
    orders.push(order)

    if (reached >= 3) {
      const sup = orgs.find((o) => o.id === supplierId)!
      const sameCity = sup.city === orgs.find((o) => o.id === retailerId)!.city
      const mode: DeliveryMode = sameCity && sup.supplier!.modes.includes('van') ? 'van' : 'bilti'
      shipments.push({
        id: `s_${no}`, orderId: order.id, mode,
        carrier: mode === 'van' ? drivers[no % 3] : transports[no % 3],
        ref: mode === 'van' ? 'Lu 2 Kha 4120' : `BL-${1012 + no}`,
        note: '', dispatchedAt: stepAt(3), deliveredAt: reached >= 4 ? stepAt(4) : undefined,
      })
    }
    if (paid) {
      const prefix = pay === 'esewa' ? 'ESW' : pay === 'khalti' ? 'KHL' : 'QR'
      const ref = `${prefix}-${(no * 7919).toString(16).toUpperCase()}`
      payments.push({ id: `pay_${no}`, orderId: order.id, method: pay, amount: total, ref, status: 'verified', createdAt: stepAt(1), verifiedAt: stepAt(1) })
      receipts.push({ id: `r_${++receiptNo}`, no: `RC-${receiptNo}`, orderId: order.id, kind: 'payment', amount: total, paid: true, method: pay, ref, issuedAt: stepAt(1) })
    } else if (status === 'delivered') {
      receipts.push({ id: `r_${++receiptNo}`, no: `RC-${receiptNo}`, orderId: order.id, kind: 'delivery', amount: total, paid: false, method: 'udharo', issuedAt: stepAt(4) })
    }
    if (pay === 'proof') {
      payments.push({ id: `pay_${no}`, orderId: order.id, method: 'qr', amount: total, ref: 'QR-8037', status: 'submitted', note: 'Sent from Nabil mobile banking.', proofUrl: '/demo/payment-proof.svg', createdAt: at(0.5) })
    }
  }

  const ramItem = (sku: string) => items.find((i) => i.retailerId === 'o_ram' && i.sku === sku)!
  const move = (id: number, sku: string, type: MoveType, delta: number, balance: number, daysAgo: number, by = 'Ram Bahadur Thapa', note?: string): Movement => ({
    id: `m_seed_${id}`, retailerId: 'o_ram', itemId: ramItem(sku).id, name: ramItem(sku).name, type, delta, balance, note, by, at: at(daysAgo),
  })
  const movements: Movement[] = [
    move(1, 'ST-NDL-01', 'sold', -1, 2, 0.42, 'Bikash Thapa'),
    move(2, 'ST-SOP-01', 'sold', -1, 1, 1, 'Bikash Thapa'),
    move(3, 'HD-BSC-02', 'damaged', -1, 5, 2, 'Ram Bahadur Thapa', 'Carton crushed in the store room'),
    move(4, 'ST-RCE-01', 'sold', -2, 0, 2.2),
    move(5, 'HD-BSC-01', 'sold', -2, 0, 3, 'Bikash Thapa'),
    move(6, 'ST-OIL-01', 'sold', -2, 3, 4),
    move(7, 'ST-SGR-01', 'counted', -1, 8, 5, 'Ram Bahadur Thapa', 'Monthly stock count'),
    move(8, 'HD-OIL-03', 'received', 2, 4, 6, 'Ram Bahadur Thapa', 'FS-1029 delivered'),
    move(9, 'PS-CHR-01', 'sold', -3, 1, 8, 'Bikash Thapa'),
    move(10, 'ST-TEA-01', 'received', 5, 6, 20, 'Ram Bahadur Thapa', 'FS-1022 delivered'),
    move(11, 'ST-SLT-01', 'returned', -2, 12, 15, 'Ram Bahadur Thapa', 'RT-11 approved'),
  ]

  const db: Db = {
    v: DB_VERSION, orgs, users, sessions: [], links, products, items, movements, orders: orders.reverse(), shipments, payments, receipts,
    quotes: [
      {
        id: 'q_301', no: 'QT-301', retailerId: 'o_ram', supplierId: 'o_sita', status: 'requested', createdAt: at(1.5),
        lines: [{ name: 'Bhujiya snack 1 kg (box of 20)', unit: 'carton', qty: 15, target: 1500 }, { name: 'Soya chunks 200 g (box of 40)', unit: 'carton', qty: 8 }],
        note: 'Needed before the wedding season. Weekly order if the rate is right.',
      },
      {
        id: 'q_302', no: 'QT-302', retailerId: 'o_ram', supplierId: 'o_himal', status: 'offered', createdAt: at(4), repliedAt: at(3),
        lines: [{ name: 'Toothpaste 150 g (box of 48)', unit: 'carton', qty: 6, target: 4200, offer: 4350 }],
        note: 'Any brand with at least 12 months expiry.', reply: 'Rs 4,350 per carton for 6. Rs 4,250 if you take 10.',
      },
    ],
    schedules: [
      { id: 'sc_1', retailerId: 'o_ram', supplierId: 'o_sita', name: 'Weekly staples', freq: 'weekly', day: 0, time: '08:00', active: true, createdAt: at(60), lastRun: at(7), lines: [{ productId: 'p_st-rce-01', qty: 5 }, { productId: 'p_st-sgr-01', qty: 2 }, { productId: 'p_st-ndl-01', qty: 10 }] },
      { id: 'sc_2', retailerId: 'o_ram', supplierId: 'o_himal', name: 'Monthly soap and detergent', freq: 'monthly', day: 1, time: '09:00', active: false, createdAt: at(45), lines: [{ productId: 'p_hd-dtg-01', qty: 5 }, { productId: 'p_hd-dtg-02', qty: 2 }] },
    ],
    returns: [
      { id: 'rt_11', no: 'RT-11', orderId: 'o_1022', retailerId: 'o_ram', supplierId: 'o_sita', status: 'approved', amount: 1040, reason: 'Two salt bags were torn in transit.', reply: 'Agreed. Credit note of Rs 1,040 against your next order.', createdAt: at(18), resolvedAt: at(15), lines: [{ name: 'Iodised salt 1 kg (bag of 25)', sku: 'ST-SLT-01', unit: 'bag', qty: 2, price: 520 }] },
      { id: 'rt_12', no: 'RT-12', orderId: 'o_1024', retailerId: 'o_ram', supplierId: 'o_himal', status: 'requested', amount: 1440, reason: 'One carton arrived crushed and the biscuits are broken.', createdAt: at(2), lines: [{ name: 'Cream biscuits assorted (carton of 36)', sku: 'HD-BSC-02', unit: 'carton', qty: 1, price: 1440 }] },
    ],
    notices: [
      { id: 'n_1', orgId: 'o_ram', ws: 'retailer', text: 'Sita Traders accepted FS-1032. You can pay now.', href: '/retailer/orders/o_1032', read: false, at: at(0.9) },
      { id: 'n_2', orgId: 'o_ram', ws: 'retailer', text: 'FS-1030 is on the way by own van.', href: '/retailer/orders/o_1030', read: false, at: at(2.5) },
      { id: 'n_3', orgId: 'o_ram', ws: 'retailer', text: 'Himalayan Distributors sent a price for QT-302.', href: '/retailer/orders/quotes', read: false, at: at(3) },
      { id: 'n_4', orgId: 'o_ram', ws: 'retailer', text: 'Basmati rice 25 kg is out of stock.', href: '/retailer/inventory?filter=out', read: true, at: at(2.2) },
      { id: 'n_5', orgId: 'o_sita', ws: 'supplier', text: 'New order FS-1035 from Sajha Kirana Pasal.', href: '/supplier/orders/o_1035', read: false, at: at(0.15) },
      { id: 'n_6', orgId: 'o_sita', ws: 'supplier', text: 'Payment proof for FS-1037 is waiting for you to check.', href: '/supplier/payments', read: false, at: at(0.5) },
      { id: 'n_7', orgId: 'o_sita', ws: 'supplier', text: 'Ram Kirana asked for a quote (QT-301).', href: '/supplier/quotes', read: false, at: at(1.5) },
      { id: 'n_8', orgId: 'o_sita', ws: 'supplier', text: 'Udharo for FS-1025 is overdue.', href: '/supplier/udharo', read: false, at: at(1) },
      { id: 'n_9', orgId: 'o_himal', ws: 'supplier', text: 'New order FS-1033 from Ram Kirana.', href: '/supplier/orders/o_1033', read: false, at: at(0.2) },
      { id: 'n_10', orgId: 'o_himal', ws: 'supplier', text: 'Ram Kirana asked to return goods from FS-1024.', href: '/supplier/returns', read: false, at: at(2) },
      { id: 'n_11', orgId: 'o_lumbini', ws: 'retailer', text: 'Sita Traders accepted FS-1039. You can pay now.', href: '/retailer/orders/o_1039', read: false, at: at(0.8) },
      { id: 'n_12', orgId: 'o_lumbini', ws: 'retailer', text: 'Udharo for FS-1025 is overdue.', href: '/retailer/udharo', read: false, at: at(1) },
    ],
    audit: [
      { id: 'a_1', orgId: 'o_ram', ws: 'retailer', by: 'Ram Bahadur Thapa', text: 'Placed order FS-1033 with Himalayan Distributors', at: at(0.2) },
      { id: 'a_2', orgId: 'o_ram', ws: 'retailer', by: 'Bikash Thapa', text: 'Recorded 1 carton sold: Wai Wai noodles (carton of 30)', at: at(0.42) },
      { id: 'a_3', orgId: 'o_ram', ws: 'retailer', by: 'Ram Bahadur Thapa', text: 'Asked Himalayan Distributors to take back goods from FS-1024', at: at(2) },
      { id: 'a_4', orgId: 'o_ram', ws: 'retailer', by: 'Ram Bahadur Thapa', text: 'Paid FS-1030 by eSewa', at: at(2.8) },
      { id: 'a_5', orgId: 'o_ram', ws: 'retailer', by: 'Ram Bahadur Thapa', text: 'Added Bikash Thapa to the team as Staff', at: at(40) },
      { id: 'a_6', orgId: 'o_sita', ws: 'supplier', by: 'Sita Gurung', text: 'Accepted order FS-1039 from Lumbini Wholesale & Mart', at: at(0.9) },
      { id: 'a_7', orgId: 'o_sita', ws: 'supplier', by: 'Dipak Gurung', text: 'Dispatched FS-1030 by own van', at: at(2.5) },
      { id: 'a_8', orgId: 'o_sita', ws: 'supplier', by: 'Sita Gurung', text: 'Approved return RT-11 from Ram Kirana', at: at(15) },
      { id: 'a_9', orgId: 'o_sita', ws: 'supplier', by: 'Sita Gurung', text: 'Updated the price of Sugar 50 kg', at: at(22) },
    ],
    carts: {},
    files: {},
    seq: { order: 1040, receipt: receiptNo + 1, quote: 303, ret: 13, id: 1 },
  }
  return db
}
