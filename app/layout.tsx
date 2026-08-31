import type { Metadata } from 'next';
import './globals.css';

const deploymentUrl =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ?? process.env.VERCEL_URL;

export const metadata: Metadata = {
  metadataBase: new URL(
    deploymentUrl ? 'https://' + deploymentUrl : 'http://localhost:3000',
  ),
  title: 'Blue Collar People | Client Portal',
  description: 'Blue Collar People client workforce and weekly assignments.',
  twitter: {
    card: 'summary_large_image',
  },
  robots: {
    index: false,
    follow: false,
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en-AU">
      <body>{children}</body>
    </html>
  );
}
