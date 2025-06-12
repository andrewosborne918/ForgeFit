"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { getAuth, signInWithEmailAndPassword, signInWithPopup, GoogleAuthProvider } from "firebase/auth"
import { app, isFirebaseConfigured } from "@/lib/firebase"
import { getAuthErrorMessage, FirebaseAuthError } from "@/lib/authErrorHandler"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Loader2 } from "lucide-react"
import { BackgroundGrid } from "@/components/BackgroundGrid"
import { Logo } from "@/components/Logo"

// Prevent static generation for this page
export const dynamic = 'force-dynamic'

export default function SignInPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [mounted, setMounted] = useState(false)
  const router = useRouter()

  useEffect(() => {
    setMounted(true)
  }, [])

  // Don't render anything until component is mounted (prevents SSR issues)
  if (!mounted) {
    return null
  }

  // Show configuration error if Firebase is not properly configured
  if (!isFirebaseConfigured) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center p-8">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Firebase Configuration Error</h1>
          <p className="text-gray-600">
            Firebase is not properly configured. Please check your environment variables.
          </p>
        </div>
      </div>
    )
  }

  if (!app) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center">
          <p className="text-muted-foreground">
            Firebase app not initialized. Please check your configuration.
          </p>
        </div>
      </div>
    )
  }

  const auth = getAuth(app)

  const handleSignIn = async () => {
    setLoading(true)
    try {
      await signInWithEmailAndPassword(auth, email, password)
      router.push("/dashboard")
    } catch (err: unknown) {
      const error = err as FirebaseAuthError
      setError(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  const handleGoogle = async () => {
    setLoading(true)
    setError("") // Clear any previous errors
    try {
      const provider = new GoogleAuthProvider()
      provider.addScope('email')
      provider.addScope('profile')
      
      await signInWithPopup(auth, provider)
      router.push("/dashboard")
    } catch (err: unknown) {
      console.error("❌ Google signin error:", err)
      const error = err as FirebaseAuthError
      setError(getAuthErrorMessage(error))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background Grid */}
      <BackgroundGrid />
      
      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md space-y-8 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 dark:border-slate-700/50">
        <div>
          <Logo className="mx-auto h-12 w-auto" width={150} height={48} alt="ForgeFit" />
          <h2 className="mt-6 text-center text-3xl font-extrabold text-slate-900 dark:text-white">
            Sign in to your account
          </h2>
        </div>
        <div className="space-y-6">
          <div>
            <Label htmlFor="email" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Email address</Label>
            <Input 
              id="email" 
              type="email" 
              value={email} 
              onChange={(e) => setEmail(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <Label htmlFor="password" className="block text-sm font-medium text-slate-700 dark:text-slate-300">Password</Label>
            <Input 
              id="password" 
              type="password" 
              value={password} 
              onChange={(e) => setPassword(e.target.value)} 
              className="mt-1 block w-full px-3 py-2 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm placeholder-slate-400 dark:placeholder-slate-500 focus:outline-none focus:ring-primary focus:border-primary sm:text-sm bg-white dark:bg-slate-700 text-slate-900 dark:text-slate-50"
              placeholder="••••••••"
            />
          </div>
        </div>
        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
        <Button className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary hover:bg-primary/90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark dark:bg-orange-500 dark:hover:bg-orange-600" onClick={handleSignIn} disabled={loading}>
          {loading ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : null}
          Sign In
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white dark:bg-slate-800 text-slate-500 dark:text-slate-400">Or continue with</span>
          </div>
        </div>
        <Button variant="outline" className="w-full flex justify-center py-2 px-4 border border-slate-300 dark:border-slate-600 rounded-md shadow-sm text-sm font-medium text-slate-700 dark:text-slate-200 bg-white dark:bg-slate-700 hover:bg-slate-50 dark:hover:bg-slate-600 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-dark" onClick={handleGoogle} disabled={loading}>
          {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Sign in with Google
        </Button>
        <p className="mt-8 text-center text-sm text-slate-600 dark:text-slate-400">
          Don&apos;t have an account?{" "}
          <a className="font-medium text-primary dark:text-orange-400 hover:text-primary/90 dark:hover:text-orange-300 underline" href="/auth/signup">
            Sign Up
          </a>
        </p>
      </div>
    </div>
  )
}
