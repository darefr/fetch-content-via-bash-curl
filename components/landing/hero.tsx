import { ArrowRight, Check } from 'lucide-react'
import { DemoButton } from './demo-button'
import { HeroDemo } from './hero-demo'
import { Cta } from './parts'

const PROMISES = ['You order from your own suppliers', 'Payment goes straight to the supplier', 'FeriStock never holds your money']

export function Hero({ home }: { home?: string }) {
  return (
    <section className="relative overflow-hidden bg-brand-navy text-brand-navy-foreground">
      <div aria-hidden className="landing-grid pointer-events-none absolute inset-0" />
      <div className="relative mx-auto grid max-w-7xl items-center gap-12 px-5 pt-12 pb-16 sm:px-8 sm:pt-16 sm:pb-20 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,0.9fr)] lg:gap-16 lg:pt-20 lg:pb-28">
        <div className="flex flex-col gap-7">
          <p className="rise inline-flex w-fit items-center gap-2.5 rounded-full border border-brand-navy-foreground/20 bg-brand-navy-foreground/5 py-1.5 pr-4 pl-3 text-sm font-medium">
            <span aria-hidden className="size-2 rounded-full bg-marigold" />
            For kirana shops and wholesalers in Nepal
          </p>
          <h1 className="rise text-[2.75rem] leading-[1.04] font-semibold tracking-tight text-balance [--rise-delay:70ms] sm:text-6xl xl:text-7xl">
            Restock your shop <span className="text-marigold">before the shelf goes empty.</span>
          </h1>
          <p className="rise max-w-xl text-lg leading-relaxed text-brand-navy-foreground/80 text-pretty [--rise-delay:140ms] sm:text-xl">
            {"FeriStock keeps a shop's live stock and its wholesalers' orders in one place: low-stock alerts, 1-click reorders, bilti tracking, and direct payment by eSewa, Khalti, QR or udharo."}
          </p>
          <div className="rise flex flex-col gap-3 [--rise-delay:210ms] sm:flex-row">
            {home ? (
              <Cta href={home} variant="light" className="h-14 px-8 text-lg">
                Open your workspace
                <ArrowRight aria-hidden />
              </Cta>
            ) : (
              <>
                <Cta href="/register" variant="light" className="h-14 px-8 text-lg">
                  Create account
                  <ArrowRight aria-hidden />
                </Cta>
                <DemoButton className="h-14 px-8 text-lg" />
              </>
            )}
          </div>
          <ul className="rise flex flex-col gap-2.5 text-base text-brand-navy-foreground/85 [--rise-delay:280ms]">
            {PROMISES.map((promise) => (
              <li key={promise} className="flex items-center gap-3">
                <Check className="size-4.5 shrink-0 text-marigold" aria-hidden />
                {promise}
              </li>
            ))}
          </ul>
        </div>
        <HeroDemo />
      </div>
    </section>
  )
}
