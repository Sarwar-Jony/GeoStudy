import type { Metadata, Viewport } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#060913" },
  ],
};

export const metadata: Metadata = {
  title: "GeoStudyArea — Hierarchical Study Area & Raster Layer Generator",
  description:
    "Select any administrative boundary hierarchically and generate DEM, Slope, NDVI, LULC and more as downloadable GeoTIFF layers for QGIS/ArcGIS.",
  applicationName: "GeoStudy",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "GeoStudy",
  },
  formatDetection: {
    telephone: false,
  },
  icons: {
    icon: [
      { url: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [
      { url: "/icons/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
    ],
  },
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#f8fafc] text-slate-900 antialiased dark:bg-[#060913] dark:text-slate-100 selection:bg-emerald-500/20 selection:text-emerald-700 dark:selection:bg-emerald-400/20 dark:selection:text-emerald-300">
        <Providers>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
