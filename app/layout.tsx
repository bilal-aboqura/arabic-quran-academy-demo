import type { Metadata, Viewport } from 'next';
import { Outfit, IBM_Plex_Sans_Arabic } from 'next/font/google';
import './globals.css';
import '@/components/tenant/global-arabic.css';
const outfit = Outfit({ variable: '--font-outfit', subsets: ['latin'], display: 'swap' });
const arabic = IBM_Plex_Sans_Arabic({ variable: '--font-ibm-arabic', subsets: ['arabic', 'latin'], weight: ['400', '500', '600', '700'], display: 'swap' });
export const metadata: Metadata = { title: 'Arabic & Quran Academy', description: 'A standalone Arabic and Quran learning academy demo.', icons: { icon: '/academy/favicon.svg' } };
export const viewport: Viewport = { width: 'device-width', initialScale: 1, viewportFit: 'cover' };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en" dir="ltr"><body className={`${outfit.variable} ${arabic.variable}`}>{children}</body></html>; }
