import type { Metadata } from "next";
import { Inter, Fraunces } from "next/font/google";
import "./globals.css";
import { GrainOverlay } from "@/components/marketing/GrainOverlay";

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
  // weight must be "variable" when specifying variable axes (SOFT, opsz)
  weight: "variable",
  axes: ["SOFT", "opsz"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "District Pour Haus",
  description: "Our Haus is Your Haus",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${fraunces.variable} dark`}
    >
      <body className="font-sans antialiased bg-background text-foreground">
        {children}
        <GrainOverlay />
      </body>
    </html>
  );
}
