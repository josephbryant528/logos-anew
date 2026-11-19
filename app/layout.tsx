import type { Metadata, Viewport } from "next";
import "./globals.css";
import { Inter, Lora, DM_Mono, Noto_Serif, Noto_Serif_Hebrew } from "next/font/google";

// Variable fonts load one file per script instead of one per weight.
// Noto Serif carries the Greek subsets so polytonic Greek uses it, not a fallback.
const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const lora = Lora({ subsets: ["latin"], style: ["normal", "italic"], variable: "--font-lora" });
const dmMono = DM_Mono({ subsets: ["latin"], weight: "400", variable: "--font-dm-mono" });
const notoSerif = Noto_Serif({ subsets: ["latin", "greek", "greek-ext"], variable: "--font-noto-serif" });
const notoSerifHebrew = Noto_Serif_Hebrew({ subsets: ["hebrew"], variable: "--font-noto-serif-hebrew" });

// Runs before first paint so the page never flashes the wrong theme.
const themeScript = `try{var t=localStorage.getItem("unveiled.theme");var d=t?t==="dark":matchMedia("(prefers-color-scheme: dark)").matches;if(d)document.documentElement.classList.add("dark")}catch(e){}`;

export const metadata: Metadata = {
  title: "Unveiled",
  description: "Scripture study with interlinear lexicon and sourced commentary",
  applicationName: "Unveiled",
  appleWebApp: {
    capable: true,
    title: "Unveiled",
    statusBarStyle: "default",
  },
  formatDetection: { telephone: false },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  viewportFit: "cover",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#FFFFFF" },
    { media: "(prefers-color-scheme: dark)", color: "#191919" },
  ],
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const fontClasses = [inter.variable, lora.variable, dmMono.variable, notoSerif.variable, notoSerifHebrew.variable].join(" ");
  return (
    <html lang="en" className={`h-full ${fontClasses}`} suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeScript }} />
      </head>
      <body className="h-full">{children}</body>
    </html>
  );
}
