import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const metadata: Metadata = {
  title: "QueryLab - Plataforma Text-to-SQL",
  description: "Plataforma para consultas em linguagem natural usando LLMs para conversão text-to-sql",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" className="h-full" suppressHydrationWarning>
      <body className={`${inter.variable} font-sans antialiased h-full`}>
        <ThemeProvider
          defaultTheme="light"
          storageKey="querylab-ui-theme"
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
