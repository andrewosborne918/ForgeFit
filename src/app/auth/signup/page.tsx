"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithPopup,
  GoogleAuthProvider,
} from "firebase/auth"
import {
  getFirestore,
  doc,
  setDoc,
  serverTimestamp,
} from "firebase/firestore"
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

export default function SignUpPage() {
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [error, setError] = useState("")
  const [loading, setLoading] = useState(false)
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

const handleSignUp = async () => {
  if (password !== confirmPassword) {
    return setError("Passwords do not match")
  }

  setLoading(true)
  try {
    if (!app) {
      throw new Error("Firebase app not initialized");
    }
    const auth = getAuth(app)
    const userCred = await createUserWithEmailAndPassword(auth, email, password)
    const user = userCred.user

    const db = getFirestore(app)
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
    })

    router.push("/profile")
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
    if (!app) {
      throw new Error("Firebase app not initialized");
    }
    const provider = new GoogleAuthProvider()
    provider.addScope('email')
    provider.addScope('profile')
    
    const userCred = await signInWithPopup(auth, provider)
    const user = userCred.user

    // Save to Firestore (merge with existing data if any)
    const db = getFirestore(app)
    await setDoc(doc(db, "users", user.uid), {
      uid: user.uid,
      email: user.email,
      createdAt: serverTimestamp(),
    }, { merge: true }) // Use merge to avoid overwriting existing data
    
    router.push("/profile")
  } catch (err: unknown) {
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
      <div className="relative z-10 w-full max-w-md space-y-6 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 dark:border-slate-700/50">
        <div className="text-center">
          <div>
            <Logo className="mx-auto h-12 w-auto mb-4" width={150} height={48} alt="ForgeFit" />
          </div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Create Your ForgeFit Account</h1>
        </div>
        <div className="space-y-2">
          <Label htmlFor="email" className="text-slate-700 dark:text-slate-300">Email</Label>
          <Input 
            id="email" 
            type="email" 
            value={email} 
            onChange={(e) => setEmail(e.target.value)} 
            className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
            placeholder="you@example.com"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="password" className="text-slate-700 dark:text-slate-300">Password</Label>
          <Input 
            id="password" 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
            placeholder="••••••••"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirmPassword" className="text-slate-700 dark:text-slate-300">Confirm Password</Label>
          <Input 
            id="confirmPassword" 
            type="password" 
            value={confirmPassword} 
            onChange={(e) => setConfirmPassword(e.target.value)} 
            className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
            placeholder="••••••••"
          />
        </div>
        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}
        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white" 
          onClick={handleSignUp} 
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Sign Up
        </Button>
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-slate-300 dark:border-slate-600" />
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white/95 dark:bg-slate-800/95 text-slate-500 dark:text-slate-400">Or continue with</span>
          </div>
        </div>
        <Button 
          variant="outline" 
          className="w-full border-slate-300 dark:border-slate-600 bg-white/50 dark:bg-slate-700/50 hover:bg-white/70 dark:hover:bg-slate-700/70" 
          onClick={handleGoogle}
          disabled={loading}
        >
          {loading ? <Loader2 className="animate-spin h-4 w-4 mr-2" /> : null}
          Sign up with Google
        </Button>
        <p className="text-sm text-center text-slate-600 dark:text-slate-400">
          Already have an account?{" "}
          <a className="text-primary hover:text-primary/90 dark:text-orange-400 dark:hover:text-orange-300 underline font-medium" href="/auth/signin">
            Sign In
          </a>
        </p>
      </div>
    </div>
  )
}
