"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import {
  getAuth,
  onAuthStateChanged,
  User,
} from "firebase/auth"
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore"
import { app, isFirebaseConfigured } from "@/lib/firebase"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { toast } from "sonner"
import { BackgroundGrid } from "@/components/BackgroundGrid"
import { Logo } from "@/components/Logo"

export default function ProfilePage() {
  const router = useRouter()
  const [age, setAge] = useState("")
  const [gender, setGender] = useState("male")
  const [goals, setGoals] = useState("")
  const [experience, setExperience] = useState("beginner")
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    if (!app || !isFirebaseConfigured) {
      console.error("Firebase app not initialized");
      return;
    }
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user && app && isFirebaseConfigured) {
        const db = getFirestore(app)
        const userRef = doc(db, "users", user.uid)
        const docSnap = await getDoc(userRef)
        const profile = docSnap.exists() ? docSnap.data().profile : null
        if (profile) {
          setAge(profile.age?.toString() || "")
          setGender(profile.gender || "male")
          setGoals(profile.goals || "")
          setExperience(profile.experience || "beginner")
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      if (!app) {
        throw new Error("Firebase app not initialized");
      }
      const auth = getAuth(app)
      const user = await new Promise<User>((resolve, reject) => {
        const unsubscribe = onAuthStateChanged(auth, (user) => {
          unsubscribe()
          if (user) resolve(user)
          else reject(new Error("User not authenticated"))
        })
      })

      const db = getFirestore(app)
      await setDoc(doc(db, "users", user.uid), {
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

  return (
    <div className="relative min-h-screen flex items-center justify-center px-4 py-12">
      {/* Background Grid */}
      <BackgroundGrid />
      
      {/* Form Container */}
      <div className="relative z-10 w-full max-w-md space-y-6 p-8 bg-white/95 dark:bg-slate-800/95 backdrop-blur-sm shadow-2xl rounded-2xl border border-white/20 dark:border-slate-700/50">
        <div className="text-center">
          <Logo className="mx-auto h-12 w-auto mb-4" width={150} height={48} alt="ForgeFit" />
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Your Fitness Profile</h1>
        </div>

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

        {error && <p className="text-red-500 dark:text-red-400 text-sm text-center">{error}</p>}

        <Button 
          className="w-full bg-primary hover:bg-primary/90 text-white" 
          onClick={handleSave} 
          disabled={loading}
        >
          {loading ? "Saving..." : "Save Profile"}
        </Button>
      </div>
    </div>
  )
}
