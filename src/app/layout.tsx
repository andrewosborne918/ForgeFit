import "@/app/globals.css"
import { GeistSans } from "geist/font/sans"
import { Toaster } from "sonner"
import { ThemeProvider } from "@/context/ThemeProvider";
import { AppProvider } from "@/context/AppContext"; // Import AppProvider

export const metadata = {
  title: "ForgeFit",
  description: "Your AI-powered fitness coach",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <ThemeProvider
      defaultTheme="system"
      storageKey="vite-ui-theme"
    >
      <AppProvider> {/* Wrap with AppProvider */}
        <html lang="en" suppressHydrationWarning>
          <body className={`${GeistSans.className} bg-white dark:bg-slate-950 text-slate-900 dark:text-slate-50`}>
            {children}
            <Toaster />
          </body>
        </html>
      </AppProvider>
    </ThemeProvider>
  )
}
