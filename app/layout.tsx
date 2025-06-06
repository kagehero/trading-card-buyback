import type React from "react"
import "./globals.css"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { ThemeProvider } from "@/components/theme-provider"
import { Header } from "@/components/header"
import { AuthProvider } from "@/contexts/auth-context"
import { StoreProvider } from "@/contexts/store-context"
import { BoxProvider } from "@/contexts/box-context"
import { Footer } from "@/components/footer"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "トレカコンパス",
  description: "トレーディングカード買取価格比較サービス",
    generator: 'v0.dev'
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ja" suppressHydrationWarning className="overflow-x-hidden">
      <body className={`${inter.className} overflow-x-hidden min-h-screen flex flex-col`}>
        <ThemeProvider attribute="class" defaultTheme="light" enableSystem>
          <AuthProvider>
            <StoreProvider>
              <BoxProvider>
                <div className="flex flex-col min-h-screen">
                  <Header />
                  <main className="flex-1 flex flex-col overflow-hidden">
                    <div className="h-[calc(100vh-0px)] w-full [&::-webkit-scrollbar-thumb]:bg-transparent overflow-y-auto">{children}</div>
                  </main>
                </div>
              </BoxProvider>
            </StoreProvider>
          </AuthProvider>
        </ThemeProvider>
      </body>
    </html>
  )
}
