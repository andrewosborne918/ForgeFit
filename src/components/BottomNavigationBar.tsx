"use client"

import Link from "next/link"
import {
  LayoutDashboard,
  BarChart3,
  ScrollText,
  UserCircle2,
  Settings2,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"

const navItems = [
  { href: "/dashboard", icon: LayoutDashboard, label: "Workouts" },
  { href: "/analytics", icon: BarChart3, label: "Analytics" },
  { href: "/log", icon: ScrollText, label: "Log" },
  { href: "/profile", icon: UserCircle2, label: "Profile" },
  { href: "/settings", icon: Settings2, label: "Settings" },
]

export function BottomNavigationBar() {
  const pathname = usePathname()

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white shadow md:hidden">
      <ul className="flex justify-around py-2">
        {navItems.map(({ href, icon: Icon, label }) => {
          const isActive = pathname === href
          return (
            <li key={href}>
              <Link
                href={href}
                className={cn(
                  "flex flex-col items-center text-xs",
                  isActive ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon className="h-5 w-5 mb-0.5" />
                {label}
              </Link>
            </li>
          )
        })}
      </ul>
    </nav>
  )
}
