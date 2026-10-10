import type { Metadata } from "next";
import "./globals.css";
import { ClientLayoutWrapper } from "../components/ClientLayoutWrapper";
import localFont from "next/font/local";
import { ThemeProvider } from "@/contexts/ThemeProvider";

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
        className={`${repetitionScrolling.variable} font-sans antialiased`}
        suppressHydrationWarning
      >
        <ThemeProvider defaultTheme="light" storageKey="ui-theme">
          <ClientLayoutWrapper>{children}</ClientLayoutWrapper>
        </ThemeProvider>
      </body>
    </html>
  );
}
