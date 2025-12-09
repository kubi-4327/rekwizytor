import type { Metadata } from "next";
import { Geist, Geist_Mono, Courier_Prime } from "next/font/google";
import localFont from "next/font/local";
import "../globals.css";
import { AppShell } from "@/components/AppShell";
import { NextIntlClientProvider } from 'next-intl';
import { getMessages } from 'next-intl/server';
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { Toaster } from 'react-hot-toast';

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

const courierPrime = Courier_Prime({
  variable: "--font-courier-prime",
  weight: ["400", "700"],
  subsets: ["latin"],
});

const boldonse = localFont({
  src: "../../public/fonts/Boldonse-Regular.ttf",
  variable: "--font-boldonse",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Rekwizytorium",
  description: "Theater props management system",
};

export default async function LocaleLayout({
  children,
  params,
}: Readonly<{
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}>) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body
        className={`${geistSans.variable} ${geistMono.variable} ${courierPrime.variable} ${boldonse.variable} antialiased`}
      >
        <Toaster />
        <ErrorBoundary>
          <NextIntlClientProvider messages={messages}>
            <AppShell>{children}</AppShell>
          </NextIntlClientProvider>
        </ErrorBoundary>
      </body>
    </html>
  );
}
