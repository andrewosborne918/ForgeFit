"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAuth,
  onAuthStateChanged,
  User,
  sendPasswordResetEmail,
} from "firebase/auth"
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { app, isFirebaseConfigured } from "@/lib/firebase"
import { getAuthErrorMessage, FirebaseAuthError } from "@/lib/authErrorHandler"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { toast } from "sonner"
import { BackgroundGrid } from "@/components/BackgroundGrid"
import { Logo } from "@/components/Logo"
import { CreditCard, Crown, Calendar, ExternalLink, Mail, Lock } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("male")
  const [goals, setGoals] = useState("")
  const [experience, setExperience] = useState("beginner")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [user, setUser] = useState<User | null>(null)

  // Subscription state
  const [subscriptionData, setSubscriptionData] = useState<{
    plan: 'free' | 'premium'
    workoutsGenerated: number
    currentPeriodEnd?: Date
    subscriptionId?: string
  }>({
    plan: 'free',
    workoutsGenerated: 0
  })
  const [billingLoading, setBillingLoading] = useState(false)
  const [passwordResetLoading, setPasswordResetLoading] = useState(false)

  // Function to refresh subscription data
  const refreshSubscriptionData = async (userId: string) => {
    try {
      console.log(`🔄 Refreshing subscription data for user: ${userId}`)
      if (!app || !isFirebaseConfigured) return
      
      const db = getFirestore(app)
      const userRef = doc(db, "users", userId)
      const docSnap = await getDoc(userRef)
      const userData = docSnap.exists() ? docSnap.data() : null
      
      console.log(`📊 User data from Firestore:`, userData)
      
      if (userData) {
        const profile = userData.profile || {};
        const newSubscriptionData = {
          plan: profile.plan || 'free',
          workoutsGenerated: profile.workoutsGenerated || 0,
          currentPeriodEnd: userData.currentPeriodEnd?.toDate(),
          subscriptionId: userData.subscriptionId
        }
        
        console.log(`✅ Setting new subscription data:`, newSubscriptionData)
        setSubscriptionData(newSubscriptionData)
      }
    } catch (error) {
      console.error("❌ Error refreshing subscription data:", error)
    }
  }

  useEffect(() => {
    if (!app || !isFirebaseConfigured) {
      console.error("Firebase app not initialized");
      return;
    }
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser && app && isFirebaseConfigured) {
        setUser(authUser)
        const db = getFirestore(app)
        const userRef = doc(db, "users", authUser.uid)
        const docSnap = await getDoc(userRef)
        const userData = docSnap.exists() ? docSnap.data() : null
        
        if (userData?.profile) {
          const profile = userData.profile
          setAge(profile.age?.toString() || "")
          setGender(profile.gender || "male")
          setGoals(profile.goals || "")
          setExperience(profile.experience || "beginner")
        }

        // Load subscription data
        if (userData) {
          const profile = userData.profile || {};
          setSubscriptionData({
            plan: profile.plan || 'free',
            workoutsGenerated: profile.workoutsGenerated || 0,
            currentPeriodEnd: userData.currentPeriodEnd?.toDate(),
            subscriptionId: userData.subscriptionId
          })
        }
      } else {
        setUser(null)
      }
    })
    return () => unsubscribe()
  }, [])

  // Refresh subscription data when the page becomes visible
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (!document.hidden && user) {
        refreshSubscriptionData(user.uid)
      }
    }

    const handleWorkoutGenerated = (event: Event) => {
      const customEvent = event as CustomEvent
      if (user && customEvent.detail?.userId === user.uid) {
        console.log('Workout generated detected, refreshing subscription data')
        refreshSubscriptionData(user.uid)
      }
    }

    document.addEventListener('visibilitychange', handleVisibilityChange)
    window.addEventListener('workoutGenerated', handleWorkoutGenerated)
    
    // Also refresh when the component mounts and user is available
    if (user) {
      refreshSubscriptionData(user.uid)
    }

    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange)
      window.removeEventListener('workoutGenerated', handleWorkoutGenerated)
    }
  }, [user])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (!app) {
        throw new Error("Firebase app not initialized");
      }
      const auth = getAuth(app)
      const currentUser = await new Promise<User>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          if (user) resolve(user)
          else reject(new Error("User not authenticated"))
        })
      })

      const db = getFirestore(app)
      await setDoc(doc(db, "users", currentUser.uid), {
        profile: {
          age: parseInt(age),
          gender,
          goals,
          experience,
        },
      }, { merge: true })

      toast.success("Profile saved successfully")
      router.push("/dashboard")
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setLoading(false)
    }
  }

  const handleManageBilling = async () => {
    if (!user) return
    
    setBillingLoading(true)
    try {
      const response = await fetch('/api/create-billing-portal', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: user.uid })
      })

      if (!response.ok) {
        throw new Error('Failed to create billing session')
      }

      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error accessing billing portal:', error)
      toast.error('Unable to access billing portal. Please try again.')
    } finally {
      setBillingLoading(false)
    }
  }

  const handleSubscribe = async () => {
    if (!user) return
    
    try {
      const response = await fetch('/api/create-checkout-session', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          email: user.email
        })
      })
      
      const { url } = await response.json()
      if (url) {
        window.location.href = url
      }
    } catch (error) {
      console.error('Error creating checkout session:', error)
      toast.error('Unable to start subscription. Please try again.')
    }
  }

  const handlePasswordReset = async () => {
    if (!user?.email) {
      toast.error('No email address found for password reset')
      return
    }

    setPasswordResetLoading(true)
    try {
      if (!app) {
        throw new Error("Firebase app not initialized");
      }
      const auth = getAuth(app)
      await sendPasswordResetEmail(auth, user.email)
      toast.success(`Password reset email sent to ${user.email}`)
    } catch (error) {
      console.error('Error sending password reset email:', error)
      const authError = error as FirebaseAuthError
      toast.error(getAuthErrorMessage(authError))
    } finally {
      setPasswordResetLoading(false)
    }
  }

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12 pb-safe-24 md:pb-12">
      {/* Background Grid */}
      <BackgroundGrid />
      
      {/* Form Container */}
      <div className="relative z-10 w-full max-w-2xl space-y-6 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 dark:border-slate-700/50">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto mb-4" width={150} height={48} alt="ForgeFit" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Profile</h1>
        </div>

        {/* Subscription Status Section */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3 mb-4">
            <Crown className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Subscription Status</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Plan:</span>              <Badge
                variant={subscriptionData.plan === 'premium' ? "default" : "secondary"}
                className={subscriptionData.plan === 'premium' ? "bg-orange-500 hover:bg-orange-600" : ""}
              >
                {subscriptionData.plan === 'premium' ? "Premium" : "Free"}
              </Badge>
            </div>
            
            <div className="flex items-center justify-between">
              <span className="text-slate-700 dark:text-slate-300">Workouts Generated:</span>
              <span className="font-medium text-slate-900 dark:text-white">
                {subscriptionData.workoutsGenerated} {subscriptionData.plan !== 'premium' && "/ 3"}
              </span>
            </div>

            {subscriptionData.plan === 'premium' && subscriptionData.currentPeriodEnd && (
              <div className="flex items-center justify-between">
                <span className="text-slate-700 dark:text-slate-300">Next Billing:</span>
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-slate-500" />
                  <span className="font-medium text-slate-900 dark:text-white">
                    {subscriptionData.currentPeriodEnd.toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}

            <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              {subscriptionData.plan === 'premium' ? (
                <Button
                  onClick={handleManageBilling}
                  disabled={billingLoading}
                  variant="outline"
                  className="w-full dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
                >
                  <CreditCard className="mr-2 h-4 w-4" />
                  {billingLoading ? "Loading..." : "Manage Billing"}
                  <ExternalLink className="ml-2 h-4 w-4" />
                </Button>
              ) : (
                <div className="space-y-3">
                  <div className="text-center">
                    <p className="text-sm text-slate-600 dark:text-slate-400 mb-2">
                      Upgrade to Premium for unlimited workouts
                    </p>
                    <p className="text-2xl font-bold text-orange-500">$9.99/month</p>
                  </div>
                  <Button
                    onClick={handleSubscribe}
                    className="w-full bg-orange-500 hover:bg-orange-600 text-white"
                  >
                    <Crown className="mr-2 h-4 w-4" />
                    Subscribe to Premium
                  </Button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Account Information Section */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
          <div className="flex items-center gap-3 mb-4">
            <Mail className="h-5 w-5 text-orange-500" />
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Account Information</h2>
          </div>
          
          <div className="space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
              <span className="text-slate-700 dark:text-slate-300 flex-shrink-0">Email Address:</span>
              <span className="font-medium text-slate-900 dark:text-white break-all text-right sm:text-left">
                {user?.email || "Not available"}
              </span>
            </div>
            
            <div className="pt-4 border-t border-slate-200 dark:border-slate-600">
              <Button
                onClick={handlePasswordReset}
                disabled={passwordResetLoading || !user?.email}
                variant="outline"
                className="w-full dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-600"
              >
                <Lock className="mr-2 h-4 w-4" />
                {passwordResetLoading ? "Sending..." : "Reset Password"}
              </Button>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-2 text-center">
                A password reset link will be sent to your email address
              </p>
            </div>
          </div>
        </div>

        {/* Fitness Profile Section */}
        <div className="bg-slate-50 dark:bg-slate-700/50 rounded-lg p-6 border border-slate-200 dark:border-slate-600">
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white mb-4">Fitness Profile</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="age" className="text-slate-700 dark:text-slate-300">Age</Label>
              <Input
                id="age"
                type="number"
                value={age}
                onChange={(e) => setAge(e.target.value)}
                className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                placeholder="Enter your age"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender" className="text-slate-700 dark:text-slate-300">Gender</Label>
              <select
                id="gender"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-primary"
                value={gender}
                onChange={(e) => setGender(e.target.value)}
              >
                <option value="male">Male</option>
                <option value="female">Female</option>
              </select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="goals" className="text-slate-700 dark:text-slate-300">Fitness Goals</Label>
              <Input
                id="goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
                placeholder="e.g., Lose weight, Build muscle, Stay fit"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="experience" className="text-slate-700 dark:text-slate-300">Experience Level</Label>
              <select
                id="experience"
                className="w-full border border-slate-300 dark:border-slate-600 rounded-md px-3 py-2 text-sm bg-white/50 dark:bg-slate-700/50 text-slate-900 dark:text-slate-100 focus:ring-2 focus:ring-primary focus:border-primary"
                value={experience}
                onChange={(e) => setExperience(e.target.value)}
              >
                <option value="beginner">Beginner</option>
                <option value="intermediate">Intermediate</option>
                <option value="advanced">Advanced</option>
              </select>
            </div>
          </div>
        </div>

        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}

        <Button 
          className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700" 
          onClick={handleSave} 
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}
