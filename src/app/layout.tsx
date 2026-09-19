import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import Providers from "@/components/Providers";
import Navbar from "@/components/Navbar";
import Footer from "@/components/Footer";

export const metadata: Metadata = {
  title: "GeoStudyArea — Hierarchical Study Area & Raster Layer Generator",
  description:
    "Select any administrative boundary hierarchically and generate DEM, Slope, NDVI, LULC and more as downloadable GeoTIFF layers for QGIS/ArcGIS.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="min-h-screen flex flex-col bg-[#f4f6f5] text-slate-900 antialiased dark:bg-[#0b1120] dark:text-slate-100">
        <Providers>
          <Navbar />
          <div className="flex-1">{children}</div>
          <Footer />
        </Providers>
      </body>
    </html>
  );
}
