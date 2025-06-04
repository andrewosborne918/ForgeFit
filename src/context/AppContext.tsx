"use client"

import { createContext, useContext, useEffect, useState } from "react"
import { getAuth, onAuthStateChanged } from "firebase/auth"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { useRouter } from "next/navigation"
import { app } from "@/lib/firebase"
import { User } from "firebase/auth"

interface UserProfile {
  gender?: string;
  fitnessLevel?: string;
  goals?: string[];
  equipment?: string[];
  [key: string]: unknown;
}

interface AppContextType {
  user: User | null
  userProfile: UserProfile | null
  loading: boolean // Represents auth loading
  profileLoading: boolean // Represents profile loading
  setUserProfile: React.Dispatch<React.SetStateAction<UserProfile | null>>
}

const AppContext = createContext<AppContextType>({
  user: null,
  userProfile: null,
  loading: true,
  profileLoading: true, // Initialize profileLoading
  setUserProfile: () => {},
})

export const AppProvider = ({ children }: { children: React.ReactNode }) => {
  const [user, setUser] = useState<User | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [loading, setLoading] = useState(true) // Auth loading
  const [profileLoading, setProfileLoading] = useState(true) // Profile loading
  const router = useRouter()

  useEffect(() => {
    if (!app) {
      console.error("Firebase app not initialized in AppContext");
      setLoading(false);
      return;
    }
    const auth = getAuth(app)
    const unsubscribe = onAuthStateChanged(auth, (firebaseUser) => {
      console.log("Auth state changed:", firebaseUser)
      setUser(firebaseUser)
      setLoading(false)
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const fetchUserProfile = async () => {
      if (!user) {
        setUserProfile(null);
        setProfileLoading(false); // Profile loading ends if no user
        if (
          !window.location.pathname.startsWith("/auth") &&
          !window.location.pathname.startsWith("/marketing")
        ) {
          router.push("/auth/signin");
        }
        return;
      }

      setProfileLoading(true); // Profile loading starts
      try {
        if (!app) {
          throw new Error("Firebase app not initialized");
        }
        const db = getFirestore(app);
        const docRef = doc(db, "users", user.uid);
        const docSnap = await getDoc(docRef);
        const profile = docSnap.exists() ? docSnap.data().profile || null : null;

        setUserProfile(profile);

        if (!profile && !window.location.pathname.startsWith("/profile")) {
          router.push("/profile");
        }
      } catch (err) {
        console.error("Error loading user profile:", err);
        setUserProfile(null);
      } finally {
        setProfileLoading(false); // Profile loading ends
      }
    };

    if (!loading) fetchUserProfile(); // Fetch profile only after auth loading is done
  }, [user, loading, router]); // router added as dependency due to its usage


  return (
    <AppContext.Provider value={{ user, userProfile, loading, profileLoading, setUserProfile }}>
      {children}
    </AppContext.Provider>
  )
}

export const useAppContext = () => useContext(AppContext)
