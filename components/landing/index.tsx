import { Hero } from './hero'
import { Closing, Faq, OrderFlow, SiteFooter, Ways, Workspaces } from './sections'
import { Payments, ShopTools } from './showcase'
import { SiteHeader } from './site-header'

/** `home` is the signed-in visitor's workspace, when there is one. */
export function Landing({ home }: { home?: string }) {
  return (
    <div data-landing className="bg-card">
      <a
        href="#main"
        className="sr-only rounded-full bg-card px-5 py-3 font-semibold text-foreground focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:ring-3 focus:ring-ring/60"
      >
        Skip to content
      </a>
      <SiteHeader home={home} />
      <main id="main">
        <Hero home={home} />
        <Ways />
        <Workspaces />
        <OrderFlow />
        <ShopTools />
        <Payments />
        <Faq />
        <Closing home={home} />
      </main>
      <SiteFooter />
    </div>
  )
}
