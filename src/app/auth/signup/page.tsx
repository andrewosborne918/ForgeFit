"use client"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword, // Add this import
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
      return setError("Passwords do not match");
    }
    setLoading(true);
    setError("");

    // Step 1: Check for a soft-deleted account and try to reactivate
    try {
      const reactivateResponse = await fetch('/api/user/check-and-reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });

      if (reactivateResponse.ok) {
        // Account was reactivated. Now, sign the user in.
        await signInWithEmailAndPassword(auth, email, password);
        router.push("/profile");
        return; // Stop execution
      }

      if (reactivateResponse.status === 409) {
          // User exists and is active
          setError("An account with this email already exists. Please sign in.");
          setLoading(false);
          return;
      }

      // If status is 404 (Not Found), proceed to create a new account
      if (reactivateResponse.status !== 404) {
          const { error } = await reactivateResponse.json();
          throw new Error(error || "An unexpected error occurred during reactivation check.");
      }

    } catch (err: any) {
        // This catches network errors or issues with the reactivation API call itself
        setError(err.message);
        setLoading(false);
        return;
    }

    // Step 2: If not reactivated, create a new account
    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      if (!app) {
        throw new Error('Firebase app is not initialized');
      }
      
      const db = getFirestore(app);
      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        createdAt: serverTimestamp(),
        profile: {
          plan: 'free',
          workoutsGenerated: 0,
        },
      });

      router.push("/profile");
    } catch (err: unknown) {
      const error = err as FirebaseAuthError;
      // Firebase might throw 'auth/email-already-in-use' here if our check failed,
      // which is a good fallback.
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };


  const handleGoogle = async () => {
    setLoading(true);
    setError(""); // Clear any previous errors
    try {
      const provider = new GoogleAuthProvider();
      provider.addScope('email');
      provider.addScope('profile');
      
      const userCred = await signInWithPopup(auth, provider);
      const user = userCred.user;
      const userEmail = user.email;

      if (!userEmail) {
          throw new Error("Could not retrieve email from Google account.");
      }

      // Check for soft-deleted account and reactivate if needed
      const reactivateResponse = await fetch('/api/user/check-and-reactivate', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email: userEmail }),
      });

      if (reactivateResponse.ok || reactivateResponse.status === 409) {
          // If reactivated (200) or already active (409), just proceed to profile
          router.push("/profile");
          return;
      }

      // If 404 (Not Found), create the user document
      if (reactivateResponse.status === 404) {
          if (!app) {
            throw new Error('Firebase app is not initialized');
          }
          
          const db = getFirestore(app);
          await setDoc(doc(db, "users", user.uid), {
              uid: user.uid,
              email: user.email,
              createdAt: serverTimestamp(),
              profile: {
                  plan: 'free',
                  workoutsGenerated: 0,
              },
          }, { merge: true }); // Use merge to avoid overwriting existing data
          router.push("/profile");
          return;
      }
      
      const { error } = await reactivateResponse.json();
      throw new Error(error || "An unexpected error occurred.");

    } catch (err: any) {
      const error = err as FirebaseAuthError;
      setError(getAuthErrorMessage(error));
    } finally {
      setLoading(false);
    }
  };

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
