import "./globals.css";
import type { Metadata } from "next";
import { Analytics } from "@vercel/analytics/next";
import { cn, constructMetadata } from "@/lib/utils";
import { ThemeProvider } from "@/components/theme-provider";
import { Fira_Code, Merriweather, Spectral } from "next/font/google";

const fontSans = Spectral({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-sans",
});

const fontSerif = Merriweather({
  subsets: ["latin"],
  weight: "400",
  variable: "--font-serif",
});

const fontMono = Fira_Code({
  subsets: ["latin"],
  weight: ["400", "500"],
  variable: "--font-mono",
});

export const metadata: Metadata = constructMetadata();

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={cn(
        "h-full font-sans antialiased",
        fontSans.variable,
        fontSerif.variable,
        fontMono.variable,
      )}
      suppressHydrationWarning
    >
      <body className="flex min-h-full flex-col">
        <ThemeProvider>{children}</ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
