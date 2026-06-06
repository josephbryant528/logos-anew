import type { Metadata } from "next";
import "./globals.css";
import { Inter, Lora, DM_Mono, Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";

const inter = Inter({ subsets: ["latin"], weight: ["300","400","500","600"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], weight: ["400","500"], style: ["normal","italic"], variable: "--font-lora" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: ["300","400"], style: ["normal","italic"], variable: "--font-dm-mono" });
const notoSerif = Noto_Serif({ subsets: ["latin"], weight: ["400","600"], style: ["normal","italic"], variable: "--font-noto-serif" });
const notoSerifHebrew = Noto_Serif_Hebrew({ subsets: ["hebrew"], weight: ["300","400","600"], variable: "--font-noto-serif-hebrew" });

export const metadata: Metadata = {
  title: "Verbum",
  description: "Scripture study with interlinear lexicon and sourced commentary",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontClasses = [inter.variable, lora.variable, dmMono.variable, notoSerif.variable, notoSerifHebrew.variable].join(" ");
  return (
    <html lang="en" className={`h-full ${fontClasses}`}>
      <body className="h-full">{children}</body>
    </html>
  );
}
