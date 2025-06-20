"use client";

import { useEffect, useState, useRef, Suspense } from 'react';
import { useAppContext } from '@/context/AppContext';
import { useRouter, useSearchParams } from 'next/navigation';
import { app, isFirebaseConfigured } from '@/lib/firebase';
import { getFirestore, setDoc, doc, collection, query, orderBy, getDocs, deleteDoc, getDoc, writeBatch } from 'firebase/firestore';
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogClose } from "@/components/ui/dialog";
import { getRandomLoadingMessage } from "@/lib/loadingMessages";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog";
import Link from 'next/link';
import { CalendarPlus, ImageIcon, Loader2, Zap } from "lucide-react";
import { ErrorBoundary } from '@/components/ErrorBoundary';

const IMAGE_POOL_SIZE = 35;

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
  image?: string;
  plan?: {
    title?: string;
    goal?: string;
    duration?: string | number;
    notes?: string;
    workout?: {
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
  workout?: WorkoutPlan;
}

const DAYS_OF_WEEK_ABBREVIATED = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const DAYS_OF_WEEK_FULL = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];

// --------- Helper to select next unique workout image -------------
function getNextWorkoutImage(gender: string): string {
  const folder = gender === "female" ? "females" : "males";
  const prefix = gender === "female" ? "f_workout_" : "m_workout_";
  const key = `usedImages_${folder}`;
  let used = JSON.parse(localStorage.getItem(key) || "[]");
  if (used.length >= IMAGE_POOL_SIZE) used = [];
  const available = [...Array(IMAGE_POOL_SIZE).keys()].filter(i => !used.includes(i));
  const nextIndex = available[Math.floor(Math.random() * available.length)];
  used.push(nextIndex);
  localStorage.setItem(key, JSON.stringify(used));
  const filename = `${prefix}${nextIndex + 1}.jpg`;
  return `/images/${folder}/${filename}`;
}

// ------------- Dashboard Page -------------
function DashboardPageContent() {
  const { user, userProfile, setUserProfile, loading: authLoading } = useAppContext();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [completedPlans, setCompletedPlans] = useState<CompletedPlan[]>([]);
  const [planToDelete, setPlanToDelete] = useState<string | null>(null);
  const [generatePlanCardImage, setGeneratePlanCardImage] = useState<string | null>(null);
  const [currentWorkout, setCurrentWorkout] = useState<WorkoutPlan | null>(null);
  const [workoutDuration, setWorkoutDuration] = useState(45);
  const [workoutType, setWorkoutType] = useState("fullBody");
  const initialTargetMuscles = {
    upperBody: [] as string[],
    core: [] as string[],
    lowerBody: [] as string[],
  };
  const [targetMuscles, setTargetMuscles] = useState(initialTargetMuscles);
  const [selectedEquipment, setSelectedEquipment] = useState<string[]>([]);
  const [otherEquipment, setOtherEquipment] = useState("");
  const [activeTab, setActiveTab] = useState("general");
  const [weeklySchedule, setWeeklySchedule] = useState<Array<DayAssignment | null>>(Array(7).fill(null));
  const [selectedDayIndex, setSelectedDayIndex] = useState<number | null>(null);
  const [isDayOptionsModalOpen, setIsDayOptionsModalOpen] = useState(false);
  const [assigningWorkoutToDayIndex, setAssigningWorkoutToDayIndex] = useState<number | null>(null);
  const [isSubscriptionModalOpen, setIsSubscriptionModalOpen] = useState(false);
  const [promoCode, setPromoCode] = useState("");
  const [promoCodeError, setPromoCodeError] = useState("");
  const [loadingMessage, setLoadingMessage] = useState<string>("");
  const [isAssignWorkoutModalOpen, setIsAssignWorkoutModalOpen] = useState(false);
  const [workoutToAssign, setWorkoutToAssign] = useState<WorkoutAssignmentDetails | null>(null);
  const [isWorkoutEditModalOpen, setIsWorkoutEditModalOpen] = useState(false);
  const [dayIndexForWorkoutEdit, setDayIndexForWorkoutEdit] = useState<number | null>(null);
  const [isClearAllDialogOpen, setIsClearAllDialogOpen] = useState(false);
  const [currentView, setCurrentView] = useState<'dashboard' | 'calendar' | 'history' | 'workout'>('workout');
  const draggedWorkoutRef = useRef<WorkoutAssignmentDetails | null>(null);

  // --- Handler functions moved to top-level scope ---
  function handleDayCardClick(index: number): void {
    setSelectedDayIndex(index);
    setIsDayOptionsModalOpen(true);
  }

  function handleOpenWorkoutAssignmentModal(p: CompletedPlan): void {
    setWorkoutToAssign({
      planId: p.id,
      title: p.plan?.plan?.title || p.plan?.title || "Unnamed Workout",
      duration: p.plan?.plan?.duration?.toString() || p.plan?.duration?.toString() || "Not specified",
      imageUrl: p.image || p.plan?.imageUrl || p.plan?.image,
    });
    setIsAssignWorkoutModalOpen(true);
  }

  // ----------- Fetch user data on mount -------------
  useEffect(() => {
    if (!app || !isFirebaseConfigured) {
      console.error('Firebase is not properly configured');
      return;
    }

    const fetchUserData = async () => {
      try {
        if (!user) return;
        
        // Fetch completed workouts
        const db = getFirestore(); // Using default app
        const workoutsQuery = query(
          collection(db, `users/${user.uid}/completedWorkouts`),
          orderBy('timestamp', 'desc')
        );
        
        const querySnapshot = await getDocs(workoutsQuery);
        const plans = querySnapshot.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            plan: data.plan as WorkoutPlan | undefined,
            image: data.image as string | undefined,
            timestamp: data.timestamp?.toDate(),
            createdAt: data.createdAt as string | undefined
          };
        });
        
        setCompletedPlans(plans);
        
        // Set the most recent workout as current if none is set
        if (plans.length > 0 && plans[0].plan && !currentWorkout) {
          setCurrentWorkout(plans[0].plan);
        }
      } catch (error) {
        console.error('Error fetching user data:', error);
      }
    };

    fetchUserData();
  }, [user, currentWorkout]);

  // Handle generating a new workout plan
  const handleGeneratePlan = async () => {
    if (!user) return;
    
    setGenerating(true);
    setLoadingMessage(getRandomLoadingMessage());
    
    try {
      // Your existing generate plan logic here
      // This is a placeholder - replace with your actual implementation
      const response = await fetch('/api/generate-workout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          duration: workoutDuration,
          type: workoutType,
          targetMuscles,
          equipment: [...selectedEquipment, ...(otherEquipment ? [otherEquipment] : [])],
        }),
      });

      if (!response.ok) {
        throw new Error('Failed to generate workout');
      }

      const newPlan = await response.json() as WorkoutPlan;
      setCurrentWorkout(newPlan);
      setIsModalOpen(false);
    } catch (error) {
      console.error('Error generating workout:', error);
      // Handle error appropriately
    } finally {
      setGenerating(false);
    }
  };

  // ----------- UI COMPONENTS BELOW -------------

  // Mobile Weekly Schedule Card
  const MobileCalendarView = () => (
    <div className="space-y-4">
      <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-6">Weekly Schedule</h2>
      <div className="space-y-3">
        {DAYS_OF_WEEK_ABBREVIATED.map((dayName, index) => {
          const dayAssignment = weeklySchedule[index];
          return (
            <div
              key={index}
              className={`rounded-lg p-4 shadow-md border-2 transition-all duration-200 ${
                dayAssignment?.type === 'workout'
                  ? 'bg-blue-50 dark:bg-blue-900/30 border-blue-200 dark:border-blue-800'
                  : dayAssignment?.type === 'rest'
                    ? 'bg-green-50 dark:bg-green-900/30 border-green-200 dark:border-green-800'
                    : dayAssignment?.type === 'stretch'
                      ? 'bg-yellow-50 dark:bg-yellow-900/30 border-yellow-200 dark:border-yellow-800'
                      : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200 dark:border-slate-700'
              }`}
              onClick={() => handleDayCardClick(index)}
            >
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-semibold text-slate-700 dark:text-slate-200">{DAYS_OF_WEEK_FULL[index]}</h3>
                  {dayAssignment?.type === 'workout' && dayAssignment.workoutDetails ? (
                    <>
                      <p className="font-medium text-blue-700 dark:text-blue-300 truncate">{dayAssignment.workoutDetails.title}</p>
                      <p className="text-sm text-blue-600 dark:text-blue-400">{dayAssignment.workoutDetails.duration}</p>
                    </>
                  ) : dayAssignment?.type === 'rest' ? (
                    <p className="text-green-600 dark:text-green-300 mt-1">Rest Day</p>
                  ) : dayAssignment?.type === 'stretch' ? (
                    <p className="text-yellow-600 dark:text-yellow-300 mt-1">Stretch Day</p>
                  ) : (
                    <p className="text-slate-500 dark:text-slate-400 mt-1">No assignment</p>
                  )}
                </div>
                {dayAssignment?.type === 'workout' && dayAssignment.workoutDetails?.imageUrl && (
                  <Image
                    src={dayAssignment.workoutDetails.imageUrl}
                    alt="Workout"
                    width={64}
                    height={64}
                    className="w-16 h-16 object-cover rounded"
                  />
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );

  // Mobile History Card
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
              <div key={p.id} className="p-4 bg-white dark:bg-slate-800/50 rounded-lg shadow-md border border-slate-200 dark:border-slate-700 flex items-center gap-4">
                {planImage ? (
                  <Image src={planImage} alt={planTitle} width={64} height={64} className="object-cover rounded-lg" />
                ) : (
                  <ImageIcon className="h-8 w-8 text-slate-400 dark:text-slate500" />
                )}
                <div className="flex-1">
                  <Link href={`/workout/${user?.uid}/${p.id}`} className="font-medium text-primary dark:text-orange-400 hover:underline block truncate">
                    {planTitle}
                  </Link>
                  <div className="text-sm text-muted-foreground dark:text-slate-400">{planDuration}</div>
                  {p.createdAt && (
                    <div className="text-xs text-slate-500 dark:text-slate-500 mt-1">
                      {new Date(p.createdAt).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <Button variant="ghost" size="icon" onClick={() => handleOpenWorkoutAssignmentModal(p)}>
                  <CalendarPlus className="h-5 w-5" />
                </Button>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-12">
          <ImageIcon className="h-16 w-16 text-slate-300 dark:text-slate-600 mx-auto mb-4" />
          <p className="text-muted-foreground dark:text-slate-400 text-lg">No completed workouts yet</p>
          <Button onClick={() => setIsModalOpen(true)} className="w-full bg-orange-500 hover:bg-orange-600 text-white dark:bg-orange-600 dark:hover:bg-orange-700 text-lg py-4 rounded-lg shadow-lg hover:shadow-xl transition-all duration-200">
            <Zap className="mr-2 h-6 w-6" /> Generate Workout
          </Button>
        </div>
      )}
    </div>
  );

  // Mobile Current Workout Card
  const MobileWorkoutView = () => (
    <div className="space-y-6">
      <h2 className="text-2xl font-semibold text-slate-700 dark:text-slate-200 mb-4">Current Workout</h2>
      {currentWorkout ? (
        <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-6 flex flex-col items-center">
          {(currentWorkout.image || currentWorkout.imageUrl) ? (
            <Image
              src={currentWorkout.image || currentWorkout.imageUrl!}
              alt={currentWorkout.title || "Current workout"}
              width={220}
              height={220}
              className="object-cover rounded mb-4"
            />
          ) : (
            <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-6 rounded-lg">
              <ImageIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
            </div>
          )}
          <h4 className="text-xl font-bold text-primary dark:text-orange-400 mb-2">{currentWorkout.plan?.title || currentWorkout.title || "Current Workout"}</h4>
          <div className="text-base font-medium text-slate-600 dark:text-slate-400 mb-4">
            Duration: {currentWorkout.plan?.duration || currentWorkout.duration || "Not specified"}
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
        </div>
      ) : (
        <div className="bg-white dark:bg-slate-800/50 rounded-lg shadow-lg p-6 flex flex-col items-center">
          <div className="w-24 h-24 bg-gradient-to-br from-slate-200 to-slate-300 dark:from-slate-700 dark:to-slate-800 flex items-center justify-center mx-auto mb-6 rounded-lg">
            <ImageIcon className="h-12 w-12 text-slate-400 dark:text-slate-500" />
          </div>
          <h3 className="text-xl font-semibold text-slate-700 dark:text-slate-200 mb-3">No Active Workout</h3>
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

  // -- Main Dashboard Render: MOBILE FIRST for simplicity --
  return (
    <div className="container mx-auto px-4 py-8 pb-safe-24 md:pb-8">
      <div className="md:hidden">
        {currentView === 'calendar' && <MobileCalendarView />}
        {currentView === 'history' && <MobileHistoryView />}
        {currentView === 'workout' && <MobileWorkoutView />}
      </div>
      {/* For desktop, add your grid-based layout here if needed. */}

      {/* --- Generation Modal, Subscription Modal, etc. --- */}
      {/* (Copy your Dialog/modal code here as in your previous examples) */}
    </div>
  );
}

// Loading fallback
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

// Main export with Suspense and ErrorBoundary
export default function DashboardPage() {
  return (
    <ErrorBoundary 
      fallback={
        <div className="flex items-center justify-center min-h-screen p-4">
          <div className="text-center">
            <h2 className="text-2xl font-bold text-red-600 dark:text-red-400 mb-4">Something went wrong</h2>
            <p className="mb-4">We're having trouble loading the dashboard. Please try refreshing the page.</p>
            <Button 
              onClick={() => window.location.reload()}
              className="bg-orange-500 hover:bg-orange-600 text-white"
            >
              Refresh Page
            </Button>
          </div>
        </div>
      }
    >
      <Suspense fallback={<DashboardLoading />}>
        <DashboardPageContent />
      </Suspense>
    </ErrorBoundary>
  );
}
function formatDuration(planDurationValue: number) {
  if (isNaN(planDurationValue) || planDurationValue <= 0) return "Not specified";
  const hours = Math.floor(planDurationValue / 60);
  const minutes = planDurationValue % 60;
  if (hours > 0 && minutes > 0) {
    return `${hours}h ${minutes}m`;
  } else if (hours > 0) {
    return `${hours}h`;
  } else {
    return `${minutes}m`;
  }
}

