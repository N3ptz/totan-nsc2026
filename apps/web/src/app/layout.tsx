import type { Metadata } from "next";
import { Sora, Sarabun } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/lib/theme";
import { I18nProvider } from "@/lib/i18n";
import { TourProvider } from "@/components/GuidedTour";
import { GlobalFooter } from "@/components/GlobalFooter";

const sora = Sora({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-sora",
  display: "swap",
});

const sarabun = Sarabun({
  subsets: ["latin", "thai"],
  weight: ["300", "400", "500", "600", "700"],
  variable: "--font-sarabun",
  display: "swap",
});

export const metadata: Metadata = {
  title: "โตทัน | ระบบประเมินอายุกระดูกสำหรับเด็กไทย",
  description: "AI-powered bone age assessment system for Thai children.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th" className={`${sora.variable} ${sarabun.variable}`} suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `(function(){var t=localStorage.getItem('theme');if(t==='dark'||(t==null&&window.matchMedia('(prefers-color-scheme:dark)').matches)){document.documentElement.classList.add('dark')}})()`,
          }}
        />
      </head>
      <body className="font-body flex flex-col min-h-screen">
        <ThemeProvider>
          <I18nProvider>
            <TourProvider>
              <div className="flex-1 flex flex-col">{children}</div>
              <GlobalFooter />
            </TourProvider>
          </I18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
