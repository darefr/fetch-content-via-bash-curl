'use client'

import { ArrowLeftRight, ArrowRight, Check, Eye, EyeOff, Info, Store, Warehouse, type LucideIcon } from 'lucide-react'
import Image from 'next/image'
import Link from 'next/link'
import { useState, type FormEvent, type ReactNode } from 'react'
import { toast } from 'sonner'
import { Brand, Field, ImagePicker } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Spinner } from '@/components/ui/spinner'
import { Textarea } from '@/components/ui/textarea'
import { rpc, RpcError } from '@/lib/client'
import { CITIES, MODE_LABEL, type DeliveryMode, type Role } from '@/lib/types'
import { cn } from '@/lib/utils'

const POINTS = [
  'Low-stock alerts and 1-click reorders',
  'Five clear order stages for both sides',
  'Direct payment by eSewa, Khalti, QR or udharo',
  'Receipts with PAN/VAT for every order',
]

const ROLES: { value: Role; title: string; text: string; icon: LucideIcon; place: string }[] = [
  { value: 'retailer', title: 'Retailer', text: 'I run a shop and buy stock from wholesalers.', icon: Store, place: 'Ram Kirana, Butwal' },
  { value: 'supplier', title: 'Supplier', text: 'I am a wholesaler or distributor selling to shops.', icon: Warehouse, place: 'Sita Traders, Butwal' },
  { value: 'both', title: 'Both', text: 'I buy stock and also supply other shops.', icon: ArrowLeftRight, place: 'Lumbini Wholesale & Mart' },
]

export function AuthFrame({ children }: { children: ReactNode }) {
  return (
    <div className="grid min-h-dvh bg-card lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
      <aside className="hidden flex-col justify-between gap-10 bg-brand-navy p-10 text-brand-navy-foreground lg:sticky lg:top-0 lg:flex lg:h-dvh lg:self-start">
        <Link href="/" aria-label="FeriStock home" className="w-fit rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-sidebar-ring">
          <Brand inverse />
        </Link>
        <div className="flex flex-col gap-5">
          <h2 className="text-3xl leading-tight font-semibold tracking-tight text-balance">Stock, orders and payments for shops and their suppliers.</h2>
          <ul className="flex flex-col gap-3 text-sm text-brand-navy-foreground/90">
            {POINTS.map((point) => (
              <li key={point} className="flex items-center gap-2.5">
                <Check className="size-4 shrink-0" aria-hidden />
                {point}
              </li>
            ))}
          </ul>
        </div>
        <div className="relative aspect-[16/10] w-full overflow-hidden rounded-2xl">
          <Image src="/images/kirana-shop.png" alt="" fill sizes="40vw" className="object-cover object-[50%_72%]" priority />
        </div>
      </aside>
      <div className="flex min-h-dvh flex-col items-center px-4 py-8 lg:py-10">
        <Link href="/" aria-label="FeriStock home" className="mb-8 w-fit self-start rounded-lg outline-none focus-visible:ring-3 focus-visible:ring-ring/50 lg:hidden">
          <Brand />
        </Link>
        <main className="flex w-full flex-1 flex-col items-center justify-center">{children}</main>
        <p className="mt-10 text-xs text-muted-foreground">© 2026 FeriStock · Prototype by FastTech Nepal</p>
      </div>
    </div>
  )
}

function PasswordInput({ id, value, onChange, autoComplete, invalid }: { id: string; value: string; onChange: (v: string) => void; autoComplete: string; invalid?: boolean }) {
  const [shown, setShown] = useState(false)
  return (
    <div className="relative">
      <Input id={id} type={shown ? 'text' : 'password'} value={value} onChange={(e) => onChange(e.target.value)} autoComplete={autoComplete} aria-invalid={invalid || undefined} className="h-10 pr-11" />
      <button type="button" onClick={() => setShown((v) => !v)} aria-pressed={shown} className="absolute top-1/2 right-1 grid size-9 -translate-y-1/2 place-items-center rounded-md text-muted-foreground outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/50">
        {shown ? <EyeOff className="size-4" aria-hidden /> : <Eye className="size-4" aria-hidden />}
        <span className="sr-only">{shown ? 'Hide password' : 'Show password'}</span>
      </button>
    </div>
  )
}

function FormAlert({ children }: { children: ReactNode }) {
  return (
    <p role="alert" className="flex gap-2 rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2.5 text-sm font-medium text-tone-red-ink">
      <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
      {children}
    </p>
  )
}

export function LoginForm({ expired }: { expired?: boolean }) {
  const [id, setId] = useState('')
  const [password, setPassword] = useState('')
  const [busy, setBusy] = useState<string | null>(null)
  const [error, setError] = useState('')

  const enter = async (key: string, action: string, input: object) => {
    setBusy(key)
    setError('')
    try {
      const result = await rpc<{ home: string }>(action, input)
      window.location.assign(result.home)
    } catch (e) {
      setError(e instanceof RpcError ? e.message : 'Could not sign in. Try again.')
      setBusy(null)
    }
  }

  const submit = (e: FormEvent) => {
    e.preventDefault()
    if (!id.trim() || !password) return setError('Enter your email or mobile number and your password.')
    void enter('form', 'auth.login', { id, password })
  }

  return (
    <div className="flex w-full max-w-md flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Sign in to FeriStock</h1>
        <p className="text-sm text-muted-foreground">Use the email or mobile number you registered with.</p>
      </div>
      {expired && !error && (
        <p role="status" className="flex gap-2 rounded-lg border border-tone-blue-line bg-tone-blue-soft px-3 py-2.5 text-sm font-medium text-tone-blue-ink">
          <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
          Your session ended. Sign in again to carry on.
        </p>
      )}
      {error && <FormAlert>{error}</FormAlert>}
      <form onSubmit={submit} className="flex flex-col gap-4" noValidate>
        <Field label="Email or mobile number" htmlFor="login-id">
          <Input id="login-id" value={id} onChange={(e) => setId(e.target.value)} placeholder="you@shop.com or 98XXXXXXXX" autoComplete="username" className="h-10" />
        </Field>
        <div className="flex flex-col gap-1.5">
          <div className="flex items-center justify-between gap-2">
            <label htmlFor="login-password" className="text-sm font-medium">Password</label>
            <Link href="/forgot-password" className="text-sm font-medium text-primary hover:underline">Forgot password?</Link>
          </div>
          <PasswordInput id="login-password" value={password} onChange={setPassword} autoComplete="current-password" />
        </div>
        <Button type="submit" disabled={busy !== null} className="h-10 w-full">
          {busy === 'form' && <Spinner data-icon="inline-start" />}
          Sign in
        </Button>
      </form>
      <p className="text-center text-sm text-muted-foreground">
        {'New to FeriStock? '}
        <Link href="/register" className="font-semibold text-primary hover:underline">Create account</Link>
      </p>
      <section aria-labelledby="demo-title" className="flex flex-col gap-3 rounded-xl border bg-background p-4">
        <div>
          <h2 id="demo-title" className="text-sm font-semibold">Try a demo account</h2>
          <p className="text-sm text-muted-foreground">Sample businesses with stock, orders and payments already in place.</p>
        </div>
        <div className="flex flex-col gap-2">
          {ROLES.map((role) => (
            <button
              key={role.value}
              type="button"
              disabled={busy !== null}
              onClick={() => enter(role.value, 'auth.demo', { role: role.value })}
              className="flex min-h-14 items-center gap-3 rounded-lg border bg-card px-3 text-left outline-none transition-colors hover:border-primary/50 hover:bg-accent focus-visible:ring-3 focus-visible:ring-ring/50 disabled:opacity-60"
            >
              <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-sky text-sky-foreground">
                {busy === role.value ? <Spinner /> : <role.icon className="size-4" aria-hidden />}
              </span>
              <span className="flex min-w-0 flex-1 flex-col">
                <span className="text-sm font-semibold">{role.title}</span>
                <span className="truncate text-sm text-muted-foreground">{role.place}</span>
              </span>
              <ArrowRight className="size-4 shrink-0 text-muted-foreground" aria-hidden />
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

const BLANK = {
  ownerName: '', name: '', pan: '', city: '', address: '', phone: '', email: '', password: '',
  esewaId: '', khaltiId: '', bank: '', creditDays: '15', deliveryNote: '',
}

export function RegisterForm({ initialRole }: { initialRole?: Role }) {
  const [role, setRole] = useState<Role>(initialRole ?? 'retailer')
  const [form, setForm] = useState(BLANK)
  const [modes, setModes] = useState<DeliveryMode[]>(['van', 'bilti', 'pickup'])
  const [qr, setQr] = useState<string | null>(null)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [formError, setFormError] = useState('')
  const [busy, setBusy] = useState(false)
  const supplier = role !== 'retailer'
  const set = (key: keyof typeof BLANK) => (value: string) => setForm((f) => ({ ...f, [key]: value }))

  const validate = () => {
    const found: Record<string, string> = {}
    if (form.ownerName.trim().length < 2) found.ownerName = 'Enter your full name.'
    if (form.name.trim().length < 2) found.name = 'Enter your business name.'
    if (!/^\d{9}$/.test(form.pan.trim())) found.pan = 'PAN / VAT number must be exactly 9 digits.'
    if (!form.city) found.city = 'Choose your city.'
    if (form.address.trim().length < 3) found.address = 'Enter your tole and ward.'
    if (!/^9[678]\d{8}$/.test(form.phone.replace(/[\s-]/g, ''))) found.phone = 'Enter a 10-digit mobile number starting with 98, 97 or 96.'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(form.email.trim())) found.email = 'Enter a valid email address.'
    if (form.password.length < 8) found.password = 'Use at least 8 characters.'
    if (supplier) {
      if (!form.esewaId.trim() && !form.khaltiId.trim() && !form.bank.trim() && !qr) found.esewaId = 'Add at least one way for shops to pay you: eSewa, Khalti, bank details or a QR.'
      if (modes.length === 0) found.modes = 'Choose at least one delivery mode.'
      if (!/^\d{1,2}$/.test(form.creditDays.trim())) found.creditDays = 'Enter a number of days from 0 to 90.'
    }
    return found
  }

  const submit = async (e: FormEvent) => {
    e.preventDefault()
    const found = validate()
    setErrors(found)
    setFormError(Object.keys(found).length ? 'Some details need fixing before the account can be created.' : '')
    if (Object.keys(found).length) return
    setBusy(true)
    try {
      const result = await rpc<{ home: string }>('auth.register', { ...form, role, modes, qr: qr ?? undefined, creditDays: Number(form.creditDays) })
      window.location.assign(result.home)
    } catch (error) {
      const failure = error instanceof RpcError ? error : new RpcError('Could not create the account. Try again.', 0)
      setFormError(failure.message)
      if (failure.field) setErrors({ [failure.field]: failure.message })
      setBusy(false)
    }
  }

  const input = (key: keyof typeof BLANK, props: React.ComponentProps<typeof Input> = {}) => (
    <Input id={`reg-${key}`} value={form[key]} onChange={(e) => set(key)(e.target.value)} aria-invalid={errors[key] ? true : undefined} className="h-10" {...props} />
  )

  return (
    <form onSubmit={submit} noValidate className="flex w-full max-w-2xl flex-col gap-6">
      <div className="flex flex-col gap-1">
        <h1 className="text-2xl font-semibold tracking-tight">Create your FeriStock account</h1>
        <p className="text-sm text-muted-foreground">You fill in your own business details. It takes about two minutes.</p>
      </div>
      {formError && <FormAlert>{formError}</FormAlert>}

      <fieldset className="flex flex-col gap-2">
        <legend className="mb-2 text-sm font-semibold">How will you use FeriStock?</legend>
        <div className="grid gap-2 sm:grid-cols-3">
          {ROLES.map((r) => {
            const active = r.value === role
            return (
              <label key={r.value} className={cn('flex cursor-pointer flex-col gap-2 rounded-xl border p-3 transition-colors has-focus-visible:ring-3 has-focus-visible:ring-ring/50', active ? 'border-primary bg-accent' : 'bg-card hover:bg-muted')}>
                <input type="radio" name="role" value={r.value} checked={active} onChange={() => setRole(r.value)} className="sr-only" />
                <span className={cn('grid size-9 place-items-center rounded-lg', active ? 'bg-primary text-primary-foreground' : 'bg-muted text-muted-foreground')}>
                  <r.icon className="size-4" aria-hidden />
                </span>
                <span className="flex flex-col gap-0.5">
                  <span className="text-sm font-semibold">{r.title}</span>
                  <span className="text-sm leading-snug text-muted-foreground">{r.text}</span>
                </span>
              </label>
            )
          })}
        </div>
      </fieldset>

      <fieldset className="flex flex-col gap-4">
        <legend className="mb-3 text-sm font-semibold">Business details</legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Your full name" htmlFor="reg-ownerName" error={errors.ownerName}>{input('ownerName', { autoComplete: 'name' })}</Field>
          <Field label="Business name" htmlFor="reg-name" error={errors.name}>{input('name', { autoComplete: 'organization' })}</Field>
          <Field label="PAN / VAT number" htmlFor="reg-pan" error={errors.pan} hint="9 digits, as on your registration certificate.">{input('pan', { inputMode: 'numeric', maxLength: 9 })}</Field>
          <Field label="City" htmlFor="reg-city" error={errors.city}>
            <NativeSelect id="reg-city" value={form.city} onChange={(e) => set('city')(e.target.value)} aria-invalid={errors.city ? true : undefined} className="w-full [&_select]:h-10">
              <NativeSelectOption value="">Choose a city</NativeSelectOption>
              {CITIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
        </div>
        <Field label="Address" htmlFor="reg-address" error={errors.address}>{input('address', { placeholder: 'Tole, ward', autoComplete: 'street-address' })}</Field>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Mobile number" htmlFor="reg-phone" error={errors.phone}>{input('phone', { placeholder: '98XXXXXXXX', inputMode: 'tel', autoComplete: 'tel' })}</Field>
          <Field label="Email" htmlFor="reg-email" error={errors.email}>{input('email', { type: 'email', autoComplete: 'email' })}</Field>
        </div>
        <Field label="Password" htmlFor="reg-password" error={errors.password} hint="At least 8 characters.">
          <PasswordInput id="reg-password" value={form.password} onChange={set('password')} autoComplete="new-password" invalid={Boolean(errors.password)} />
        </Field>
      </fieldset>

      {supplier && (
        <fieldset className="flex flex-col gap-4 rounded-xl border bg-background p-4">
          <legend className="sr-only">Supplier payment setup</legend>
          <div>
            <h2 className="text-sm font-semibold">Supplier payment setup</h2>
            <p className="text-sm leading-relaxed text-muted-foreground">Shops pay you directly into these accounts. FeriStock never holds the money. You can change this later in Settings.</p>
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="eSewa merchant ID" htmlFor="reg-esewaId" error={errors.esewaId}>{input('esewaId', { className: 'h-10 bg-card' })}</Field>
            <Field label="Khalti merchant ID" htmlFor="reg-khaltiId" error={errors.khaltiId}>{input('khaltiId', { className: 'h-10 bg-card' })}</Field>
          </div>
          <Field label="Bank details" htmlFor="reg-bank" hint="Bank, branch, account number and account name.">
            <Textarea id="reg-bank" value={form.bank} onChange={(e) => set('bank')(e.target.value)} rows={3} className="bg-card" />
          </Field>
          <Field label="Payment QR code" hint="Optional. A photo or screenshot of your bank or wallet QR.">
            <ImagePicker value={qr} onChange={setQr} label="Upload QR image" alt="Your payment QR code" onError={(message) => toast.error(message)} />
          </Field>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-sm font-medium">Delivery modes</legend>
            <div className="flex flex-wrap gap-x-5 gap-y-2">
              {(Object.keys(MODE_LABEL) as DeliveryMode[]).map((mode) => (
                <label key={mode} className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                  <Checkbox checked={modes.includes(mode)} onCheckedChange={(on) => setModes((m) => (on ? [...m, mode] : m.filter((x) => x !== mode)))} />
                  {MODE_LABEL[mode]}
                </label>
              ))}
            </div>
            {errors.modes && <p role="alert" className="text-xs font-medium text-destructive">{errors.modes}</p>}
          </fieldset>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Udharo (credit) days" htmlFor="reg-creditDays" error={errors.creditDays} hint="0 means no credit: shops pay before dispatch.">{input('creditDays', { inputMode: 'numeric', maxLength: 2, className: 'h-10 bg-card' })}</Field>
            <Field label="Delivery note for shops" htmlFor="reg-deliveryNote" hint="Optional. Shown on your supplier page.">{input('deliveryNote', { placeholder: 'Own van inside the city by next morning', className: 'h-10 bg-card' })}</Field>
          </div>
        </fieldset>
      )}

      <div className="flex flex-col gap-4">
        <Button type="submit" disabled={busy} className="h-10 w-full">
          {busy && <Spinner data-icon="inline-start" />}
          {`Create ${role === 'both' ? 'retailer and supplier' : role} account`}
          <ArrowRight data-icon="inline-end" aria-hidden />
        </Button>
        <p className="text-center text-sm text-muted-foreground">
          {'Already have an account? '}
          <Link href="/login" className="font-semibold text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </form>
  )
}
