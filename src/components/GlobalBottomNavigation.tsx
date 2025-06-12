"use client"

import { usePathname, useRouter } from "next/navigation"
import { BottomNavigationBar } from "@/components/BottomNavigationBar"
import { useState, useEffect } from "react"

interface GlobalBottomNavigationProps {
  children: React.ReactNode
}

export function GlobalBottomNavigation({ children }: GlobalBottomNavigationProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'history'>('dashboard')

  // Determine if we should show the bottom navigation
  const shouldShowBottomNav = () => {
    // Show on all app pages except auth, marketing, and API routes
    if (pathname?.startsWith('/auth') || 
        pathname?.startsWith('/api') || 
        pathname === '/' ||
        pathname?.startsWith('/marketing')) {
      return false
    }
    return true
  }

  // Update current view based on URL parameters when on dashboard
  useEffect(() => {
    if (pathname === '/dashboard') {
      const urlParams = new URLSearchParams(window.location.search)
      const view = urlParams.get('view')
      if (view === 'calendar' || view === 'history') {
        setCurrentView(view)
      } else {
        setCurrentView('dashboard')
      }
    }
  }, [pathname])

  const handleViewChange = (view: 'dashboard' | 'calendar' | 'history') => {
    setCurrentView(view)
    // If we're on dashboard, update the URL to reflect the view change
    if (pathname === '/dashboard') {
      const url = new URL(window.location.href)
      if (view === 'dashboard') {
        url.searchParams.delete('view')
      } else {
        url.searchParams.set('view', view)
      }
      window.history.pushState({}, '', url.toString())
      
      // Dispatch a custom event to notify the dashboard page of the view change
      window.dispatchEvent(new CustomEvent('dashboardViewChange', { 
        detail: { view } 
      }))
    }
  }

  const handleQuickWorkout = () => {
    // Navigate to dashboard and trigger workout generation
    if (pathname === '/dashboard') {
      // If already on dashboard, dispatch event to trigger workout generation
      window.dispatchEvent(new CustomEvent('triggerWorkoutGeneration'))
    } else {
      router.push('/dashboard?generate=true')
    }
  }

  return (
    <>
      {children}
      {shouldShowBottomNav() && (
        <BottomNavigationBar 
          onQuickWorkout={handleQuickWorkout}
          currentView={currentView}
          onViewChange={handleViewChange}
        />
      )}
    </>
  )
}
