import type { Metadata } from "next";
import "./globals.css";

const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://nimasrepub.com.ng";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: {
    default: "Nigerian Medical and Allied Sciences Research Publication",
    template: "%s | NIMASREPUB",
  },
  description:
    "NIMASREPUB publishes open-access, peer-reviewed research in medicine and allied health sciences from Nigeria and beyond. Advancing health. Generating knowledge. Impacting lives.",
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  manifest: "/site.webmanifest",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
