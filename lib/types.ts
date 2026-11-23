export type Role = 'retailer' | 'supplier' | 'both'
export type Workspace = 'retailer' | 'supplier'
export type TeamRole = 'owner' | 'manager' | 'staff'
export type DeliveryMode = 'van' | 'bilti' | 'pickup'
export type OrderStatus = 'pending' | 'accepted' | 'packed' | 'dispatched' | 'delivered' | 'rejected' | 'cancelled'
export type PayStatus = 'unpaid' | 'proof' | 'udharo' | 'paid'
export type PayMethod = 'esewa' | 'khalti' | 'qr' | 'udharo' | 'cash'
export type MoveType = 'sold' | 'added' | 'received' | 'damaged' | 'expired' | 'removed' | 'counted' | 'returned'

export interface SupplierConfig {
  esewaId: string
  khaltiId: string
  bank: string
  modes: DeliveryMode[]
  creditDays: number
  deliveryNote: string
}

export interface Org {
  id: string
  name: string
  role: Role
  pan: string
  city: string
  address: string
  phone: string
  email: string
  createdAt: string
  seed?: boolean
  supplier?: SupplierConfig
}

export interface User {
  id: string
  orgId: string
  name: string
  email: string
  phone: string
  role: TeamRole
  active: boolean
  passHash: string
  createdAt: string
}

export interface Session {
  hash: string
  userId: string
  ws?: Workspace
  expires: number
}

export interface Link {
  retailerId: string
  supplierId: string
  createdAt: string
}

export interface Tier {
  min: number
  price: number
}

export interface Product {
  id: string
  supplierId: string
  name: string
  sku: string
  category: string
  unit: string
  price: number
  moq: number
  tiers: Tier[]
  scheme: string
  available: boolean
  archived: boolean
}

export interface Item {
  id: string
  retailerId: string
  name: string
  sku: string
  category: string
  unit: string
  qty: number
  threshold: number
  cost: number
  expiry?: string
  supplierId?: string
  productId?: string
  alert: boolean
  updatedAt: string
}

export interface Movement {
  id: string
  retailerId: string
  itemId: string
  name: string
  type: MoveType
  delta: number
  balance: number
  note?: string
  by: string
  at: string
}

export interface OrderLine {
  productId?: string
  name: string
  sku: string
  unit: string
  qty: number
  price: number
  amount: number
}

export interface Order {
  id: string
  no: string
  retailerId: string
  supplierId: string
  lines: OrderLine[]
  total: number
  note: string
  status: OrderStatus
  history: { status: OrderStatus; at: string; by: string }[]
  payStatus: PayStatus
  payMethod?: PayMethod
  udharo?: { amount: number; due: string; settledAt?: string }
  rejectReason?: string
  createdAt: string
}

export interface Shipment {
  id: string
  orderId: string
  mode: DeliveryMode
  carrier: string
  ref: string
  note: string
  photoUrl?: string
  dispatchedAt: string
  deliveredAt?: string
}

export interface Payment {
  id: string
  orderId: string
  method: 'esewa' | 'khalti' | 'qr' | 'cash'
  amount: number
  ref: string
  status: 'initiated' | 'complete' | 'cancelled' | 'submitted' | 'verified' | 'rejected'
  note?: string
  reason?: string
  proofUrl?: string
  createdAt: string
  verifiedAt?: string
}

export interface Receipt {
  id: string
  no: string
  orderId: string
  kind: 'delivery' | 'payment'
  amount: number
  paid: boolean
  method?: PayMethod
  ref?: string
  issuedAt: string
}

export interface QuoteLine {
  name: string
  unit: string
  qty: number
  target?: number
  offer?: number
}

export interface Quote {
  id: string
  no: string
  retailerId: string
  supplierId: string
  lines: QuoteLine[]
  note: string
  status: 'requested' | 'offered' | 'accepted' | 'declined'
  reply?: string
  orderId?: string
  createdAt: string
  repliedAt?: string
}

export interface Schedule {
  id: string
  retailerId: string
  supplierId: string
  name: string
  lines: { productId: string; qty: number }[]
  freq: 'weekly' | 'monthly'
  day: number
  time: string
  active: boolean
  lastRun?: string
  createdAt: string
}

export interface ReturnReq {
  id: string
  no: string
  orderId: string
  retailerId: string
  supplierId: string
  lines: { name: string; sku: string; unit: string; qty: number; price: number }[]
  amount: number
  reason: string
  status: 'requested' | 'approved' | 'rejected'
  reply?: string
  createdAt: string
  resolvedAt?: string
}

export interface Notice {
  id: string
  orgId: string
  ws: Workspace
  text: string
  href: string
  read: boolean
  at: string
}

export interface Audit {
  id: string
  orgId: string
  ws: Workspace
  by: string
  text: string
  at: string
}

export interface CartLine {
  productId: string
  qty: number
}

export interface Db {
  v: number
  orgs: Org[]
  users: User[]
  sessions: Session[]
  links: Link[]
  products: Product[]
  items: Item[]
  movements: Movement[]
  orders: Order[]
  shipments: Shipment[]
  payments: Payment[]
  receipts: Receipt[]
  quotes: Quote[]
  schedules: Schedule[]
  returns: ReturnReq[]
  notices: Notice[]
  audit: Audit[]
  carts: Record<string, CartLine[]>
  files: Record<string, string>
  seq: { order: number; receipt: number; quote: number; ret: number; id: number }
}

/** A business as other businesses see it. Contact details are blank until the two are linked. */
export interface Partner {
  id: string
  name: string
  role: Role
  city: string
  linked: boolean
  address: string
  pan: string
  phone: string
  email: string
  modes: DeliveryMode[]
  creditDays: number
  deliveryNote: string
  hasEsewa: boolean
  hasKhalti: boolean
  hasQr: boolean
  bank: string
}

export interface TeamMember {
  id: string
  name: string
  email: string
  phone: string
  role: TeamRole
  active: boolean
  createdAt: string
}

/** Everything one workspace needs, scoped to the signed-in business on the server. */
export interface AppState {
  ws: Workspace
  now: string
  demo: boolean
  canSwitch: boolean
  canReset: boolean
  user: TeamMember
  org: Org & { hasQr: boolean }
  partners: Partner[]
  directory: Partner[]
  products: Product[]
  items: Item[]
  movements: Movement[]
  cart: CartLine[]
  schedules: Schedule[]
  orders: Order[]
  shipments: Shipment[]
  payments: Payment[]
  receipts: Receipt[]
  quotes: Quote[]
  returns: ReturnReq[]
  team: TeamMember[]
  notices: Notice[]
  audit: Audit[]
}

export const CITIES = [
  'Kathmandu', 'Lalitpur', 'Bhaktapur', 'Pokhara', 'Butwal', 'Bhairahawa', 'Itahari', 'Biratnagar', 'Dharan',
  'Birgunj', 'Hetauda', 'Bharatpur', 'Nepalgunj', 'Dhangadhi', 'Janakpur', 'Damak', 'Birtamod', 'Tansen',
  'Ghorahi', 'Tulsipur',
] as const

export const CATEGORIES = [
  'Rice & Grains', 'Pulses (Dal)', 'Oil & Ghee', 'Sugar & Salt', 'Flour', 'Noodles & Snacks', 'Biscuits',
  'Soap & Detergent', 'Tea & Beverages', 'Other',
] as const

export const UNITS = ['bag', 'sack', 'carton', 'jar', 'crate', 'box', 'packet', 'piece', 'kg', 'litre'] as const

export const MODE_LABEL: Record<DeliveryMode, string> = {
  van: 'Own van',
  bilti: 'Transport (bilti)',
  pickup: 'Pickup',
}

export const METHOD_LABEL: Record<PayMethod, string> = {
  esewa: 'eSewa',
  khalti: 'Khalti',
  qr: 'QR / Bank transfer',
  udharo: 'Udharo',
  cash: 'Cash',
}
