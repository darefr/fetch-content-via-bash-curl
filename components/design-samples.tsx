'use client'

import { Boxes, HandCoins } from 'lucide-react'
import { useState } from 'react'
import { Stat, Stepper } from '@/components/kit'

/** Live samples for the design-system page. Icons are components, so they are chosen on the client. */
export function FigureSamples() {
  const [qty, setQty] = useState(2)
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="grid gap-3 sm:grid-cols-2">
        <Stat label="Low stock" value={7} hint="2 out of stock" icon={Boxes} tone="amber" />
        <Stat label="Udharo payable" value="Rs 1,24,500" hint="Next: due in 6 days" icon={HandCoins} tone="teal" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <Stepper value={qty} onChange={setQty} label="Sample" max={99} />
        <p className="text-sm text-muted-foreground">The quantity stepper: tap the buttons or type a number.</p>
      </div>
    </div>
  )
}
