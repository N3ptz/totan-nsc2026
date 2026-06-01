import type { Metadata } from "next";
import { Cormorant_Garamond, DM_Sans } from "next/font/google";
import "./globals.css";

const cormorant = Cormorant_Garamond({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-cormorant",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  weight: ["300", "400", "500", "600"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "โตทัน | ระบบประเมินอายุกระดูกสำหรับเด็กไทย",
  description:
    "AI-powered bone age assessment system for Thai children. ระบบประเมินอายุกระดูกและติดตามการเจริญเติบโตด้วย AI สำหรับเด็กไทย",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={`${cormorant.variable} ${dmSans.variable}`}>
      <body className="font-body">{children}</body>
    </html>
  );
}
