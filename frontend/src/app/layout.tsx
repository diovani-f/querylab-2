import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { ThemeProvider } from "@/components/theme/theme-provider";
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { ToastProvider } from "@/components/ui/toast";
// import { AuthDebug } from "@/components/debug/auth-debug";

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
      <body className={`${inter.variable} font-sans antialiased h-full`} suppressHydrationWarning>
        <ThemeProvider
          defaultTheme="light"
          storageKey="querylab-ui-theme"
        >
          <ToastProvider>
            <AuthInitializer>
              {children}
              {/* <AuthDebug /> */}
            </AuthInitializer>
          </ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
