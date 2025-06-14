"use client"

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAppContext } from '@/context/AppContext'; // Changed useAuth to useAppContext
import { useRouter, useSearchParams } from 'next/navigation';
import { app, isFirebaseConfigured } from '@/lib/firebase'; // Import app and isFirebaseConfigured
import { getFirestore, setDoc, doc, collection, query, orderBy, getDocs, deleteDoc, getDoc, writeBatch, QueryDocumentSnapshot, DocumentData } from 'firebase/firestore'; // Import firestore functions
// import LOADING_MESSAGES from "@/lib/loadingMessages" 
import Image from "next/image" 
import { Button } from "@/components/ui/button" 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog" 
import { getRandomLoadingMessage } from "@/lib/loadingMessages"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; 
import Link from 'next/link'; 
import { Loader2, Edit3, PlusCircle, Coffee, Repeat, Zap, CalendarPlus, Trash2, ImageIcon, XCircle, Eye, RefreshCw } from "lucide-react"; // Added RefreshCw icon
// import { Slider } from "@/components/ui/slider"
// import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"

const IMAGE_POOL_SIZE = 35

interface WorkoutAssignmentDetails {
  planId: string; 
  title: string;
  duration: string; 
  imageUrl?: string;
}

interface WorkoutPlan {
  id?: string;
  title?: string;
  duration?: string | number;
  imageUrl?: string;
  image?: string; // Support both image and imageUrl for backward compatibility
  plan?: {
    title?: string;
    goal?: string;
    duration?: string | number;
    notes?: string;
    workout?: {
      warmup?: ExerciseItem[];
      mainWorkout?: ExerciseItem[];
      cooldown?: ExerciseItem[];
    };
  };
}

interface ExerciseItem {
  exercise?: string;
  sets?: string | number;
  reps?: string | number;
  description?: string;
}

interface CompletedPlan {
  id: string;
  plan?: WorkoutPlan;
  image?: string;
  timestamp?: number;
  createdAt?: string;
}

interface DayAssignment {
  type: 'workout' | 'rest' | 'stretch' | null;
  workoutDetails?: WorkoutAssignmentDetails;
  workout?: WorkoutPlan; // Use proper type for the full plan object
}

// const DAYS_OF_WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
const DAYS_OF_WEEK_ABBREVIATED = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];


function getNextWorkoutImage(gender: string): string {
  const folder = gender === "female" ? "females" : "males"
  const prefix = gender === "female" ? "f_workout_" : "m_workout_"
  const key = `usedImages_${folder}`
  let used = JSON.parse(localStorage.getItem(key) || "[]")

  if (used.length >= IMAGE_POOL_SIZE) used = []

  const available = [...Array(IMAGE_POOL_SIZE).keys()].filter(i => !used.includes(i))
  const nextIndex = available[Math.floor(Math.random() * available.length)]
  used.push(nextIndex)
  localStorage.setItem(key, JSON.stringify(used))

  const filename = `${prefix}${nextIndex + 1}.jpg`
  return `/images/${folder}/${filename}`
}

function DashboardPageContent() {
  const { user, userProfile, setUserProfile, loading: authLoading } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // All React hooks must be called at the top level, before any early returns
  const [isModalOpen, setIsModalOpen] = useState(false); // This state controls the main generation modal
  // const [plan, setPlan] = useState<WorkoutPlan | null>(null) 
  // const [planImage, setPlanImage] = useState<string | null>(null)
  const [generating, setGenerating] = useState(false)
  const [completedPlans, setCompletedPlans] = useState<CompletedPlan[]>([]) 
  // const [loadingCompletedPlans, setLoadingCompletedPlans] = useState(true)
  const [planToDelete, setPlanToDelete] = useState<string | null>(null)
  // const [currentLoadingMessage, setCurrentLoadingMessage] = useState("")
  // const [usedMessages, setUsedMessages] = useState<string[]>([])

  const draggedWorkoutRef = useRef<WorkoutAssignmentDetails | null>(null);

  const [generatePlanCardImage, setGeneratePlanCardImage] = useState<string | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutPlan | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(45) 
  const [workoutType, setWorkoutType] = useState("fullBody") 
  
  const initialTargetMuscles = {
    upperBody: [] as string[],
    core: [] as string[],
    lowerBody: [] as string[],
  }
  const [targetMuscles, setTargetMuscles] = useState(initialTargetMuscles)
  
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([])
  const [otherEquipment, setOtherEquipment] = useState("")
  const [activeTab, setActiveTab] = useState("general")

  const [weeklySchedule, setWeeklySchedule] = useState<Array<DayAssignment | null>>(Array(7).fill(null));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [isDayOptionsModalOpen, setIsDayOptionsModalOpen] = useState(false);
  const [assigningWorkoutToDayIndex, setAssigningWorkoutToDayIndex] = useState<number | null>(null);

  // Subscription modal state
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState("");

  // Loading message state
  const [loadingMessage, setLoadingMessage] = useState<string>("");

  // Day assignment modal for workout cards
  const [isAssignWorkoutModalOpen, setIsAssignWorkoutModalOpen] = useState(false);
  const [workoutToAssign, setWorkoutToAssign] = useState<WorkoutAssignmentDetails | null>(null);

  // const [isAssignToDayModalOpen, setIsAssignToDayModalOpen] = useState(false);
  // const [workoutToAssign, setWorkoutToAssign] = useState<WorkoutAssignmentDetails | null>(null);

  // New state for the Workout Edit Options Modal
  const [isWorkoutEditModalOpen, setIsWorkoutEditModalOpen] = useState(false);
  const [dayIndexForWorkoutEdit, setDayIndexForWorkoutEdit] = useState<number | null>(null);

  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false); // State for Clear All confirmation dialog

  // Mobile view state for bottom navigation
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'history' | 'workout'>('workout');

  // Check URL parameters for navigation state
  useEffect(() => {
    if (!searchParams) return;
    
    const view = searchParams.get('view');
    const shouldGenerate = searchParams.get('generate');
    
    if (view === 'calendar') {
      setCurrentView('calendar');
    } else if (view === 'history') {
      setCurrentView('history');
    } else if (view === 'workout') {
      setCurrentView('workout');
    } else {
      setCurrentView('workout');
    }
    
    if (shouldGenerate === 'true') {
      setIsModalOpen(true);
      // Remove the parameter from URL to prevent repeated triggering
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('generate');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

  // Listen for bottom navigation events from GlobalBottomNavigation
  useEffect(() => {
    const handleViewChange = (event: CustomEvent) => {
      setCurrentView(event.detail.view);
    };

    const handleWorkoutGeneration = () => {
      setIsModalOpen(true);
    };

    window.addEventListener('dashboardViewChange', handleViewChange as EventListener);
    window.addEventListener('triggerWorkoutGeneration', handleWorkoutGeneration);

    return () => {
      window.removeEventListener('dashboardViewChange', handleViewChange as EventListener);
      window.removeEventListener('triggerWorkoutGeneration', handleWorkoutGeneration);
    };
  }, []);

  // All useEffect hooks must be called before any early returns
  // 1. On mount, load weeklySchedule from Firestore subcollection (users/{uid}/weeklySchedule/{dayIndex})
  useEffect(() => {
    if (!user || !app || !isFirebaseConfigured) return;
    const db = getFirestore(app);
    const fetchWeeklySchedule = async () => {
      try {
        const scheduleCol = collection(db, `users/${user.uid}/weeklySchedule`);
        const snapshot = await getDocs(scheduleCol);
        const scheduleArr: Array<DayAssignment | null> = Array(7).fill(null);
        snapshot.forEach((docSnap: QueryDocumentSnapshot<DocumentData>) => { // Explicitly type docSnap
          const idx = parseInt(docSnap.id, 10);
          if (!isNaN(idx) && idx >= 0 && idx < 7) {
            scheduleArr[idx] = docSnap.data() as DayAssignment; // Consider a more specific type assertion or validation
          }
        });
        setWeeklySchedule(scheduleArr);
      } catch (err) {
        console.error("Error loading weekly schedule from Firestore:", err);
      }
    };
    fetchWeeklySchedule();
  }, [user]);

  // Load current active workout from userProfile
  useEffect(() => {
    if (userProfile?.activePlan) {
      setCurrentWorkout(userProfile.activePlan);
    } else {
      setCurrentWorkout(null);
    }
  }, [userProfile]);

  // Always fetch the latest user profile from Firestore on mount or when user changes
  useEffect(() => {
    if (!user || !app || !isFirebaseConfigured) {
      console.log("Dashboard ProfileFetch: No user or app, skipping profile fetch.");
      return;
    }
    const db = getFirestore(app);
    console.log("Dashboard ProfileFetch: User detected (uid:", user.uid, "), attempting to fetch profile.");
    const fetchUserProfile = async () => {
      try {
        const userDocRef = doc(db, "users", user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data();
          console.log("Dashboard ProfileFetch: Profile data fetched from Firestore:", JSON.stringify(userData));
          if (setUserProfile) {
            console.log("Dashboard ProfileFetch: Calling setUserProfile with fetched data.");
            setUserProfile(userData as UserProfile);
          }
        } else {
          console.log("Dashboard ProfileFetch: User document not found in Firestore for uid:", user.uid);
          if (setUserProfile) {
            console.log("Dashboard ProfileFetch: Setting userProfile to null as Firestore doc not found.");
            setUserProfile(null); 
          }
        }
      } catch (err) {
        console.error("Dashboard ProfileFetch: Error fetching user profile from Firestore:", err);
      }
    };
    fetchUserProfile();
  }, [user, setUserProfile]);

  useEffect(() => {
    if (userProfile?.gender) {
      setGeneratePlanCardImage(getNextWorkoutImage(userProfile.gender));
    }
  }, [userProfile?.gender]);

  useEffect(() => {
    if (user && app && isFirebaseConfigured) {
      const db = getFirestore(app);
      const fetchCompletedPlans = async () => {
        // db is already initialized
        const logsCollectionRef = collection(db, `users/${user.uid}/logs`);
        const q = query(logsCollectionRef, orderBy("timestamp", "desc")); 

        try {
          const querySnapshot = await getDocs(q);
          const plans = querySnapshot.docs.map((doc: QueryDocumentSnapshot<DocumentData>) => ({ // Explicitly type doc
            id: doc.id,
            ...doc.data()
          } as CompletedPlan)); // Consider a more specific type assertion or validation
          setCompletedPlans(plans);
        } catch (error) {
          console.error("Error fetching completed plans:", error);
        }
      };

      fetchCompletedPlans();
    } else {
      setCompletedPlans([]); 
    }
  }, [user]); 

  // Handle Firebase app initialization safely - moved after all hooks
  if (!app || !isFirebaseConfigured) {
    console.error("Firebase app not initialized");
    return <div>Firebase configuration error</div>;
  }
  
  const db = getFirestore(app);

  // ADDED: handleEquipmentChange function
  const handleEquipmentChange = (item: string, checked: boolean) => {
    setSelectedEquipment(prev => 
      checked ? [...prev, item] : prev.filter(eq => eq !== item)
    );
  };

  // ADDED: handleTargetMuscleChange function
  const handleTargetMuscleChange = (category: keyof typeof initialTargetMuscles, muscle: string, checked: boolean) => {
    setTargetMuscles(prev => {
      const newCategoryMuscles = checked 
        ? [...(prev[category] || []), muscle]
        : (prev[category] || []).filter(m => m !== muscle);
      return { ...prev, [category]: newCategoryMuscles };
    });
  };

  // ADDED: handleSelectAllMuscles function
  const handleSelectAllMuscles = (category: keyof typeof initialTargetMuscles, checked: boolean) => {
    setTargetMuscles(prev => ({
      ...prev,
      [category]: checked ? muscleGroups[category] : [],
    }));
  };

  // Convert completed plan to workout assignment details
  const convertCompletedPlanToWorkoutDetails = (completedPlan: CompletedPlan): WorkoutAssignmentDetails => {
    const planTitle = completedPlan.plan?.plan?.title || completedPlan.plan?.title || "Unnamed Workout";
    const planDurationValue = completedPlan.plan?.plan?.duration || completedPlan.plan?.duration;
    const planDuration = planDurationValue 
      ? (typeof planDurationValue === 'number' ? formatDuration(planDurationValue) : planDurationValue.toString())
      : "Duration not set";
    const planImage = completedPlan.image || completedPlan.plan?.imageUrl || completedPlan.plan?.image;
    
    return {
      planId: completedPlan.id,
      title: planTitle,
      duration: planDuration,
      ...(planImage && { imageUrl: planImage }),
    };
  };

  // Handle opening the day assignment modal for a workout
  const handleOpenWorkoutAssignmentModal = (completedPlan: CompletedPlan) => {
    const workoutDetails = convertCompletedPlanToWorkoutDetails(completedPlan);
    setWorkoutToAssign(workoutDetails);
    setIsAssignWorkoutModalOpen(true);
  };

  // Handle assigning workout to a specific day
  const handleAssignWorkoutToSpecificDay = async (dayIndex: number) => {
    if (!workoutToAssign || dayIndex < 0 || dayIndex >= 7) return;

    await assignWorkoutToDay(dayIndex, workoutToAssign);
    setIsAssignWorkoutModalOpen(false);
    setWorkoutToAssign(null);
  };

  const formatDuration = (minutes: number): string => {
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const remainingMinutes = minutes % 60;
      return remainingMinutes > 0 ? `${hours}h ${remainingMinutes}m` : `${hours}h`;
    }
    return `${minutes}m`;
  };

  // const getRandomLoadingMessage = () => {
  //   let availableMessages = LOADING_MESSAGES.filter(msg => !usedMessages.includes(msg));
  //   if (availableMessages.length === 0) {
  //     availableMessages = LOADING_MESSAGES; 
  //     setUsedMessages([]);
  //   }
  //   const randomIndex = Math.floor(Math.random() * availableMessages.length);
  //   const selectedMessage = availableMessages[randomIndex];
  //   setUsedMessages(prev => [...prev, selectedMessage]);
  //   // setCurrentLoadingMessage(selectedMessage);
  // };


  // const arePlansEffectivelyEqual = (planA: WorkoutPlan | null, planB: WorkoutPlan | null): boolean => {
  //   if (!planA || !planB) return false;
  //   if (planA.title !== planB.title) return false;
  //   if (planA.duration !== planB.duration) return false;
    
  //   if ((planA.goal || null) !== (planB.goal || null)) return false;
  
  //   const workoutA = planA.workout;
  //   const workoutB = planB.workout;
  
  //   if (!workoutA && !workoutB) return true; 
  //   if (!workoutA || !workoutB) return false; 
  
  //   const compareSection = (sectionA: ExerciseItem[] | undefined, sectionB: ExerciseItem[] | undefined): boolean => {
  //     const normSectionA = sectionA || []; 
  //     const normSectionB = sectionB || []; 
      
  //     if (normSectionA.length !== normSectionB.length) return false;
  //     return true;
  //   };
  
  //   if (!compareSection(workoutA.warmup, workoutB.warmup)) return false;
  //   if (!compareSection(workoutA.mainWorkout, workoutB.mainWorkout)) return false;
  //   if (!compareSection(workoutA.cooldown, workoutB.cooldown)) return false;
  
  //   return true;
  // };

  const handleDeletePlan = async (planId: string) => {
    if (!user) {
      console.warn("User not available for handleDeletePlan.");
      return;
    }
    try {
      // db is already initialized
      const planRef = doc(db, `users/${user.uid}/logs/${planId}`);
      await deleteDoc(planRef);
      setCompletedPlans(prevPlans => prevPlans.filter(p => p.id !== planId));
      setPlanToDelete(null); 
    } catch (error) {
      console.error("Error deleting plan:", error);
      alert("Failed to delete plan. Please try again.");
    }
  };

interface GenerationPreferences {
  duration?: number;
  type?: string;
  muscles?: typeof initialTargetMuscles | null;
  equipment?: string[];
  otherEquipment?: string;
}

interface UserProfile {
  gender?: string;
  fitnessLevel?: string;
  goals?: string[];
  equipment?: string[];
  name?: string;
  plan?: 'free' | 'premium';
  workoutsGenerated?: number;
  activePlan?: WorkoutPlan | null; // Added to reflect usage
}

  const generatePlan = async (preferences?: GenerationPreferences) => {
    setGenerating(true)
    setLoadingMessage(getRandomLoadingMessage()) // Set random loading message
    setIsModalOpen(false)
    
    if (!user) {
      console.error("User not authenticated");
      setGenerating(false);
      return;
    }

    // Check subscription limit on client-side
    console.log(`🔍 Client-side limit check for user:`)
    console.log(`   Plan: ${userProfile?.plan}`)
    console.log(`   Workouts Generated: ${userProfile?.workoutsGenerated}`)
    console.log(`   Is Premium: ${userProfile?.plan === "premium"}`)
    console.log(`   Should Block: ${userProfile?.plan !== "premium" && (userProfile?.workoutsGenerated || 0) >= 3}`)
    
    if (userProfile?.plan !== "premium" && (userProfile?.workoutsGenerated || 0) >= 3) {
      console.log("❌ CLIENT BLOCKING: Free limit reached, showing subscription modal");
      setGenerating(false);
      setIsSubscriptionModalOpen(true);
      return;
    }
    
    console.log("✅ CLIENT ALLOWING: User can generate workout");

    try {
      const requestBody = preferences ? 
        { userProfile, preferences, userId: user.uid } : 
        { userProfile, userId: user.uid };

      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(requestBody) 
      })

      // Check if the response indicates subscription limit exceeded
      if (res.status === 403) {
        const errorData = await res.json();
        if (errorData.error === "Free limit reached. Upgrade to generate more." || errorData.error === "limit-exceeded") {
          setGenerating(false);
          setIsSubscriptionModalOpen(true);
          return;
        }
      }

      const data = await res.json()
      let raw = data?.text || ""
      
      // Enhanced mobile-friendly JSON cleaning
      raw = raw.trim();
      
      // Remove markdown code blocks
      if (raw.startsWith('```json')) {
        raw = raw.replace(/^```json\s*/, '');
      }
      if (raw.startsWith('```')) {
        raw = raw.replace(/^```\s*/, '');
      }
      if (raw.endsWith('```')) {
        raw = raw.replace(/\s*```$/, '');
      }
      
      raw = raw.trim(); 

      // Enhanced cleanup for mobile compatibility
      raw = raw.replace(/,\s*([}\]])/g, '$1'); // Remove trailing commas
      raw = raw.replace(/[\u2018\u2019]/g, "'"); // Replace smart quotes with regular quotes
      raw = raw.replace(/[\u201C\u201D]/g, '"'); // Replace smart double quotes
      raw = raw.replace(/\u2013|\u2014/g, '-'); // Replace em/en dashes
      raw = raw.replace(/\u00A0/g, ' '); // Replace non-breaking spaces
      raw = raw.replace(/[\r\n\t]/g, ' '); // Replace line breaks and tabs with spaces
      raw = raw.replace(/\s+/g, ' '); // Collapse multiple spaces

      console.log("Raw JSON from AI:", raw);
      console.log("Mobile/Device info:", {
        userAgent: navigator.userAgent,
        isMobile: /Mobi|Android/i.test(navigator.userAgent),
        jsonLength: raw.length
      });

      try {
        const json = JSON.parse(raw);
        console.log("Parsed JSON object from AI:", JSON.stringify(json, null, 2)); // DETAILED LOGGING

        // Ensure json.duration is a number for assignment logic
        let numericDuration: number | undefined = undefined;
        if (typeof json.duration === 'number') {
          numericDuration = json.duration;
        } else if (typeof json.duration === 'string') {
          const parsed = parseInt(json.duration, 10); // Extracts the first sequence of digits
          if (!isNaN(parsed)) {
            numericDuration = parsed;
            console.log(`Converted string duration "${json.duration}" to number ${numericDuration}`);
          } else {
            console.warn(`Could not parse string duration "${json.duration}" to a number.`);
          }
        } else if (json.duration) {
            console.warn(`json.duration is neither a string nor a number. Type: ${typeof json.duration}, Value: ${json.duration}`);
        }


        let imageUrlToUse = generatePlanCardImage;

        if (!imageUrlToUse && userProfile?.gender) {
          console.warn("generatePlanCardImage was not set for the new plan, fetching a new one as fallback.");
          imageUrlToUse = getNextWorkoutImage(userProfile.gender);
        }

        if (imageUrlToUse) {
          json.imageUrl = imageUrlToUse;
        }

        if (!json.id) {
          json.id = `generated-${Date.now()}`;
        }

        // Structure the plan data to match workout detail page expectations
        const goalString = Array.isArray(userProfile?.goals) 
          ? userProfile.goals.join(", ") 
          : (typeof userProfile?.goals === 'string' ? userProfile.goals : "General Fitness");

        const wrappedPlan = { 
          id: json.id,
          title: json.title,
          ...(json.imageUrl && { image: json.imageUrl }), // Only include image if it exists
          plan: {
            title: json.title,
            goal: goalString,
            duration: json.duration,
            notes: json.notes || "", // Provide fallback for undefined notes
            workout: json.workout
          }
        };
        setCurrentWorkout(wrappedPlan); // Update the current workout state
        localStorage.setItem("activeWorkoutPlan", JSON.stringify(wrappedPlan));

        if (user) {
          // Ensure no undefined values before saving to Firebase
          const cleanWrappedPlan = {
            id: wrappedPlan.id,
            title: wrappedPlan.title,
            ...(wrappedPlan.image && { image: wrappedPlan.image }), // Only include image if it exists
            plan: {
              ...wrappedPlan.plan,
              goal: goalString, // Use the same converted string
              notes: wrappedPlan.plan.notes || ""
            }
          };
          await setDoc(doc(db, "users", user.uid), { activePlan: cleanWrappedPlan }, { merge: true });
          // --- Ensure generated plan is also saved to logs for detail page access ---
          if (json.id) {
            const logRef = doc(db, `users/${user.uid}/logs/${json.id}`);
            await setDoc(logRef, {
              id: wrappedPlan.id,
              title: wrappedPlan.title,
              ...(wrappedPlan.image && { image: wrappedPlan.image }), // Only include image if it exists
              plan: {
                ...wrappedPlan.plan,
                goal: goalString, // Use the same converted string
                notes: wrappedPlan.plan.notes || ""
              },
              createdAt: new Date().toISOString(),
              timestamp: json.id.startsWith('generated-') ? Number(json.id.replace('generated-', '')) : Date.now(),
            });
            
            // Add to completed plans list immediately for workout history
            const newCompletedPlan: CompletedPlan = {
              id: json.id,
              plan: wrappedPlan,
              ...(json.imageUrl && { image: json.imageUrl }), // Only include image if it exists
              timestamp: json.id.startsWith('generated-') ? Number(json.id.replace('generated-', '')) : Date.now(),
              createdAt: new Date().toISOString(),
            };
            setCompletedPlans(prevPlans => [newCompletedPlan, ...prevPlans]);
          }
        }

        if (setUserProfile && userProfile) {
          setUserProfile({ ...userProfile, activePlan: wrappedPlan });
        }

        if (assigningWorkoutToDayIndex !== null) { 
          if (json && json.title && typeof numericDuration === 'number') { 
            const workoutDetails: WorkoutAssignmentDetails = {
              planId: json.id || `generated-${Date.now()}`,
              title: json.title,
              duration: formatDuration(numericDuration),
              ...(json.imageUrl && { imageUrl: json.imageUrl }), // Only include imageUrl if it exists
            };
            const updatedSchedule = [...weeklySchedule];
            // --- Save the full plan object as 'workout' ---
            updatedSchedule[assigningWorkoutToDayIndex] = { 
              type: 'workout', 
              workoutDetails, 
              workout: {
                ...wrappedPlan,
                plan: {
                  ...wrappedPlan.plan,
                  goal: goalString, // Use the same converted string
                  notes: wrappedPlan.plan.notes || ""
                }
              }
            };
            setWeeklySchedule(updatedSchedule);
            // Immediately persist this assignment to Firestore for the day, including the full plan as 'workout'
            await updateDayAssignmentInFirestore(assigningWorkoutToDayIndex, { 
              type: 'workout', 
              workoutDetails, 
              workout: {
                ...wrappedPlan,
                plan: {
                  ...wrappedPlan.plan,
                  goal: goalString, // Use the same converted string
                  notes: wrappedPlan.plan.notes || ""
                }
              }
            });
          } else {
            // Enhanced warning message
            console.warn(`Generated plan for day ${assigningWorkoutToDayIndex} was empty or invalid. Details - Title: ${json?.title}, Parsed Numeric Duration: ${numericDuration}, Original Duration Type: ${typeof json?.duration}, Original Duration Value: ${json?.duration}. No assignment made to the schedule.`);
          }
          setAssigningWorkoutToDayIndex(null);
        }

        if (preferences) {
          const equipmentPrefsToSave = {
            selectedEquipment: preferences.equipment || [],
            otherEquipment: preferences.otherEquipment || ""
          };
          localStorage.setItem("lastUsedEquipmentPrefs", JSON.stringify(equipmentPrefsToSave));
        }

        if (userProfile?.gender) {
          setGeneratePlanCardImage(getNextWorkoutImage(userProfile.gender));
        }
        
        // Note: Workout count is incremented server-side in generate-plan API to prevent double counting
        
        // Notify other components that a workout has been generated
        localStorage.setItem('lastWorkoutGenerated', Date.now().toString());
        window.dispatchEvent(new CustomEvent('workoutGenerated', { 
          detail: { userId: user.uid, timestamp: Date.now() } 
        }));
      } catch (parseError: unknown) {
        console.error("Failed to parse cleaned JSON:", parseError);
        console.error("Problematic raw string:", raw);
        console.error("Mobile debug info:", {
          userAgent: navigator.userAgent,
          isMobile: /Mobi|Android/i.test(navigator.userAgent),
          jsonLength: raw.length,
          firstChars: raw.substring(0, 100),
          lastChars: raw.substring(raw.length - 100),
          errorType: parseError instanceof Error ? parseError.name : 'Unknown',
          errorMessage: parseError instanceof Error ? parseError.message : 'Unknown error'
        });
        
        // Try one more time with even more aggressive cleaning for mobile
        try {
          let mobileCleanedRaw = raw;
          // Remove any invisible characters
          mobileCleanedRaw = mobileCleanedRaw.replace(/[\u0000-\u001F\u007F-\u009F]/g, ' ');
          // Ensure proper JSON structure
          if (!mobileCleanedRaw.startsWith('{')) {
            const firstBrace = mobileCleanedRaw.indexOf('{');
            if (firstBrace !== -1) {
              mobileCleanedRaw = mobileCleanedRaw.substring(firstBrace);
            }
          }
          if (!mobileCleanedRaw.endsWith('}')) {
            const lastBrace = mobileCleanedRaw.lastIndexOf('}');
            if (lastBrace !== -1) {
              mobileCleanedRaw = mobileCleanedRaw.substring(0, lastBrace + 1);
            }
          }
          
          console.log("Attempting mobile-optimized parse:", mobileCleanedRaw.substring(0, 200));
          const mobileJson = JSON.parse(mobileCleanedRaw);
          console.log("✅ Mobile-optimized parse successful!");
          
          // Continue with the successfully parsed JSON
          const json = mobileJson;
          
          // ... continue with existing logic after successful parse
          console.log("Parsed JSON object from AI:", JSON.stringify(json, null, 2));

          // Ensure json.duration is a number for assignment logic
          let numericDuration: number | undefined = undefined;
          if (typeof json.duration === 'number') {
            numericDuration = json.duration;
          } else if (typeof json.duration === 'string') {
            const parsed = parseInt(json.duration, 10);
            if (!isNaN(parsed)) {
              numericDuration = parsed;
              console.log(`Converted string duration "${json.duration}" to number ${numericDuration}`);
            } else {
              console.warn(`Could not parse string duration "${json.duration}" to a number.`);
            }
          } else if (json.duration) {
              console.warn(`json.duration is neither a string nor a number. Type: ${typeof json.duration}, Value: ${json.duration}`);
          }

          let imageUrlToUse = generatePlanCardImage;

          if (!imageUrlToUse && userProfile?.gender) {
            console.warn("generatePlanCardImage was not set for the new plan, fetching a new one as fallback.");
            imageUrlToUse = getNextWorkoutImage(userProfile.gender);
          }

          if (imageUrlToUse) {
            json.imageUrl = imageUrlToUse;
          }

          if (!json.id) {
            json.id = `generated-${Date.now()}`;
          }

          // Structure the plan data to match workout detail page expectations
          const goalString = Array.isArray(userProfile?.goals) 
            ? userProfile.goals.join(", ") 
            : (typeof userProfile?.goals === 'string' ? userProfile.goals : "General Fitness");

          const wrappedPlan = { 
            id: json.id,
            title: json.title,
            ...(json.imageUrl && { image: json.imageUrl }),
            plan: {
              title: json.title,
              goal: goalString,
              duration: json.duration,
              notes: json.notes || "",
              workout: json.workout
            }
          };
          setCurrentWorkout(wrappedPlan);
          localStorage.setItem("activeWorkoutPlan", JSON.stringify(wrappedPlan));

          if (user) {
            const cleanWrappedPlan = {
              id: wrappedPlan.id,
              title: wrappedPlan.title,
              ...(wrappedPlan.image && { image: wrappedPlan.image }),
              plan: {
                ...wrappedPlan.plan,
                goal: goalString,
                notes: wrappedPlan.plan.notes || ""
              }
            };
            await setDoc(doc(db, "users", user.uid), { activePlan: cleanWrappedPlan }, { merge: true });
            
            if (json.id) {
              const logRef = doc(db, `users/${user.uid}/logs/${json.id}`);
              await setDoc(logRef, {
                id: wrappedPlan.id,
                title: wrappedPlan.title,
                ...(wrappedPlan.image && { image: wrappedPlan.image }),
                plan: {
                  ...wrappedPlan.plan,
                  goal: goalString,
                  notes: wrappedPlan.plan.notes || ""
                },
                createdAt: new Date().toISOString(),
                timestamp: json.id.startsWith('generated-') ? Number(json.id.replace('generated-', '')) : Date.now(),
              });
              
              const newCompletedPlan: CompletedPlan = {
                id: json.id,
                plan: wrappedPlan,
                ...(json.imageUrl && { image: json.imageUrl }),
                timestamp: json.id.startsWith('generated-') ? Number(json.id.replace('generated-', '')) : Date.now(),
                createdAt: new Date().toISOString(),
              };
              setCompletedPlans(prevPlans => [newCompletedPlan, ...prevPlans]);
            }
          }

          if (setUserProfile && userProfile) {
            setUserProfile({ ...userProfile, activePlan: wrappedPlan });
          }

          if (assigningWorkoutToDayIndex !== null) { 
            if (json && json.title && typeof numericDuration === 'number') { 
              const workoutDetails: WorkoutAssignmentDetails = {
                planId: json.id || `generated-${Date.now()}`,
                title: json.title,
                duration: formatDuration(numericDuration),
                ...(json.imageUrl && { imageUrl: json.imageUrl }),
              };
              const updatedSchedule = [...weeklySchedule];
              updatedSchedule[assigningWorkoutToDayIndex] = { 
                type: 'workout', 
                workoutDetails, 
                workout: {
                  ...wrappedPlan,
                  plan: {
                    ...wrappedPlan.plan,
                    goal: goalString,
                    notes: wrappedPlan.plan.notes || ""
                  }
                }
              };
              setWeeklySchedule(updatedSchedule);
              await updateDayAssignmentInFirestore(assigningWorkoutToDayIndex, { 
                type: 'workout', 
                workoutDetails, 
                workout: {
                  ...wrappedPlan,
                  plan: {
                    ...wrappedPlan.plan,
                    goal: goalString,
                    notes: wrappedPlan.plan.notes || ""
                  }
                }
              });
            } else {
              console.warn(`Generated plan for day ${assigningWorkoutToDayIndex} was empty or invalid. Details - Title: ${json?.title}, Parsed Numeric Duration: ${numericDuration}, Original Duration Type: ${typeof json?.duration}, Original Duration Value: ${json?.duration}. No assignment made to the schedule.`);
            }
            setAssigningWorkoutToDayIndex(null);
          }

          if (preferences) {
            const equipmentPrefsToSave = {
              selectedEquipment: preferences.equipment || [],
              otherEquipment: preferences.otherEquipment || ""
            };
            localStorage.setItem("lastUsedEquipmentPrefs", JSON.stringify(equipmentPrefsToSave));
          }

          if (userProfile?.gender) {
            setGeneratePlanCardImage(getNextWorkoutImage(userProfile.gender));
          }
          
          localStorage.setItem('lastWorkoutGenerated', Date.now().toString());
          window.dispatchEvent(new CustomEvent('workoutGenerated', { 
            detail: { userId: user.uid, timestamp: Date.now() } 
          }));
          
        } catch (mobileFallbackError) {
          console.error("Mobile fallback parsing also failed:", mobileFallbackError);
          alert(`Failed to generate workout plan due to parsing error on mobile device. 

Device: ${/Mobi|Android/i.test(navigator.userAgent) ? 'Mobile' : 'Desktop'}
Error: ${parseError instanceof Error ? parseError.message : 'Unknown'}

Please try again or contact support if the issue persists.`);
          setAssigningWorkoutToDayIndex(null);
        }
      }
    } catch (err) {
      alert("Failed to generate workout plan. Please try again.")
      console.error("Failed to generate plan:", err)
      setAssigningWorkoutToDayIndex(null); 
    } finally {
      setGenerating(false)
      setLoadingMessage("") // Clear loading message
      // clearInterval(messageInterval); 
    }
  }

  // const handleViewAndStartActivePlan = async () => {
  //   if (!user || !plan) {
  //     console.warn("User or active plan not available for handleViewAndStartActivePlan.")
  //     return;
  //   }

  //   const existingPlanEntry = completedPlans.find(loggedPlan => 
  //     arePlansEffectivelyEqual(plan, loggedPlan.plan)
  //   );

  //   if (existingPlanEntry) {
  //     console.log("Duplicate plan found in history. Navigating to existing log.");
  //     router.push(`/workout/${user.uid}/${existingPlanEntry.id}`);
  //     return; 
  //   }

  //   setGenerating(true);
  //   try {
  //     const timestamp = Date.now();
  //     // db is already initialized

  //     const logRef = doc(db, `users/${user.uid}/logs/${timestamp}`);
  //     await setDoc(logRef, {
  //       plan: plan, 
  //       image: plan.imageUrl || planImage, 
  //       createdAt: new Date().toISOString(),
  //       timestamp: timestamp,
  //     });

  //     router.push(`/workout/${user.uid}/${timestamp}`);

  //   } catch (err) {
  //     console.error("Error starting and logging active plan:", err);
  //     alert("Failed to start and log workout. Please try again.");
  //   } finally {
  //     setGenerating(false);
  //   }
  // };

  const handleDayCardClick = (index: number) => {
    // Always open DayOptionsModal when a card is clicked, unless a workout is being assigned to *this* day
    if (generating && assigningWorkoutToDayIndex === index) return;
    setSelectedDayIndex(index);
    setIsDayOptionsModalOpen(true);
  };

  const handleDragStart = (event: React.DragEvent<HTMLDivElement>, workoutDetails: WorkoutAssignmentDetails) => {
    draggedWorkoutRef.current = workoutDetails;
    event.dataTransfer.effectAllowed = "move";
    event.dataTransfer.setData("text/plain", workoutDetails.planId);
  };

  const handleDragOver = (event: React.DragEvent<HTMLDivElement>) => {
    event.preventDefault(); 
    // Allow drop always, as global edit mode is removed.
    event.dataTransfer.dropEffect = "move";
  };

  const handleDrop = (event: React.DragEvent<HTMLDivElement>, dayIndex: number) => {
    event.preventDefault();
    // Allow drop always if draggedWorkoutRef.current is set.
    if (!draggedWorkoutRef.current) return;

    assignWorkoutToDay(dayIndex, draggedWorkoutRef.current);
    draggedWorkoutRef.current = null; 
  };

  const assignWorkoutToDay = async (dayIndex: number, workoutDetails: WorkoutAssignmentDetails) => {
    if (dayIndex < 0 || dayIndex >= 7) return;

    const newAssignment: DayAssignment = {
      type: 'workout',
      workoutDetails: { ...workoutDetails },
    };
    const updatedSchedule = [...weeklySchedule];
    updatedSchedule[dayIndex] = newAssignment;
    setWeeklySchedule(updatedSchedule);
    await updateDayAssignmentInFirestore(dayIndex, newAssignment);
  };
  
  const handleSetDayAsType = async (dayIndex: number, type: 'rest' | 'stretch') => {
    if (dayIndex < 0 || dayIndex >= 7) return;

    const updatedSchedule = [...weeklySchedule];
    updatedSchedule[dayIndex] = { type };
    setWeeklySchedule(updatedSchedule);
    await updateDayAssignmentInFirestore(dayIndex, { type });
    setIsDayOptionsModalOpen(false);
    setSelectedDayIndex(null);
  };

  const handleUnassignDay = async (dayIndex: number) => {
    if (dayIndex < 0 || dayIndex >= 7) return;
    const newSchedule = [...weeklySchedule];
    newSchedule[dayIndex] = null;
    setWeeklySchedule(newSchedule);
    await updateDayAssignmentInFirestore(dayIndex, null);
    setIsDayOptionsModalOpen(false);
    setIsWorkoutEditModalOpen(false);
    setSelectedDayIndex(null);
    setDayIndexForWorkoutEdit(null);
  };

  // const handleOpenAssignToDayModal = (/* workoutDetails: WorkoutAssignmentDetails */) => {
  //   // setWorkoutToAssign(workoutDetails);
  //   // setIsAssignToDayModalOpen(true);
  //   // No longer need to manage isEditingSchedule here
  // };

  // const handleAssignWorkoutToSpecificDay = async (dayIndex: number) => {
  //   if (!workoutToAssign || dayIndex < 0 || dayIndex >= 7) return;

  //   const newAssignment: DayAssignment = {
  //     type: 'workout',
  //     workoutDetails: { ...workoutToAssign },
  //   };

  //   const updatedSchedule = [...weeklySchedule];
  //   updatedSchedule[dayIndex] = newAssignment;
  //   setWeeklySchedule(updatedSchedule);
  //   // const success = await updateDayAssignmentInFirestore(dayIndex, newAssignment);
  //   await updateDayAssignmentInFirestore(dayIndex, newAssignment);
  //   setIsAssignToDayModalOpen(false);
  //   setWorkoutToAssign(null);
  //   // No longer need to set isEditingSchedule to false
  // };

  // Functions for the new Workout Edit Options Modal
  const handleOpenWorkoutEditModal = (index: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation(); // Prevent DayOptionsModal from opening if clicked from button
    setDayIndexForWorkoutEdit(index);
    setIsWorkoutEditModalOpen(true);
  };

  const handleReplaceWorkoutFromModal = () => {
    if (dayIndexForWorkoutEdit === null) return;
    setAssigningWorkoutToDayIndex(dayIndexForWorkoutEdit);
    setIsModalOpen(true); // Open main generation modal
    setIsWorkoutEditModalOpen(false);
    setDayIndexForWorkoutEdit(null);
  };

  // --- Per-day Firestore update function ---
  const updateDayAssignmentInFirestore = async (dayIndex: number, assignment: DayAssignment | null) => {
    if (!user) return;
    const dayDocRef = doc(db, `users/${user.uid}/weeklySchedule/${dayIndex}`);
    try {
      if (assignment) {
        await setDoc(dayDocRef, assignment);
      } else {
        await deleteDoc(dayDocRef);
      }
      return true;
    } catch (err) {
      console.error(`Error updating day ${dayIndex} in Firestore:`, err);
      return false;
    }
  };

  // Clear all weekly schedule assignments
  const handleClearAllAssignments = async () => {
    if (!user) return;
    // Optimistically clear UI
    setWeeklySchedule(Array(7).fill(null));
    // Remove all assignments from Firestore
    try {
      const batch = writeBatch(db);
      for (let i = 0; i < 7; i++) {
        const dayDocRef = doc(db, `users/${user.uid}/weeklySchedule/${i}`);
        batch.delete(dayDocRef);
      }
      await batch.commit();
    } catch (err) {
      console.error("Error clearing all weekly schedule assignments:", err);
      alert("Failed to clear all assignments. Please try again.");
    }
    setIsClearAllDialogOpen(false);
  };

  if (authLoading) {
    return <div className="text-center p-6 dark:text-slate-100"><Loader2 className="animate-spin h-5 w-5 mr-2 inline" /> Loading...</div>
  }

  const handleGeneratePlanClick = () => {
    const preferences = {
      duration: workoutDuration,
      type: workoutType,
      muscles: workoutType === "target-muscle" ? targetMuscles : null, 
      equipment: selectedEquipment,
      otherEquipment: otherEquipment,
    };
    generatePlan(preferences);
  };

  const muscleGroups = {
    upperBody: ["Chest", "Back", "Shoulders", "Biceps", "Triceps"],
    core: ["Abs", "Obliques"],
    lowerBody: ["Quads", "Hamstrings", "Glutes", "Calves"],
  };

  const equipmentList = [
    "Dumbbells", "Barbell", "Kettlebells", "Resistance Bands", "Bench", 
    "Pull-up Bar", "Cable Machine", "Leg Press Machine", "Treadmill", 
    "Stationary Bike", "Elliptical", "Yoga Mat"
  ];



  // Mobile Calendar View Component
  const MobileCalendarView = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">Weekly Schedule</h2>
      <div className="space-y-3">
        {DAYS_OF_WEEK_ABBREVIATED.map((dayName, index) => {
          const dayAssignment = weeklySchedule[index];
          const isAssigningToThisDay = generating && assigningWorkoutToDayIndex === index;
          const fullDayName = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][index];
          
          return (
            <div
              key={index}
              className={`rounded-lg p-4 shadow-md border-2 transition-all duration-200 ${
                isAssigningToThisDay 
                  ? 'bg-slate-100 dark:bg-slate-800 border-orange-500 opacity-70' 
                  : dayAssignment?.type === 'workout' 
                    ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800' 
                    : dayAssignment?.type === 'rest' 
                      ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800' 
                      : dayAssignment?.type === 'stretch' 
                        ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800' 
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => !isAssigningToThisDay && handleDayCardClick(index)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-700 dark:text-slate-200">{fullDayName}</h3>
                    {dayAssignment?.type === 'workout' && dayAssignment.workoutDetails ? (
                      <div className="mt-2">
                        <p className="font-medium text-blue-700 dark:text-blue-300 truncate">
                          {dayAssignment.workoutDetails.title}
                        </p>
                        <p className="text-sm text-blue-600 dark:text-blue-400">
                          {dayAssignment.workoutDetails.duration}
                        </p>
                      </div>
                    ) : dayAssignment?.type === 'rest' ? (
                      <p className="text-green-600 dark:text-green-300 mt-1">Rest Day</p>
                    ) : dayAssignment?.type === 'stretch' ? (
                      <p className="text-yellow-600 dark:text-yellow-300 mt-1">Stretch Day</p>
                    ) : (
                      <p className="text-slate-500 dark:text-slate-400 mt-1">No assignment</p>
                    )}
                  </div>
                </div>
                
                {dayAssignment?.type === 'workout' && dayAssignment.workoutDetails?.imageUrl && (
                  <div className="w-16 h-16 rounded-lg overflow-hidden flex-shrink-0">
                    <Image 
                      src={dayAssignment.workoutDetails.imageUrl} 
                      alt="Workout" 
                      width={64} 
                      height={64} 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                )}
                
                {isAssigningToThisDay && (
                  <div className="flex items-center space-x-2">
                    <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-orange-600 dark:text-orange-400">
                        Assigning workout...
                      </span>
                      {loadingMessage && (
                        <span className="text-xs text-orange-500 dark:text-orange-300">
                          {loadingMessage.slice(0, 40)}...
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Mobile History View Component
  const MobileHistoryView = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">Workout History</h2>
      {completedPlans.length > 0 ? (
        <div className="space-y-3">
          {completedPlans.map((p) => {
            const planTitle = p.plan?.plan?.title || p.plan?.title || "Unnamed Workout";
            const planDurationValue = p.plan?.plan?.duration || p.plan?.duration;
            const planDuration = planDurationValue 
              ? (typeof planDurationValue === 'number' ? formatDuration(planDurationValue) : planDurationValue.toString())
              : "Duration not set";
            const planImage = p.image || p.plan?.imageUrl || p.plan?.image;
            
            return (
              <div
                key={p.id}
                className="p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-md border border-slate-200 dark:border-slate-700"
              >
                <div className="flex items-center space-x-4">
                  {planImage ? (
                    <div className="w-16 h-16 relative rounded-lg overflow-hidden flex-shrink-0">
                      <Image
                        src={planImage}
                        alt={planTitle}
                        fill
                        sizes="64px"
                        className="object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-16 h-16 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-lg flex-shrink-0">
                      <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate-500" />
                    </div>
                  )}
                  
                  <div className="flex-1 min-w-0">
                    <Link 
                      href={`/workout/${user?.uid}/${p.id}`} 
                      className="font-medium text-primary dark:text-orange-400 hover:underline block truncate"
                    >
                      {planTitle}
                    </Link>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 mt-1">
                      {planDuration}
                    </p>
                    {p.createdAt && (
                      <p className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                        {new Date(p.createdAt).toLocaleDateString()}
                      </p>
                    )}
                  </div>
                  
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleOpenWorkoutAssignmentModal(p);
                      }}
                      className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300"
                      title="Assign to schedule"
                    >
                      <CalendarPlus className="h-5 w-5" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        if (user?.uid) {
                          router.push(`/workout/${user.uid}/${p.id}`);
                        }
                      }}
                      className="flex-shrink-0"
                    >
                      Start
                    </Button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-muted-foreground dark:text-slate-400 text-lg">No completed workouts yet</p>
          <p className="text-slate-500 dark:text-slate-500 text-sm mt-2">Generate your first workout to get started!</p>
        </div>
      )}
    </div>
  );

  // Mobile Workout View Component
  const MobileWorkoutView = () => (
    <div className="space-y-6">
      <div className="flex items-center justify-between mb-6">
        <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">Current Workout</h2>
      </div>
      
      {currentWorkout ? (
        <div className="bg-white dark:bg-slate-800/50 shadow-lg rounded-lg overflow-hidden relative">
          {/* Loading overlay for current workout generation */}
          {generating && assigningWorkoutToDayIndex === null && (
            <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
              <Loader2 className="animate-spin h-10 w-10 text-orange-500 mb-3" />
              <p className="text-base font-semibold text-slate-700 dark:text-slate-200 mb-2">Generating Your Workout...</p>
              {loadingMessage && (
                <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs text-center leading-relaxed px-4">
                  {loadingMessage}
                </p>
              )}
            </div>
          )}
          
          {/* Header with refresh button */}
          <div className="flex justify-between items-center p-4 border-b border-slate-200 dark:border-slate-700">
            <h3 className="text-lg font-semibold text-slate-700 dark:text-slate-200">Ready to Start</h3>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setIsModalOpen(true)}
              className="text-slate-500 hover:text-orange-500 dark:text-slate-400 dark:hover:text-orange-400 hover:bg-orange-50 dark:hover:bg-orange-900/20"
              title="Generate new workout"
            >
              <RefreshCw className="h-5 w-5" />
            </Button>
          </div>
          
          {/* Workout card content */}
          <div className="p-6">
            {/* Image */}
            <div className="w-full aspect-video relative mb-6 rounded-lg overflow-hidden shadow-md">
              {(currentWorkout.image || currentWorkout.imageUrl) ? (
                <Image
                  src={currentWorkout.image || currentWorkout.imageUrl!}
                  alt={currentWorkout.title || "Current workout"}
                  fill
                  sizes="(max-width: 768px) 100vw, 50vw"
                  className={`object-cover transition-all duration-300 ${generating && assigningWorkoutToDayIndex === null ? 'blur-sm' : ''}`}
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                </div>
              )}
            </div>
            
            {/* Title and duration */}
            <div className="text-center mb-6 space-y-2">
              <h4 className="text-xl font-bold text-slate-800 dark:text-slate-100">
                {currentWorkout.plan?.title || currentWorkout.title || "Current Workout"}
              </h4>
              <div className="inline-flex items-center px-3 py-1 rounded-full bg-slate-100 dark:bg-slate-700">
                <p className="text-sm font-medium text-slate-600 dark:text-slate-400">
                  Duration: {currentWorkout.plan?.duration || currentWorkout.duration || "Not specified"}
                </p>
              </div>
            </div>
            
            {/* Start button */}
            <Button
              onClick={() => {
                if (currentWorkout.id && user) {
                  router.push(`/workout/${user.uid}/${currentWorkout.id}`);
                }
              }}
              disabled={!currentWorkout.id}
              className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700 text-lg py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
            >
              <Zap className="mr-2 h-6 w-6" /> Start Workout
            </Button>
          </div>
        </div>
      ) : (
        /* No workout state */
        <div className="bg-white dark:bg-slate-800/50 shadow-lg rounded-lg p-8 text-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 rounded-lg flex items-center justify-center mx-auto mb-6">
            <ImageIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">No Active Workout</h3>
          <p className="text-slate-600 dark:text-slate-400 mb-8 leading-relaxed">Generate your first AI-powered workout to get started on your fitness journey!</p>
          <Button
            onClick={() => setIsModalOpen(true)}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700 text-lg py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200"
          >
            <Zap className="mr-2 h-6 w-6" /> Generate Workout
          </Button>
        </div>
      )}
    </div>
  );

  return (
    <div className="container mx-auto px-4 py-8 pb-safe-24 md:pb-8">
      {/* Mobile View Conditional Rendering */}
      <div className="md:hidden">
        {currentView === 'calendar' && <MobileCalendarView />}
        {currentView === 'history' && <MobileHistoryView />}
        {currentView === 'workout' && <MobileWorkoutView />}
        {currentView === 'dashboard' && (
          <>
            {/* Current Workout Card for Mobile */}
            {currentWorkout && (
              <section className="mb-8">
                <div className="bg-white dark:bg-slate-800/50 shadow-lg rounded-lg p-6">
                  <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Current Workout</h3>
                  <div className="flex items-center space-x-4">
                    {(currentWorkout.image || currentWorkout.imageUrl) ? (
                      <div className="w-20 h-20 relative rounded-lg overflow-hidden flex-shrink-0">
                        <Image
                          src={currentWorkout.image || currentWorkout.imageUrl!}
                          alt={currentWorkout.title || "Current workout"}
                          fill
                          sizes="80px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-20 h-20 bg-slate-200 dark:bg-slate700 flex items-center justify-center rounded-lg flex-shrink-0">
                        <ImageIcon className="h-10 w-10 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    
                    <div className="flex-1 min-w-0">
                      <h4 className="font-bold text-primary dark:text-orange-400 truncate">
                        {currentWorkout.plan?.title || currentWorkout.title || "Current Workout"}
                      </h4>
                      <p className="text-sm text-muted-foreground dark:text-slate-400">
                        {currentWorkout.plan?.duration || currentWorkout.duration || "Not specified"}
                      </p>
                    </div>
                    
                    <Button
                      onClick={() => {
                        if (currentWorkout.id && user) {
                          router.push(`/workout/${user.uid}/${currentWorkout.id}`);
                        }
                      }}
                      disabled={!currentWorkout.id}
                      className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
                    >
                      Start
                    </Button>
                  </div>
                </div>
              </section>
            )}

            {/* Quick Overview for Mobile */}
            <section className="mb-8">
              <h2 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Quick Overview</h2>
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-blue-50 dark:bg-blue-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-blue-600 dark:text-blue-400">
                    {weeklySchedule.filter(day => day?.type === 'workout').length}
                  </div>
                  <div className="text-sm text-blue-700 dark:text-blue-300">Workouts This Week</div>
                </div>
                <div className="bg-green-50 dark:bg-green-900/30 p-4 rounded-lg text-center">
                  <div className="text-2xl font-bold text-green-600 dark:text-green-400">
                    {completedPlans.length}
                  </div>
                  <div className="text-sm text-green-700 dark:text-green-300">Total Workouts</div>
                </div>
              </div>
            </section>
          </>
        )}
      </div>

      {/* Desktop View (Hidden on Mobile) */}
      <div className="hidden md:block">
        {/* Header */}
        <header className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-slate-800 dark:text-slate-100">Welcome, {String(userProfile?.name || "let's get fit")}!</h1>
            <p className="mt-2 text-lg text-muted-foreground dark:text-slate-400">
              Ready to forge your best self? Let&apos;s get started.
            </p>
          </div>
          <div className="flex items-center gap-4">
            <Button 
              variant="default" 
              size="lg" 
              className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
              onClick={() => setIsModalOpen(true)}
            >
              <Zap className="mr-2 h-5 w-5" /> Generate Workout
            </Button>
          </div>
        </header>

        {/* Weekly Schedule Section */}
        <section className="mb-12">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200">Weekly Schedule</h2>
            <Button
              variant="outline"
              size="sm"
              className="text-destructive border-destructive hover:bg-destructive/10 dark:text-red-500 dark:border-red-500 dark:hover:bg-red-900/20"
              onClick={() => setIsClearAllDialogOpen(true)}
            >
              Clear All
            </Button>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-7 gap-3 sm:gap-4">
            {DAYS_OF_WEEK_ABBREVIATED.map((dayName, index) => {
              const dayAssignment = weeklySchedule[index];
              const isAssigningToThisDay = generating && assigningWorkoutToDayIndex === index;
              const canInteractWithCard = !isAssigningToThisDay;
              
              return (
                <div
                  key={index}
                  className={`rounded-lg p-3 sm:p-4 shadow-md flex flex-col items-center justify-start min-h-[160px] sm:min-h-[180px] relative transition-all duration-200 ease-in-out ${
                    canInteractWithCard ? 'cursor-pointer hover:shadow-lg hover:border-orange-400 dark:hover:border-orange-500 border-2 border-transparent' : 'border-2 border-transparent'
                  } ${
                    isAssigningToThisDay 
                      ? 'bg-slate-100 dark:bg-slate-800 ring-2 ring-orange-500 opacity-70' 
                      : dayAssignment?.type === 'workout' 
                        ? 'bg-blue-50 dark:bg-blue-900/30' 
                        : dayAssignment?.type === 'rest' 
                          ? 'bg-green-50 dark:bg-green-900/30' 
                          : dayAssignment?.type === 'stretch' 
                            ? 'bg-yellow-50 dark:bg-yellow-900/30' 
                            : 'bg-slate-50 dark:bg-slate-800/60'
                  }`}
                  onClick={() => canInteractWithCard && handleDayCardClick(index)}
                  onDragOver={canInteractWithCard ? handleDragOver : undefined}
                  onDrop={canInteractWithCard ? (e) => handleDrop(e, index) : undefined}
                >
                  {/* Edit button for assigned workouts */}
                  {dayAssignment?.type === 'workout' && canInteractWithCard && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleOpenWorkoutEditModal(index, e)}
                      className="absolute top-1 right-1 z-20 p-1 h-7 w-7 bg-slate-100/70 dark:bg-slate-700/70 text-slate-600 dark:text-slate-300 rounded-full hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
                    >
                      <Edit3 size={16} />
                    </Button>
                  )}

                  {isAssigningToThisDay ? (
                    <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/70 dark:bg-slate-800/70 rounded-lg">
                      <Loader2 className="animate-spin h-8 w-8 text-orange-500" />
                      <p className="text-sm text-slate-600 dark:text-slate-300 mt-2">Assigning...</p>
                      {loadingMessage && (
                        <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 text-center px-2 leading-tight">
                          {loadingMessage}
                        </p>
                      )}
                    </div>
                  ) : (
                    <>
                      <p className="font-semibold text-sm sm:text-base text-slate-700 dark:text-slate-200 mb-1 sm:mb-2">{dayName}</p>
                      {dayAssignment?.type === 'workout' && dayAssignment.workoutDetails ? (
                        <div
                          className="w-full text-center p-1 sm:p-2 rounded bg-blue-100 dark:bg-blue-800/50 text-blue-700 dark:text-blue-300 text-xs sm:text-sm flex flex-col items-center cursor-pointer hover:ring-2 hover:ring-blue-400 dark:hover:ring-blue-500"
                          onClick={(e) => {
                            e.stopPropagation();
                            if (dayAssignment?.type === 'workout' && dayAssignment.workoutDetails?.planId && user?.uid) {
                              router.push(`/workout/${user.uid}/${dayAssignment.workoutDetails.planId}`);
                            }
                          }}
                          draggable={true}
                          onDragStart={(e) => dayAssignment.workoutDetails && handleDragStart(e, dayAssignment.workoutDetails)}
                        >
                          {dayAssignment.workoutDetails.imageUrl && 
                            <Image src={dayAssignment.workoutDetails.imageUrl} alt="Workout" width={80} height={60} className="rounded object-cover mb-1 h-12 sm:h-16 w-full pointer-events-none" />
                          }
                          <span className="font-medium block truncate w-full pointer-events-none" title={dayAssignment.workoutDetails.title}>{dayAssignment.workoutDetails.title}</span>
                          <span className="text-xs text-blue-600 dark:text-blue-400 pointer-events-none">{dayAssignment.workoutDetails.duration}</span>
                        </div>
                      ) : dayAssignment?.type === 'rest' ? (
                        <div className="text-center pointer-events-none">
                          <Coffee size={24} className="text-green-500 dark:text-green-400 mx-auto mb-1" />
                          <p className="text-xs sm:text-sm text-green-600 dark:text-green-300">Rest Day</p>
                        </div>
                      ) : dayAssignment?.type === 'stretch' ? (
                        <div className="text-center pointer-events-none">
                          <Repeat size={24} className="text-yellow-500 dark:text-yellow-400 mx-auto mb-1" />
                          <p className="text-xs sm:text-sm text-yellow-600 dark:text-yellow-300">Stretch Day</p>
                        </div>
                      ) : (
                        <div className="text-center pointer-events-none">
                          <PlusCircle size={24} className="text-slate-400 dark:text-slate-500 mx-auto mb-1" />
                          <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">Assign</p>
                        </div>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </section>

        {/* Workout History and Generate Plan section */}
        <section className="mb-12">
          <div className="flex flex-col lg:flex-row gap-6 items-stretch">
            {/* Workout History Card */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="bg-white dark:bg-slate-800/50 shadow-lg rounded-lg p-6 flex flex-col h-[540px]">
                <h3 className="text-xl font-semibold mb-4 text-slate-700 dark:text-slate-200">Workout History</h3>
                {completedPlans.length > 0 ? (
                  <div className="flex-1 space-y-4 overflow-y-auto">
                    {completedPlans.map((p) => {
                      const planTitle = p.plan?.plan?.title || p.plan?.title || "Unnamed Workout";
                      const planDurationValue = p.plan?.plan?.duration || p.plan?.duration;
                      const planDuration = planDurationValue 
                        ? (typeof planDurationValue === 'number' ? formatDuration(planDurationValue) : planDurationValue.toString())
                        : "Duration not set";
                      const planImage = p.image || p.plan?.imageUrl || p.plan?.image;
                      
                      return (
                        <div
                          key={p.id}
                          className="p-3 bg-slate-50 dark:bg-slate-700/50 rounded-md shadow-sm flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-2 sm:space-y-0"
                        >
                          <div className="flex items-center space-x-3 flex-grow">
                            {planImage ? (
                              <div className="w-12 h-12 relative rounded-md overflow-hidden flex-shrink-0">
                                <Image
                                  src={planImage}
                                  alt={planTitle}
                                  fill
                                  sizes="48px"
                                  className="object-cover"
                                />
                              </div>
                            ) : (
                              <div className="w-12 h-12 flex items-center justify-center bg-slate-200 dark:bg-slate-700 rounded-md flex-shrink-0">
                                <ImageIcon className="h-6 w-6 text-slate-400 dark:text-slate-500" />
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <Link href={`/workout/${user?.uid}/${p.id}`} className="font-medium text-primary dark:text-orange-400 hover:underline">
                                {planTitle}
                              </Link>
                              <p className="text-xs text-muted-foreground dark:text-slate-400 truncate">
                                {planDuration}
                              </p>
                            </div>
                          </div>
                          <div className="flex items-center space-x-2 flex-shrink-0">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleOpenWorkoutAssignmentModal(p);
                              }}
                              className="text-orange-500 hover:text-orange-600 dark:text-orange-400 dark:hover:text-orange-300 w-8 h-8"
                              title="Assign to schedule"
                            >
                              <CalendarPlus className="h-4 w-4" />
                            </Button>
                            <AlertDialog>
                              <AlertDialogTrigger asChild>
                                <Button variant="ghost" size="icon" onClick={() => setPlanToDelete(p.id)} className="text-destructive hover:text-destructive/80 dark:text-red-500 dark:hover:text-red-400 w-8 h-8">
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </AlertDialogTrigger>
                              {planToDelete === p.id && (
                                <AlertDialogContent className="bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100">
                                  <AlertDialogHeader>
                                    <AlertDialogTitle>Are you sure?</AlertDialogTitle>
                                    <AlertDialogDescription>
                                      This action cannot be undone. This will permanently delete the workout log for &quot;{planTitle}&quot;.
                                    </AlertDialogDescription>
                                  </AlertDialogHeader>
                                  <AlertDialogFooter>
                                    <AlertDialogCancel onClick={() => setPlanToDelete(null)} className="dark:text-slate-100 dark:border-slate-600 dark:hover:bg-slate-700">Cancel</AlertDialogCancel>
                                    <AlertDialogAction onClick={() => handleDeletePlan(p.id)} className="bg-destructive hover:bg-destructive/90 dark:bg-red-600 dark:hover:bg-red-700 dark:text-white">Delete</AlertDialogAction>
                                  </AlertDialogFooter>
                                </AlertDialogContent>
                              )}
                            </AlertDialog>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <p className="text-muted-foreground dark:text-slate-400">No completed workouts yet. Go crush one!</p>
                  </div>
                )}
              </div>
            </div>

            {/* Generate Plan Card or Current Workout Card */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div className="bg-white dark:bg-slate-800/50 shadow-lg rounded-lg overflow-hidden flex flex-col items-center text-center p-6 md:p-8 h-[540px] justify-between relative">
                {/* Loading overlay for current workout generation */}
                {generating && assigningWorkoutToDayIndex === null && (
                  <div className="absolute inset-0 bg-white/90 dark:bg-slate-800/90 backdrop-blur-sm flex flex-col items-center justify-center z-10 rounded-lg">
                    <Loader2 className="animate-spin h-12 w-12 text-orange-500 mb-4" />
                    <p className="text-lg font-semibold text-slate-700 dark:text-slate-200 mb-2">Generating Your Workout...</p>
                    {loadingMessage && (
                      <p className="text-sm text-slate-600 dark:text-slate-400 max-w-xs text-center leading-relaxed">
                        {loadingMessage}
                      </p>
                    )}
                  </div>
                )}
                
                {currentWorkout ? (
                  <>
                    <div className="w-full flex justify-end mb-2">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsModalOpen(true)}
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                      >
                        <RefreshCw className="h-5 w-5" />
                      </Button>
                    </div>
                    
                    {(currentWorkout.image || currentWorkout.imageUrl) ? (
                      <div className="w-full max-w-[220px] aspect-square relative mb-4 rounded-lg overflow-hidden">
                        <Image
                          src={currentWorkout.image || currentWorkout.imageUrl!}
                          alt={currentWorkout.title || "Current workout"}
                          fill
                          sizes="220px"
                          className={`object-cover transition-all duration-300 ${generating && assigningWorkoutToDayIndex === null ? 'blur-sm' : ''}`}
                        />
                      </div>
                    ) : (
                      <div className="w-full max-w-[220px] aspect-square bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-4 rounded-lg">
                        <ImageIcon className="h-20 w-20 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    
                    <div className="flex-1 flex flex-col justify-center mb-4">
                      <h3 className="text-xl font-bold text-primary dark:text-orange-400 mb-2">
                        {currentWorkout.plan?.title || currentWorkout.title || "Current Workout"}
                      </h3>
                      <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4">
                        Duration: {currentWorkout.plan?.duration || currentWorkout.duration || "Not specified"}
                      </p>
                    </div>
                    
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
                      onClick={() => {
                        if (currentWorkout.id && user) {
                          router.push(`/workout/${user.uid}/${currentWorkout.id}`);
                        }
                      }}
                      disabled={!currentWorkout.id}
                    >
                      <Zap className="mr-2 h-5 w-5" /> Start Workout
                    </Button>
                  </>
                ) : (
                  <>
                    {generatePlanCardImage ? (
                      <div className="w-full max-w-[220px] aspect-square relative mb-6 rounded-lg overflow-hidden">
                        <Image
                          src={generatePlanCardImage}
                          alt="Generate new workout plan"
                          fill
                          sizes="220px"
                          className="object-cover"
                        />
                      </div>
                    ) : (
                      <div className="w-full max-w-[220px] aspect-square bg-slate-200 dark:bg-slate-700 flex items-center justify-center mb-6 rounded-lg">
                        <ImageIcon className="h-20 w-20 text-slate-400 dark:text-slate-500" />
                      </div>
                    )}
                    <h3 className="text-xl font-bold text-primary dark:text-orange-400 mb-2">Generate a Single Plan</h3>
                    <p className="text-sm text-muted-foreground dark:text-slate-400 mb-4 max-w-xs">
                      Ready to forge your best self? Let our AI craft a personalized workout plan just for you.
                    </p>
                    <Button
                      variant="default"
                      size="lg"
                      className="w-full max-w-xs bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700 mt-auto"
                      onClick={() => setIsModalOpen(true)}
                    >
                      <Zap className="mr-2 h-5 w-5" /> Generate New Plan
                    </Button>
                  </>
                )}
              </div>
            </div>
          </div>
        </section>
      </div>

      {/* Modal for plan creation */}
      <Dialog open={isModalOpen} onOpenChange={(isOpen) => {
        setIsModalOpen(isOpen);
        if (!isOpen && !(generating && assigningWorkoutToDayIndex !== null)) {
          setAssigningWorkoutToDayIndex(null);
        }
      }}>
        <DialogContent className="w-[95vw] max-w-[600px] bg-white dark:bg-slate-900 max-h-[90vh] flex flex-col rounded-lg p-0 overflow-hidden">
          <div className="p-4 sm:p-6 pb-0">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">Create Your Workout Plan</DialogTitle>
              <DialogDescription className="text-slate-600 dark:text-slate-400">
                Tell us your preferences, and we&apos;ll generate a plan tailored to your needs.
              </DialogDescription>
            </DialogHeader>
            
            <div className="mt-4 border-b border-slate-200 dark:border-slate-700 flex">
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-md focus:outline-none transition-colors ${
                  activeTab === 'general' ? 'bg-white dark:bg-slate-900 text-orange-600 border-b-2 border-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
                onClick={() => setActiveTab('general')}
                type="button"
              >
                General
              </button>
              <button
                className={`px-4 py-2 font-medium text-sm rounded-t-md focus:outline-none transition-colors ml-2 ${
                  activeTab === 'equipment' ? 'bg-white dark:bg-slate-900 text-orange-600 border-b-2 border-orange-500' : 'bg-slate-100 dark:bg-slate-800 text-slate-500'
                }`}
                onClick={() => setActiveTab('equipment')}
                type="button"
              >
                Equipment
              </button>
            </div>
          </div>

          {/* Scrollable content area */}
          <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-4">
            {activeTab === 'general' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Workout Duration</label>
                  <div className="flex items-center space-x-4">
                    <input
                      type="range"
                      min={15}
                      max={90}
                      step={5}
                      value={workoutDuration}
                      onChange={e => setWorkoutDuration(Number(e.target.value))}
                      className="w-full accent-orange-500"
                    />
                    <span className="ml-2 font-semibold text-slate-700 dark:text-slate-200 min-w-[80px] text-right">
                      {workoutDuration < 60
                        ? `${workoutDuration} minutes`
                        : `${Math.floor(workoutDuration / 60)} hour${Math.floor(workoutDuration / 60) > 1 ? 's' : ''}${workoutDuration % 60 !== 0 ? `, ${workoutDuration % 60} minutes` : ''}`}
                    </span>
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Workout Type</label>
                  <div className="flex gap-2 sm:gap-4">
                    <button
                      type="button"
                      className={`px-3 sm:px-4 py-2 rounded border font-medium text-sm transition-colors flex-1 ${
                        workoutType === 'fullBody' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                      }`}
                      onClick={() => setWorkoutType('fullBody')}
                    >
                      Full Body
                    </button>
                    <button
                      type="button"
                      className={`px-3 sm:px-4 py-2 rounded border font-medium text-sm transition-colors flex-1 ${
                        workoutType === 'target-muscle' ? 'bg-orange-500 text-white border-orange-500' : 'bg-white dark:bg-slate-800 text-slate-700 dark:text-slate-200 border-slate-300 dark:border-slate-600'
                      }`}
                      onClick={() => setWorkoutType('target-muscle')}
                    >
                      Target Muscle Group
                    </button>
                  </div>
                </div>
                
                {workoutType === 'target-muscle' && (
                  <div className="space-y-4">
                    {Object.entries(muscleGroups).map(([category, muscles]) => (
                      <fieldset key={category} className="border-2 border-orange-300 dark:border-orange-700 rounded-md p-3">
                        <legend className="font-semibold text-orange-700 dark:text-orange-300 text-xs px-2">{category.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}</legend>
                        <div className="flex items-center mb-2">
                          <input
                            type="checkbox"
                            id={`select-all-${category}`}
                            checked={targetMuscles[category as keyof typeof muscleGroups].length === muscles.length}
                            onChange={e => handleSelectAllMuscles(category as keyof typeof muscleGroups, e.target.checked)}
                            className="mr-2 accent-orange-500"
                          />
                          <label htmlFor={`select-all-${category}`} className="text-xs font-medium text-slate-700 dark:text-slate-200 cursor-pointer">Select all</label>
                        </div>
                        <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                          {muscles.map(muscle => (
                            <label key={muscle} className="flex items-center text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={targetMuscles[category as keyof typeof muscleGroups].includes(muscle)}
                                onChange={e => handleTargetMuscleChange(category as keyof typeof muscleGroups, muscle, e.target.checked)}
                                className="mr-1 accent-orange-500"
                              />
                              {muscle}
                            </label>
                          ))}
                        </div>
                      </fieldset>
                    ))}
                  </div>
                )}
              </div>
            )}

            {activeTab === 'equipment' && (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-slate-700 dark:text-slate-200 mb-1">Available Equipment</label>
                  <div className="grid grid-cols-2 sm:flex sm:flex-wrap gap-2 sm:gap-3">
                    {equipmentList.map(eq => (
                      <label key={eq} className="flex items-center text-xs text-slate-700 dark:text-slate-200 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={selectedEquipment.includes(eq)}
                          onChange={e => handleEquipmentChange(eq, e.target.checked)}
                          className="mr-1 accent-orange-500"
                        />
                        {eq}
                      </label>
                    ))}
                  </div>
                  <input
                    type="text"
                    className="mt-3 w-full rounded border border-slate-300 dark:border-slate-600 bg-white dark:bg-slate-800 text-slate-800 dark:text-slate-100 p-2 text-sm"
                    placeholder="Other equipment (comma separated)"
                    value={otherEquipment}
                    onChange={e => setOtherEquipment(e.target.value)}
                  />
                </div>
              </div>
            )}
          </div>

          {/* Sticky footer */}
          <div className="border-t border-slate-200 dark:border-slate-700 p-4 sm:p-6 bg-white dark:bg-slate-900">
            <DialogFooter className="gap-2 sm:gap-0">
              <DialogClose asChild>
                <Button variant="outline" className="dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700 w-full sm:w-auto">Cancel</Button>
              </DialogClose>
              <Button
                onClick={handleGeneratePlanClick}
                disabled={generating}
                className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700 w-full sm:w-auto"
              >
                {generating && assigningWorkoutToDayIndex === null ? <Loader2 className="animate-spin h-5 w-5 mr-2" /> : <Zap className="h-5 w-5 mr-2" />}
                {assigningWorkoutToDayIndex !== null ? `Generate for ${DAYS_OF_WEEK_ABBREVIATED[assigningWorkoutToDayIndex]}` : "Generate Plan"}
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>

      {/* Loading Modal for General Workout Generation */}
      <Dialog open={generating && assigningWorkoutToDayIndex === null && !currentWorkout} onOpenChange={(isOpen) => {
        if (!isOpen && generating) {
          // Allow closing during generation (user can exit loading)
          setGenerating(false);
          setLoadingMessage("");
        }
      }}>
        <DialogContent className="w-[95vw] max-w-md bg-white dark:bg-slate-900 rounded-lg p-6">
          <DialogHeader>
            <DialogTitle className="text-center text-xl font-semibold text-slate-800 dark:text-slate-100 mb-2">
              Generating Your Perfect Workout
            </DialogTitle>
          </DialogHeader>
          
          <div className="flex flex-col items-center py-6">
            {/* Workout image placeholder with blur effect */}
            <div className="w-48 h-48 relative mb-6 rounded-lg overflow-hidden">
              {generatePlanCardImage ? (
                <Image
                  src={generatePlanCardImage}
                  alt="Your new workout is being generated"
                  fill
                  sizes="192px"
                  className="object-cover blur-sm"
                />
              ) : (
                <div className="w-full h-full bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center">
                  <ImageIcon className="h-16 w-16 text-slate-400 dark:text-slate-500" />
                </div>
              )}
              
              {/* Loading spinner overlay */}
              <div className="absolute inset-0 flex items-center justify-center bg-black/20">
                <Loader2 className="animate-spin h-12 w-12 text-orange-500" />
              </div>
            </div>
            
            <div className="text-center">
              <p className="text-lg font-medium text-slate-700 dark:text-slate-200 mb-3">
                Crafting your personalized workout...
              </p>
              {loadingMessage && (
                <p className="text-sm text-slate-600 dark:text-slate-400 leading-relaxed max-w-xs">
                  {loadingMessage}
                </p>
              )}
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => {
                setGenerating(false);
                setLoadingMessage("");
              }}
              className="w-full dark:text-slate-300 dark:border-slate-600 dark:hover:bg-slate-700"
            >
              Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Options Modal */}
      {selectedDayIndex !== null && (
        <Dialog open={isDayOptionsModalOpen} onOpenChange={(isOpen) => {
          setIsDayOptionsModalOpen(isOpen);
          if (!isOpen) setSelectedDayIndex(null);
        }}>
          <DialogContent className="bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">Options for {DAYS_OF_WEEK_ABBREVIATED[selectedDayIndex]}</DialogTitle>
            </DialogHeader>
            <div className="py-4 space-y-3">
              {weeklySchedule[selectedDayIndex]?.type === 'workout' && weeklySchedule[selectedDayIndex]?.workoutDetails?.planId && (
                <Button
                  onClick={() => {
                    if (user?.uid && weeklySchedule[selectedDayIndex]?.workoutDetails?.planId) {
                      router.push(`/workout/${user.uid}/${weeklySchedule[selectedDayIndex]!.workoutDetails!.planId}`);
                      setIsDayOptionsModalOpen(false);
                      setSelectedDayIndex(null);
                    }
                  }}
                  className="w-full justify-start bg-blue-500 hover:bg-blue-600 text-white dark:bg-blue-600 dark:hover:bg-blue-700"
                >
                  <Eye size={18} className="mr-2" /> View Workout Details
                </Button>
              )}
              <Button 
                onClick={() => {
                  setIsDayOptionsModalOpen(false);
                  setAssigningWorkoutToDayIndex(selectedDayIndex);
                  setIsModalOpen(true);
                }}
                className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                <Zap size={18} className="mr-2" /> 
                {weeklySchedule[selectedDayIndex]?.type === 'workout' ? 'Replace with New Workout' : 'Assign New Workout'}
              </Button>
              <Button 
                onClick={() => handleSetDayAsType(selectedDayIndex!, 'rest')} 
                className="w-full justify-start bg-green-500 hover:bg-green-600 text-white dark:bg-green-600 dark:hover:bg-green-700"
              >
                <Coffee size={18} className="mr-2" /> Set as Rest Day
              </Button>
              <Button 
                onClick={() => handleSetDayAsType(selectedDayIndex!, 'stretch')} 
                className="w-full justify-start bg-yellow-500 hover:bg-yellow-600 text-white dark:bg-yellow-600 dark:hover:bg-yellow-700"
              >
                <Repeat size={18} className="mr-2" /> Set as Stretch Day
              </Button>
              {weeklySchedule[selectedDayIndex!] !== null && (
                <Button 
                  onClick={() => handleUnassignDay(selectedDayIndex!)}
                  variant="outline" 
                  className="w-full justify-start text-destructive hover:text-destructive/90 dark:text-red-500 dark:hover:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20"
                >
                  <XCircle size={18} className="mr-2" /> Unassign
                </Button>
              )}
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="dark:text-slate-300">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Workout Edit Modal */}
      {dayIndexForWorkoutEdit !== null && (
        <Dialog open={isWorkoutEditModalOpen} onOpenChange={(isOpen) => {
          setIsWorkoutEditModalOpen(isOpen);
          if (!isOpen) setDayIndexForWorkoutEdit(null);
        }}>
          <DialogContent className="bg-white dark:bg-slate-900">
            <DialogHeader>
              <DialogTitle className="text-slate-800 dark:text-slate-100">
                Edit Assignment for {DAYS_OF_WEEK_ABBREVIATED[dayIndexForWorkoutEdit]}
              </DialogTitle>
              {weeklySchedule[dayIndexForWorkoutEdit]?.type === 'workout' && weeklySchedule[dayIndexForWorkoutEdit]?.workoutDetails && (
                <DialogDescription className="text-slate-600 dark:text-slate-400">
                  Current: {weeklySchedule[dayIndexForWorkoutEdit]!.workoutDetails!.title}
                </DialogDescription>
              )}
            </DialogHeader>
            <div className="py-4 space-y-3">
              <Button 
                onClick={handleReplaceWorkoutFromModal} 
                className="w-full justify-start bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
              >
                <Zap size={18} className="mr-2" /> Replace with New Workout
              </Button>
              <Button 
                onClick={() => handleUnassignDay(dayIndexForWorkoutEdit!)} 
                variant="outline" 
                className="w-full justify-start text-destructive hover:text-destructive/90 dark:text-red-500 dark:hover:text-red-400 dark:border-red-500 dark:hover:bg-red-900/20"
              >
                <Trash2 size={18} className="mr-2" /> Unassign Workout
              </Button>
            </div>
            <DialogFooter>
              <DialogClose asChild>
                <Button variant="ghost" className="dark:text-slate-300">Close</Button>
              </DialogClose>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      )}

      {/* Clear All Dialog */}
      <Dialog open={isClearAllDialogOpen} onOpenChange={setIsClearAllDialogOpen}>
        <DialogContent className="bg-white dark:bg-slate-900">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Clear All Assignments?</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              This will remove all assignments from your weekly schedule. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="dark:text-slate-300" onClick={() => setIsClearAllDialogOpen(false)}>Cancel</Button>
            </DialogClose>
            <Button
              className="bg-destructive hover:bg-destructive/90 dark:bg-red-600 dark:hover:bg-red-700 text-white"
              onClick={handleClearAllAssignments}
            >
              Yes, Clear All
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Subscription Modal */}
      <Dialog open={isSubscriptionModalOpen} onOpenChange={setIsSubscriptionModalOpen}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">Upgrade to Premium</DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              You&apos;ve reached your free workout limit. Subscribe to unlock unlimited workouts.
            </DialogDescription>
          </DialogHeader>
          <div className="flex flex-col space-y-4 py-4">
            <div className="text-center">
              <div className="text-3xl font-bold text-orange-500 mb-2">$9.99/month</div>
              <ul className="text-left space-y-2 text-sm text-slate-600 dark:text-slate-400">
                <li>✓ Unlimited AI-generated workout plans</li>
                <li>✓ Personalized to your goals & equipment</li>
                <li>✓ Detailed progress tracking & analytics</li>
                <li>✓ Full exercise library access</li>
                <li>✓ Weekly workout schedule</li>
                <li>✓ Priority support</li>
              </ul>
            </div>
            
            {/* Promo Code Section */}
            <div className="space-y-2">
              <Label htmlFor="promoCode" className="text-sm font-medium text-slate-700 dark:text-slate-300">
                Promo Code (Optional)
              </Label>
              <Input
                id="promoCode"
                type="text"
                placeholder="Enter promo code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoCodeError(""); // Clear error when user types
                }}
                className="bg-white/50 dark:bg-slate-700/50 border-slate-300 dark:border-slate-600"
              />
              {promoCodeError && (
                <p className="text-sm text-red-500 dark:text-red-400">{promoCodeError}</p>
              )}
            </div>
          </div>
          <DialogFooter className="flex flex-col sm:flex-row gap-2">
            <DialogClose asChild>
              <Button variant="outline" className="dark:text-slate-300">
                Maybe Later
              </Button>
            </DialogClose>
            <Button
              className="bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
              onClick={async () => {
                if (!user) return;
                
                // Clear any previous error
                setPromoCodeError("");
                
                try {
                  const requestBody: {
                    userId: string;
                    email: string | null;
                    promoCode?: string;
                  } = {
                    userId: user.uid,
                    email: user.email
                  };
                  
                  // Include promo code if provided
                  if (promoCode.trim()) {
                    requestBody.promoCode = promoCode.trim();
                  }
                  
                  const response = await fetch('/api/create-checkout-session', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify(requestBody)
                  });
                  
                  if (!response.ok) {
                    const errorData = await response.json();
                    if (errorData.error) {
                      setPromoCodeError(errorData.error);
                      return;
                    }
                    throw new Error('Failed to create checkout session');
                  }
                  
                  const { url } = await response.json();
                  if (url) {
                    window.location.href = url;
                  }
                } catch (error) {
                  console.error('Error creating checkout session:', error);
                  setPromoCodeError('Failed to start subscription. Please try again.');
                }
              }}
            >
              Subscribe Now
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Day Assignment Modal for Workout Cards */}
      <Dialog open={isAssignWorkoutModalOpen} onOpenChange={(isOpen) => {
        setIsAssignWorkoutModalOpen(isOpen);
        if (!isOpen) {
          setWorkoutToAssign(null);
        }
      }}>
        <DialogContent className="bg-white dark:bg-slate-900 max-w-md">
          <DialogHeader>
            <DialogTitle className="text-slate-800 dark:text-slate-100">
              Assign Workout to Day
            </DialogTitle>
            <DialogDescription className="text-slate-600 dark:text-slate-400">
              {workoutToAssign && `Choose which day to assign "${workoutToAssign.title}" to your weekly schedule.`}
            </DialogDescription>
          </DialogHeader>
          
          <div className="py-4">
            <div className="grid grid-cols-1 gap-2">
              {["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"].map((dayName, index) => {
                const currentAssignment = weeklySchedule[index];
                const hasAssignment = currentAssignment !== null;
                
                return (
                  <Button
                    key={index}
                    variant={hasAssignment ? "outline" : "default"}
                    onClick={() => handleAssignWorkoutToSpecificDay(index)}
                    className={`w-full justify-between p-4 h-auto ${
                      hasAssignment 
                        ? "border-orange-200 dark:border-orange-800 text-slate-700 dark:text-slate-300" 
                        : "bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700"
                    }`}
                  >
                    <div className="flex flex-col items-start">
                      <span className="font-medium">{dayName}</span>
                      {hasAssignment && (
                        <span className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                          {currentAssignment.type === 'workout' 
                            ? `Workout: ${currentAssignment.workoutDetails?.title || "Unnamed"}` 
                            : currentAssignment.type === 'rest' 
                              ? "Rest Day" 
                              : currentAssignment.type === 'stretch' 
                                ? "Stretch Day" 
                                : "Assigned"}
                        </span>
                      )}
                    </div>
                    <div className="flex items-center">
                      {hasAssignment ? (
                        <span className="text-xs px-2 py-1 rounded bg-orange-100 dark:bg-orange-900/30 text-orange-700 dark:text-orange-300">
                          Replace
                        </span>
                      ) : (
                        <CalendarPlus className="h-4 w-4" />
                      )}
                    </div>
                  </Button>
                );
              })}
            </div>
          </div>
          
          <DialogFooter>
            <DialogClose asChild>
              <Button variant="outline" className="dark:text-slate-300">
                Cancel
              </Button>
            </DialogClose>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

// Loading component for Suspense fallback
function DashboardLoading() {
  return (
    <div className="container mx-auto px-4 py-8">
      <div className="text-center">
        <Loader2 className="animate-spin h-8 w-8 mx-auto mb-4 text-orange-500" />
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    </div>
  );
}

// Main export wrapped in Suspense boundary
export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardLoading />}>
      <DashboardPageContent />
    </Suspense>
  );
}
