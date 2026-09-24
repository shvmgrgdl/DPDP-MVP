import type { SVGProps } from 'react'
const base = { fill: 'none', stroke: 'currentColor', strokeWidth: 2, strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const, viewBox: '0 0 24 24' }
export const InstagramIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><rect x="3" y="3" width="18" height="18" rx="5" /><circle cx="12" cy="12" r="4" /><circle cx="17.5" cy="6.5" r="0.6" fill="currentColor" /></svg>)
export const YoutubeIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><rect x="2.5" y="5.5" width="19" height="13" rx="4" /><path d="M10 9.5v5l4.5-2.5z" fill="currentColor" /></svg>)
export const FacebookIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M14 8h3V4h-3a4 4 0 0 0-4 4v2H7v4h3v6h4v-6h3l1-4h-4V8z" /></svg>)
export const WhatsappIcon = (p: SVGProps<SVGSVGElement>) => (<svg {...base} {...p}><path d="M4 20l1.3-3.9A8 8 0 1 1 8 19l-4 1z" /><path d="M9 9.5c.3 2 2.2 4.1 4.5 4.7l1.2-1.2 1.8.8-.5 1.7c-3.9.2-7.5-3.3-7.5-7.3l1.7-.5.8 1.8z" /></svg>)
