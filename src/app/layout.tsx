import type { Metadata } from 'next';
import { Fraunces, Nunito } from 'next/font/google';
import type { ReactNode } from 'react';

import { SalonShell } from '@/components/salon-shell';

import { DevBanner } from '@/components/dev-banner';
import { siteUrl } from '@/lib/seo';
import { site } from '@/lib/site';

import './globals.css';

export const dynamic = 'force-dynamic';

// Every page's <title> is `<its metadata.title> · <site name>`; canonical URLs and social images resolve on siteUrl().
export async function generateMetadata(): Promise<Metadata> {
  return {
    metadataBase: new URL(await siteUrl()),
    title: { default: site.name, template: `%s · ${site.name}` },
    description: site.description,
    // the logo, else the name's initials on the brand colour (src/app/site-icon.svg): every site has an icon
    icons: { icon: site.logo || '/site-icon.svg' },
  };
}

// Fonts (design.md §1): `const heading = <Face>({ subsets: ['latin'], variable: '--font-heading' })` from
// `next/font/google` (and `--font-body`), then both `.variable` classes in the <html> className below.
const heading = Fraunces({ subsets: ['latin'], variable: '--font-heading' });
const body = Nunito({ subsets: ['latin'], variable: '--font-body' });
const fonts = `${heading.variable} ${body.variable}`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html className={fonts} lang="es">
      <body className="flex min-h-dvh flex-col bg-sand-100 font-sans text-navy antialiased">
        <div className="flex-1"><SalonShell>{children}</SalonShell></div>
        <DevBanner />
      </body>
    </html>
  );
}
