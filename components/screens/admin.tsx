'use client'

import { Download, History, KeyRound, RotateCcw, UserPlus } from 'lucide-react'
import { useState } from 'react'
import { toast } from 'sonner'
import { AsyncButton, downloadCsv, EmptyState, Field, ImagePicker, Modal, PageHeader, Panel, SearchInput, StatusPill, useConfirm } from '@/components/kit'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
import { Input } from '@/components/ui/input'
import { NativeSelect, NativeSelectOption } from '@/components/ui/native-select'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import { useAct, useApp } from '@/lib/client'
import { ago, fmtDate, fmtDateTime, initials } from '@/lib/format'
import type { Tone } from '@/lib/logic'
import { CITIES, MODE_LABEL, type DeliveryMode, type TeamMember, type TeamRole } from '@/lib/types'

const ROLE_LABEL: Record<TeamRole, string> = { owner: 'Owner', manager: 'Manager', staff: 'Staff' }
const ROLE_TONE: Record<TeamRole, Tone> = { owner: 'blue', manager: 'teal', staff: 'grey' }
const ROLE_NOTES: [TeamRole, string][] = [
  ['owner', 'Everything, including team logins, payment setup and the business profile.'],
  ['manager', 'Orders, payments, returns, quotes and stock. No team or settings changes.'],
  ['staff', 'Stock counts, sales, the reorder cart and labels. No payments or order decisions.'],
]

function MemberDialog({ onClose }: { onClose: () => void }) {
  const act = useAct()
  const [f, setF] = useState({ name: '', email: '', phone: '', role: 'staff', password: '' })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const err = (field: string) => (error?.field === field ? error.message : undefined)
  const field = (key: keyof typeof f, props: React.ComponentProps<typeof Input> = {}) => (
    <Input id={`member-${key}`} value={f[key]} onChange={(e) => setF((prev) => ({ ...prev, [key]: e.target.value }))} aria-invalid={err(key) ? true : undefined} {...props} />
  )
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title="Add a team member"
      description="They sign in with their own email or mobile number and this password. Ask them to change it after the first sign-in."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('team.add', f, { success: `${f.name.trim() || 'Team member'} can now sign in.`, quiet: true })
            if (r.ok) onClose()
            else setError({ field: r.field, message: r.error })
          }}>
            <UserPlus data-icon="inline-start" aria-hidden />
            Add to team
          </AsyncButton>
        </>
      }
    >
      {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
      <Field label="Full name" htmlFor="member-name" error={err('name')}>{field('name', { autoComplete: 'off' })}</Field>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Email" htmlFor="member-email" error={err('email')}>{field('email', { type: 'email', autoComplete: 'off' })}</Field>
        <Field label="Mobile number" htmlFor="member-phone" error={err('phone')}>{field('phone', { inputMode: 'tel', placeholder: '98XXXXXXXX', autoComplete: 'off' })}</Field>
      </div>
      <Field label="Role" htmlFor="member-role">
        <NativeSelect id="member-role" value={f.role} onChange={(e) => setF((prev) => ({ ...prev, role: e.target.value }))} className="w-full">
          <NativeSelectOption value="staff">Staff: stock and cart only</NativeSelectOption>
          <NativeSelectOption value="manager">Manager: orders, payments and stock</NativeSelectOption>
        </NativeSelect>
      </Field>
      <Field label="Password" htmlFor="member-password" error={err('password')} hint="At least 8 characters.">{field('password', { type: 'password', autoComplete: 'new-password' })}</Field>
    </Modal>
  )
}

function PasswordDialog({ member, onClose }: { member: TeamMember; onClose: () => void }) {
  const act = useAct()
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  return (
    <Modal
      open
      onOpenChange={(open) => { if (!open) onClose() }}
      title={`New password for ${member.name}`}
      description="They are signed out everywhere and use this password next time."
      footer={
        <>
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <AsyncButton onClick={async () => {
            const r = await act('team.update', { id: member.id, password }, { success: `Password reset for ${member.name}.`, quiet: true })
            if (r.ok) onClose()
            else setError(r.error)
          }}>Set password</AsyncButton>
        </>
      }
    >
      <Field label="New password" htmlFor="reset-password" error={error || undefined} hint="At least 8 characters.">
        <Input id="reset-password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="new-password" />
      </Field>
    </Modal>
  )
}

export function TeamView() {
  const s = useApp()
  const act = useAct()
  const owner = s.user.role === 'owner'
  const [adding, setAdding] = useState(false)
  const [resetting, setResetting] = useState<TeamMember | null>(null)

  return (
    <>
      <PageHeader
        title="Team"
        subtitle="Give staff their own login. Owners keep control of money and settings."
        actions={owner && (
          <Button size="lg" onClick={() => setAdding(true)}>
            <UserPlus data-icon="inline-start" aria-hidden />
            Add team member
          </Button>
        )}
      />
      {!owner && <p className="rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">Only the owner can add people or change roles. Ask them if you need a change.</p>}
      <div className="grid items-start gap-5 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Panel title="Logins" subtitle={`${s.team.length} ${s.team.length === 1 ? 'person' : 'people'} at ${s.org.name}`}>
          <ul className="divide-y">
            {s.team.map((m) => (
              <li key={m.id} className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2 px-4 py-3">
                <div className="flex min-w-0 flex-1 basis-56 items-center gap-3">
                  <span aria-hidden className="grid size-9 shrink-0 place-items-center rounded-full bg-sky text-xs font-semibold text-sky-foreground">{initials(m.name)}</span>
                  <div className="min-w-0">
                    <p className="text-sm font-semibold">{m.name}{m.id === s.user.id && <span className="font-normal text-muted-foreground"> (you)</span>}</p>
                    <p className="truncate text-sm text-muted-foreground">{`${m.email} · ${m.phone}`}</p>
                  </div>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {!m.active && <StatusPill tone="red">Switched off</StatusPill>}
                  {owner && m.role !== 'owner' ? (
                    <>
                      <NativeSelect value={m.role} aria-label={`Role for ${m.name}`} onChange={(e) => act('team.update', { id: m.id, role: e.target.value }, { success: `${m.name} is now ${ROLE_LABEL[e.target.value as TeamRole]}.` })}>
                        <NativeSelectOption value="staff">Staff</NativeSelectOption>
                        <NativeSelectOption value="manager">Manager</NativeSelectOption>
                      </NativeSelect>
                      <label className="flex min-h-9 cursor-pointer items-center gap-2 text-sm">
                        <Switch checked={m.active} onCheckedChange={(on) => act('team.update', { id: m.id, active: on }, { success: on ? `${m.name} can sign in again.` : `${m.name} is signed out and cannot sign in.` })} />
                        Can sign in
                      </label>
                      <Button variant="outline" onClick={() => setResetting(m)}>
                        <KeyRound data-icon="inline-start" aria-hidden />
                        Reset password
                      </Button>
                    </>
                  ) : (
                    <StatusPill tone={ROLE_TONE[m.role]}>{ROLE_LABEL[m.role]}</StatusPill>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </Panel>
        <Panel title="What each role can do">
          <dl className="flex flex-col gap-4 p-4">
            {ROLE_NOTES.map(([role, text]) => (
              <div key={role} className="flex flex-col gap-1">
                <dt><StatusPill tone={ROLE_TONE[role]}>{ROLE_LABEL[role]}</StatusPill></dt>
                <dd className="text-sm leading-relaxed text-muted-foreground">{text}</dd>
              </div>
            ))}
          </dl>
        </Panel>
      </div>
      {adding && <MemberDialog onClose={() => setAdding(false)} />}
      {resetting && <PasswordDialog member={resetting} onClose={() => setResetting(null)} />}
    </>
  )
}

function ProfileForm() {
  const s = useApp()
  const act = useAct()
  const owner = s.user.role === 'owner'
  const [f, setF] = useState({ name: s.org.name, city: s.org.city, address: s.org.address, phone: s.org.phone, email: s.org.email })
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const err = (field: string) => (error?.field === field ? error.message : undefined)
  const input = (key: keyof typeof f, props: React.ComponentProps<typeof Input> = {}) => (
    <Input id={`org-${key}`} value={f[key]} disabled={!owner} onChange={(e) => setF((prev) => ({ ...prev, [key]: e.target.value }))} aria-invalid={err(key) ? true : undefined} {...props} />
  )
  return (
    <Panel title="Business profile" subtitle="Shown to your trading partners and printed on receipts">
      <div className="flex flex-col gap-4 p-4">
        {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Business name" htmlFor="org-name" error={err('name')}>{input('name')}</Field>
          <Field label="PAN / VAT number" htmlFor="org-pan" hint="Fixed at registration. It appears on every receipt.">
            <Input id="org-pan" value={s.org.pan} readOnly disabled />
          </Field>
          <Field label="City" htmlFor="org-city">
            <NativeSelect id="org-city" value={f.city} disabled={!owner} onChange={(e) => setF((prev) => ({ ...prev, city: e.target.value }))} className="w-full">
              {CITIES.map((c) => <NativeSelectOption key={c} value={c}>{c}</NativeSelectOption>)}
            </NativeSelect>
          </Field>
          <Field label="Address" htmlFor="org-address" error={err('address')}>{input('address')}</Field>
          <Field label="Mobile number" htmlFor="org-phone" error={err('phone')}>{input('phone', { inputMode: 'tel' })}</Field>
          <Field label="Email" htmlFor="org-email" error={err('email')}>{input('email', { type: 'email' })}</Field>
        </div>
        {owner ? (
          <AsyncButton className="w-fit" onClick={async () => {
            const r = await act('org.profile', f, { success: 'Business profile saved.', quiet: true })
            setError(r.ok ? null : { field: r.field, message: r.error })
          }}>Save profile</AsyncButton>
        ) : (
          <p className="text-sm text-muted-foreground">Only the owner can change the business profile.</p>
        )}
      </div>
    </Panel>
  )
}

function PaymentSetupForm() {
  const s = useApp()
  const act = useAct()
  const config = s.org.supplier
  const [f, setF] = useState({ esewaId: config?.esewaId ?? '', khaltiId: config?.khaltiId ?? '', bank: config?.bank ?? '', creditDays: String(config?.creditDays ?? 0), deliveryNote: config?.deliveryNote ?? '' })
  const [modes, setModes] = useState<DeliveryMode[]>(config?.modes ?? ['van'])
  // undefined keeps the saved QR, a data URL replaces it, null removes it.
  const [qr, setQr] = useState<string | null | undefined>(undefined)
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  const err = (field: string) => (error?.field === field ? error.message : undefined)
  const shownQr = qr === undefined ? (s.org.hasQr ? `/api/files/qr/${s.org.id}` : null) : qr

  return (
    <Panel title="Payments and delivery" subtitle="Shops pay you directly into these accounts. FeriStock never holds the money.">
      <div className="flex flex-col gap-4 p-4">
        {error && !error.field && <p role="alert" className="rounded-lg border border-tone-red-line bg-tone-red-soft px-3 py-2 text-sm font-medium text-tone-red-ink">{error.message}</p>}
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="eSewa merchant ID" htmlFor="pay-esewa" error={err('esewaId')}>
            <Input id="pay-esewa" value={f.esewaId} onChange={(e) => setF((prev) => ({ ...prev, esewaId: e.target.value }))} maxLength={40} />
          </Field>
          <Field label="Khalti merchant ID" htmlFor="pay-khalti" error={err('khaltiId')}>
            <Input id="pay-khalti" value={f.khaltiId} onChange={(e) => setF((prev) => ({ ...prev, khaltiId: e.target.value }))} maxLength={40} />
          </Field>
        </div>
        <Field label="Bank details" htmlFor="pay-bank" hint="Bank, branch, account number and account name. Shown to shops that are linked to you.">
          <Textarea id="pay-bank" value={f.bank} onChange={(e) => setF((prev) => ({ ...prev, bank: e.target.value }))} rows={3} maxLength={300} />
        </Field>
        <Field label="Payment QR code" hint="Optional. A photo or screenshot of your bank or wallet QR.">
          <ImagePicker value={shownQr} onChange={setQr} label="Upload QR image" alt="Your payment QR code" onError={(message) => toast.error(message)} />
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
          {err('modes') && <p role="alert" className="text-xs font-medium text-destructive">{err('modes')}</p>}
        </fieldset>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Udharo (credit) days" htmlFor="pay-credit" error={err('creditDays')} hint="0 means no credit: shops pay before dispatch.">
            <Input id="pay-credit" inputMode="numeric" value={f.creditDays} onChange={(e) => setF((prev) => ({ ...prev, creditDays: e.target.value.replace(/\D/g, '').slice(0, 2) }))} />
          </Field>
          <Field label="Delivery note for shops" htmlFor="pay-note" hint="Optional. Shown on your supplier page.">
            <Input id="pay-note" value={f.deliveryNote} onChange={(e) => setF((prev) => ({ ...prev, deliveryNote: e.target.value }))} maxLength={200} />
          </Field>
        </div>
        <AsyncButton className="w-fit" onClick={async () => {
          const r = await act('org.payments', { ...f, creditDays: Number(f.creditDays), modes, qr }, { success: 'Payment and delivery settings saved.', quiet: true })
          setError(r.ok ? null : { field: r.field, message: r.error })
          if (r.ok) setQr(undefined)
        }}>Save payment setup</AsyncButton>
      </div>
    </Panel>
  )
}

function PasswordForm() {
  const act = useAct()
  const [current, setCurrent] = useState('')
  const [next, setNext] = useState('')
  const [error, setError] = useState<{ field?: string; message: string } | null>(null)
  return (
    <Panel title="Your password" subtitle="For your own login only">
      <div className="flex flex-col gap-4 p-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <Field label="Current password" htmlFor="pw-current" error={error?.field === 'current' ? error.message : undefined}>
            <Input id="pw-current" type="password" value={current} onChange={(e) => setCurrent(e.target.value)} autoComplete="current-password" />
          </Field>
          <Field label="New password" htmlFor="pw-next" error={error?.field === 'password' ? error.message : undefined} hint="At least 8 characters.">
            <Input id="pw-next" type="password" value={next} onChange={(e) => setNext(e.target.value)} autoComplete="new-password" />
          </Field>
        </div>
        {error && !error.field && <p role="alert" className="text-sm font-medium text-destructive">{error.message}</p>}
        <AsyncButton variant="outline" className="w-fit" onClick={async () => {
          const r = await act('auth.password', { current, next }, { success: 'Password changed.', quiet: true })
          setError(r.ok ? null : { field: r.field, message: r.error })
          if (r.ok) { setCurrent(''); setNext('') }
        }}>
          <KeyRound data-icon="inline-start" aria-hidden />
          Change password
        </AsyncButton>
      </div>
    </Panel>
  )
}

export function SettingsView() {
  const s = useApp()
  const act = useAct()
  const [confirm, confirmDialog] = useConfirm()
  return (
    <>
      <PageHeader title="Settings" subtitle={`${s.org.name} · ${s.ws === 'retailer' ? 'retailer' : 'supplier'} workspace`} />
      <ProfileForm />
      {s.ws === 'supplier' && s.user.role === 'owner' && <PaymentSetupForm />}
      <PasswordForm />
      {s.canReset && (
        <Panel title="Sample data" subtitle="This is a demo business">
          <div className="flex flex-col items-start gap-3 p-4">
            <p className="text-sm leading-relaxed text-muted-foreground">Put the six sample businesses back to their starting stock, orders and payments. Businesses that people registered themselves are kept.</p>
            <Button variant="outline" onClick={async () => {
              if (await confirm({ title: 'Reset the sample data?', text: 'Everything you changed in the sample businesses is undone.', action: 'Reset sample data', destructive: true })) {
                await act('demo.reset', {}, { success: 'Sample data is back to its starting state.' })
              }
            }}>
              <RotateCcw data-icon="inline-start" aria-hidden />
              Reset sample data
            </Button>
          </div>
        </Panel>
      )}
      {confirmDialog}
    </>
  )
}

export function ActivityView() {
  const s = useApp()
  const [query, setQuery] = useState('')
  const [person, setPerson] = useState('')
  const people = [...new Set(s.audit.map((a) => a.by))].sort()
  const q = query.trim().toLowerCase()
  const rows = s.audit.filter((a) => (!person || a.by === person) && (!q || a.text.toLowerCase().includes(q)))

  return (
    <>
      <PageHeader
        title="Activity log"
        subtitle="Who did what in this workspace. Entries cannot be edited or deleted."
        actions={
          <Button variant="outline" size="lg" disabled={rows.length === 0} onClick={() => downloadCsv('feristock-activity.csv', [['When', 'Person', 'Action'], ...rows.map((a) => [fmtDateTime(a.at), a.by, a.text])])}>
            <Download data-icon="inline-start" aria-hidden />
            Export
          </Button>
        }
      />
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput value={query} onChange={setQuery} placeholder="Search actions" />
        <NativeSelect value={person} onChange={(e) => setPerson(e.target.value)} aria-label="Person" className="[&_select]:bg-card">
          <NativeSelectOption value="">Everyone</NativeSelectOption>
          {people.map((p) => <NativeSelectOption key={p} value={p}>{p}</NativeSelectOption>)}
        </NativeSelect>
      </div>
      <Panel>
        {rows.length === 0 ? (
          <EmptyState icon={History} title={s.user.role === 'staff' ? 'The activity log is for owners and managers' : s.audit.length ? 'No activity matches' : 'No activity yet'} text="Orders, payments, stock changes and team changes are recorded here as they happen." />
        ) : (
          <ul className="divide-y">
            {rows.slice(0, 200).map((a) => (
              <li key={a.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1 px-4 py-3">
                <p className="min-w-0 text-sm"><span className="font-semibold">{a.by}</span>{` · ${a.text}`}</p>
                <p className="shrink-0 text-xs text-muted-foreground" title={fmtDate(a.at)}>{ago(a.at, s.now)}</p>
              </li>
            ))}
          </ul>
        )}
      </Panel>
    </>
  )
}
