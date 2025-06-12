"use client"

import { useRouter } from "next/navigation"
import {
  Dumbbell,
  Calendar,
  Plus,
  History,
  User,
} from "lucide-react"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { useAppContext } from "@/context/AppContext"
import { useState } from "react"

interface BottomNavigationBarProps {
  onQuickWorkout?: () => void;
}

export function BottomNavigationBar({ onQuickWorkout }: BottomNavigationBarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { user, userProfile } = useAppContext()
  const [isGenerating, setIsGenerating] = useState(false)

  const handleMostRecentWorkout = () => {
    // Navigate to the most recent workout
    if (userProfile?.activePlan && typeof userProfile.activePlan === 'object' && 'id' in userProfile.activePlan && userProfile.activePlan.id && user) {
      router.push(`/workout/${user.uid}/${userProfile.activePlan.id}`)
    } else {
      // If no active workout, navigate to dashboard
      router.push('/dashboard')
    }
  }

  const handleCalendarView = () => {
    // Navigate to a mobile calendar view or dashboard with calendar focus
    router.push('/dashboard?view=calendar')
  }

  const handleQuickWorkout = async () => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    try {
      // Call the provided callback if available, otherwise trigger default generation
      if (onQuickWorkout) {
        onQuickWorkout();
      } else {
        // Navigate to dashboard and trigger workout generation
        router.push('/dashboard?generate=true')
      }
    } finally {
      setIsGenerating(false);
    }
  }

  const handleHistory = () => {
    // Navigate to dashboard with history focus
    router.push('/dashboard?view=history')
  }

  const handleProfile = () => {
    router.push('/profile')
  }

  const navItems = [
    { 
      key: "workout", 
      icon: Dumbbell, 
      label: "Workout", 
      action: handleMostRecentWorkout,
      isActive: (pathname === "/dashboard" || pathname?.startsWith("/workout")) ?? false
    },
    { 
      key: "calendar", 
      icon: Calendar, 
      label: "Calendar", 
      action: handleCalendarView,
      isActive: false // We'll handle calendar view state separately
    },
    { 
      key: "plus", 
      icon: Plus, 
      label: "Generate", 
      action: handleQuickWorkout,
      isActive: false, // Plus button doesn't stay active
      isSpecial: true // This will be styled as the prominent center button
    },
    { 
      key: "history", 
      icon: History, 
      label: "History", 
      action: handleHistory,
      isActive: false // We'll handle history view state separately
    },
    { 
      key: "profile", 
      icon: User, 
      label: "Profile", 
      action: handleProfile,
      isActive: pathname === "/profile"
    },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 z-50 border-t bg-white dark:bg-slate-900 shadow-lg md:hidden">
      <div className="flex justify-around items-center py-2 px-2">
        {navItems.map(({ key, icon: Icon, label, action, isActive, isSpecial }) => (
          <button
            key={key}
            onClick={action}
            disabled={key === "plus" && isGenerating}
            className={cn(
              "flex flex-col items-center justify-center p-2 rounded-lg transition-all duration-200",
              isSpecial
                ? cn(
                    "bg-orange-500 text-white shadow-lg transform -translate-y-1",
                    "hover:bg-orange-600 active:scale-95",
                    "w-14 h-14 rounded-full",
                    isGenerating && "opacity-50 cursor-not-allowed"
                  )
                : cn(
                    "text-xs min-h-[60px] w-16",
                    isActive 
                      ? "text-orange-500 dark:text-orange-400" 
                      : "text-slate-600 dark:text-slate-400 hover:text-slate-800 dark:hover:text-slate-200"
                  )
            )}
          >
            <Icon className={cn(
              isSpecial ? "h-6 w-6" : "h-5 w-5 mb-1",
              isGenerating && key === "plus" && "animate-spin"
            )} />
            {!isSpecial && (
              <span className="text-xs font-medium">{label}</span>
            )}
            {isSpecial && isGenerating && (
              <span className="text-xs font-medium mt-1">...</span>
            )}
          </button>
        ))}
      </div>
    </nav>
  )
}
