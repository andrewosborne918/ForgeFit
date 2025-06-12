"use client"

import { useEffect, useState, useRef } from 'react';
import { useAppContext } from '@/context/AppContext'; // Changed useAuth to useAppContext
import { useRouter, useSearchParams } from 'next/navigation';
import { app, isFirebaseConfigured } from '@/lib/firebase'; // Import app and isFirebaseConfigured
import { getFirestore, setDoc, doc, collection, query, orderBy, getDocs, deleteDoc, getDoc, writeBatch } from 'firebase/firestore'; // Import firestore functions
// import LOADING_MESSAGES from "@/lib/loadingMessages" 
import Image from "next/image" 
import { Button } from "@/components/ui/button" 
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog" 
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
// import { Input } from "@/components/ui/input"
// import { Label } from "@/components/ui/label"
// import { Checkbox } from "@/components/ui/checkbox"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"; 
import Link from 'next/link'; 
import { Loader2, Edit3, PlusCircle, Coffee, Repeat, Zap, /* CalendarPlus, */ Trash2, ImageIcon, XCircle, Eye } from "lucide-react"; // Added Eye icon
import { BottomNavigationBar } from "@/components/BottomNavigationBar";
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
  [key: string]: unknown;
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

export default function DashboardPage() {
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

  // const [isAssignToDayModalOpen, setIsAssignToDayModalOpen] = useState(false);
  // const [workoutToAssign, setWorkoutToAssign] = useState<WorkoutAssignmentDetails | null>(null);

  // New state for the Workout Edit Options Modal
  const [isWorkoutEditModalOpen, setIsWorkoutEditModalOpen] = useState(false);
  const [dayIndexForWorkoutEdit, setDayIndexForWorkoutEdit] = useState<number | null>(null);

  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false); // State for Clear All confirmation dialog

  // Mobile view state for bottom navigation
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'history'>('dashboard');

  // Check URL parameters for navigation state
  useEffect(() => {
    if (!searchParams) return;
    
    const view = searchParams.get('view');
    const shouldGenerate = searchParams.get('generate');
    
    if (view === 'calendar') {
      setCurrentView('calendar');
    } else if (view === 'history') {
      setCurrentView('history');
    } else {
      setCurrentView('dashboard');
    }
    
    if (shouldGenerate === 'true') {
      setIsModalOpen(true);
      // Remove the parameter from URL to prevent repeated triggering
      const newUrl = new URL(window.location.href);
      newUrl.searchParams.delete('generate');
      window.history.replaceState({}, '', newUrl.toString());
    }
  }, [searchParams]);

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
        snapshot.forEach(docSnap => {
          const idx = parseInt(docSnap.id, 10);
          if (!isNaN(idx) && idx >= 0 && idx < 7) {
            scheduleArr[idx] = docSnap.data() as DayAssignment;
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
          const plans = querySnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          } as CompletedPlan));
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

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes} minutes`;
    }
    const hours = Math.floor(minutes / 60);
    const remainingMinutes = minutes % 60;
    const hourText = hours > 1 ? "hours" : "hour";
    if (remainingMinutes === 0) {
      return `${hours} ${hourText}`;
    }
    return `${hours} ${hourText}, ${remainingMinutes} minutes`;
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
  [key: string]: unknown;
}

  const generatePlan = async (preferences?: GenerationPreferences) => {
    setGenerating(true)
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
      
      // Simple cleaning - just remove markdown code blocks if present
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

      // Basic cleanup - only fix trailing commas which are common in AI responses
      raw = raw.replace(/,\s*([}\]])/g, '$1');

      console.log("Raw JSON from AI:", raw);

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
        console.error("Problematic raw string:", raw); // Log the string that caused the error
        alert("Failed to generate workout plan due to parsing error. Please check console for details.");
        setAssigningWorkoutToDayIndex(null);
      }
    } catch (err) {
      alert("Failed to generate workout plan. Please try again.")
      console.error("Failed to generate plan:", err)
      setAssigningWorkoutToDayIndex(null); 
    } finally {
      setGenerating(false)
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

  // Quick workout generation function for bottom nav
  const handleQuickWorkout = () => {
    // Use default preferences for quick generation
    const quickPreferences = {
      duration: 45,
      type: "fullBody",
      muscles: null,
      equipment: [],
      otherEquipment: "",
    };
    generatePlan(quickPreferences);
  };

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
                  <Loader2 className="animate-spin h-6 w-6 text-orange-500" />
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

      {/* Bottom Navigation for Mobile */}
      <BottomNavigationBar onQuickWorkout={handleQuickWorkout} />
    </div>
  );
};
