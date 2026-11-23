import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'FeriStock',
    short_name: 'FeriStock',
    description: 'Stock and restock for shops and suppliers in Nepal.',
    start_url: '/',
    display: 'standalone',
    background_color: '#f2f6fb',
    theme_color: '#0e1d4a',
    icons: [{ src: '/icon.svg', sizes: 'any', type: 'image/svg+xml' }],
  }
}
