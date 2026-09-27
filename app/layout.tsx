import type { Metadata } from "next";
import { Poppins } from "next/font/google";
import "./globals.css";

const poppins = Poppins({
  weight: ["300", "400", "500", "600", "700", "800", "900"],
  subsets: ["latin"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "PingKas - Catat Keuangan Cepat via WhatsApp & Mobile",
  description: "Asisten keuangan pribadi pintar berbasis WhatsApp & Mobile App. Catat pengeluaran cepat, pantau kuota, dan atur budget harian otomatis.",
  icons: {
    icon: "/logo.png",
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className={`${poppins.variable} font-sans scroll-smooth`}>
      <body className="min-h-screen flex flex-col bg-pingkas-cream text-slate-900 antialiased font-sans">
        {children}
      </body>
    </html>
  );
}

