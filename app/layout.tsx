import type { Metadata } from "next";
import "./globals.css";
import { ClientLayoutWrapper } from "../components/ClientLayoutWrapper";
import localFont from "next/font/local";
import { ThemeProvider } from "@/contexts/ThemeProvider";

const inter = localFont({
  src: "../public/fonts/inter-variable.ttf",
  variable: "--font-inter",
  weight: "400 700",
  style: "normal",
  display: "swap",
});
const geistMono = localFont({ src: "../public/fonts/geist-mono-variable.ttf", variable: "--font-geist-mono", weight: "100 900", display: "swap" });
const nanumPenScript = localFont({ src: "../public/fonts/nanum-pen-script.ttf", variable: "--font-nanum-pen-script", weight: "400", display: "swap" });
const anton = localFont({ src: "../public/fonts/anton.ttf", variable: "--font-anton", weight: "400", display: "swap" });

const repetitionScrolling = localFont({
  src: "../public/fonts/repet___.ttf",
  variable: "--font-repetition-scrolling",
  display: "swap",
});




export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: "Settlbox",
  description:
    "Business accounts, payroll, invoices, and treasury management on Arc.",
  icons: {
    icon: "/logo/settlbox-icon.svg",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                try {
                  var theme = localStorage.getItem('ui-theme') || 'light';
                  if (theme === 'system') {
                    var systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
                    document.documentElement.classList.add(systemTheme);
                  } else {
                    document.documentElement.classList.add(theme);
                  }
                } catch (e) {}
              })();
            `,
          }}
        />
      </head>
      <body
        className={`${inter.className} ${inter.variable} ${geistMono.variable} ${nanumPenScript.variable} ${anton.variable} ${repetitionScrolling.variable} antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
