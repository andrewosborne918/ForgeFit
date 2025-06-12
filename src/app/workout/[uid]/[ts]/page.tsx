"use client"

import { useEffect, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { app, isFirebaseConfigured } from "@/lib/firebase"
import Image from 'next/image'; // Ensure Image is imported
import { Button } from "@/components/ui/button"
import { ArrowLeft, CheckCircle2, Info, BadgeCheck, Loader2, Mail, Facebook, X, Printer } from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { useAppContext } from "@/context/AppContext"
// import { Logo } from "@/components/Logo"

interface ExerciseItem {
  exercise?: string;
  sets?: string | number;
  reps?: string | number;
  description?: string;
  [key: string]: unknown;
}

interface WorkoutPlan {
  id?: string;
  title?: string;
  image?: string;
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

const countTotalExercises = (plan: WorkoutPlan) => {
  let count = 0;
  if (plan?.plan?.workout?.warmup) count += plan.plan.workout.warmup.length;
  if (plan?.plan?.workout?.mainWorkout) count += plan.plan.workout.mainWorkout.length;
  if (plan?.plan?.workout?.cooldown) count += plan.plan.workout.cooldown.length;
  return count;
};

// Helper function to parse markdown bold syntax (**) and return React elements
const renderMarkdownBold = (text: string): React.ReactNode => {
  if (typeof text !== 'string') return text;

  const parts = text.split(/(\*{2}[^\*]+\*{2})/g); // Split by **bolded text**, keeping the delimiters

  return parts.map((part, index) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={index}>{part.substring(2, part.length - 2)}</strong>;
    }
    return part; // Regular text, or empty string from split
  }).filter(part => part !== ''); // Filter out empty strings that can result from split
};

interface ApiReturnedExerciseDetails {
  description: string;
  stepByStep: string[];
  safetyTips: string[];
  commonMistakes: string[];
  imagePrompt: string;
}

interface CurrentExerciseState {
  name: string;
  details?: ApiReturnedExerciseDetails | null;
  error?: string | null;
}

export default function WorkoutDetailPage() {
  const { uid, ts } = useParams() as { uid: string; ts: string };
  const { userProfile, loading: appContextLoading, profileLoading } = useAppContext(); // Destructure profileLoading
  const [plan, setPlan] = useState<WorkoutPlan | null>(null);
  const [pageState, setPageState] = useState<"contextLoading" | "profileLoading" | "planLoading" | "planLoaded" | "error">("contextLoading"); // Added "profileLoading" state
  const router = useRouter();
  const [completedExercises, setCompletedExercises] = useState<string[]>([]);
  const [allExercisesCompleted, setAllExercisesCompleted] = useState(false);

  const [isExerciseInfoModalOpen, setIsExerciseInfoModalOpen] = useState(false);
  const [currentExerciseForInfo, setCurrentExerciseForInfo] = useState<CurrentExerciseState | null>(null);
  const [isFetchingExerciseInfo, setIsFetchingExerciseInfo] = useState(false);

  console.log(
    "WorkoutDetailPage RENDER: appContextLoading:", appContextLoading, 
    "profileLoading:", profileLoading, // Log profileLoading
    "pageState:", pageState, 
    "plan:", plan ? "exists" : "null", 
    "uid:", uid, 
    "ts:", ts
  );

  // Effect 1: Determine pageState based on context, params, and plan data
  useEffect(() => {
    console.log("WorkoutDetailPage EFFECT 1: appContextLoading:", appContextLoading, "profileLoading:", profileLoading, "pageState:", pageState, "plan:", plan ? "exists" : "null");

    if (appContextLoading) {
      if (pageState !== "contextLoading") setPageState("contextLoading");
      return;
    }
    // appContextLoading is false, now check profileLoading
    if (profileLoading) {
      if (pageState !== "profileLoading") setPageState("profileLoading");
      return;
    }

    // appContextLoading and profileLoading are false
    if (!userProfile && pageState !== "error") { // Check if userProfile is null after loading
        // This case might indicate an issue, or a user who hasn't completed their profile.
        // The error "User profile information (gender) is missing" will be handled in handleOpenExerciseInfoModal.
        // For now, we proceed to plan loading if uid and ts are present.
        console.warn("User profile is null after loading, but proceeding to load plan.");
    }


    if (!uid || !ts) {
      if (pageState !== "error") setPageState("error");
      return;
    }

    // appContextLoading and profileLoading are false, uid and ts are present
    if (plan) {
      if (pageState !== "planLoaded") setPageState("planLoaded");
    } else {
      if (pageState !== "planLoading" && pageState !== "error") {
        setPageState("planLoading");
      }
    }
  }, [appContextLoading, profileLoading, userProfile, uid, ts, plan, pageState]); // Added profileLoading and userProfile to dependencies

  // Effect 2: Fetch workout plan when pageState is "planLoading"
  useEffect(() => {
    console.log("WorkoutDetailPage EFFECT 2: pageState:", pageState, "plan:", plan ? "exists" : "null");

    if (pageState === "planLoading" && uid && ts && !plan && app && isFirebaseConfigured) {
      let isActive = true; // Prevent state updates if component unmounts during async operation

      const fetchWorkoutData = async () => {
        try {
          if (!app || !isFirebaseConfigured) {
            console.error("Firebase app not initialized");
            return;
          }
          const db = getFirestore(app);

          if (ts.startsWith("generated-")) {
            const userDocRef = doc(db, `users/${uid}`);
            const userDocSnap = await getDoc(userDocRef);

            if (!isActive) return;

            if (userDocSnap.exists()) {
              const userData = userDocSnap.data();
              let foundPlan = null;

              // Check activePlan
              if (userData.activePlan && userData.activePlan.id === ts) {
                foundPlan = userData.activePlan;
              } 
              // If not in activePlan, check weeklySchedule
              else if (userData.weeklySchedule && Array.isArray(userData.weeklySchedule)) {
                for (const daySchedule of userData.weeklySchedule) {
                  if (daySchedule && daySchedule.type === 'workout' && daySchedule.workout && daySchedule.workout.id === ts) {
                    foundPlan = daySchedule.workout;
                    break;
                  }
                }
              }

              if (foundPlan) {
                setPlan(foundPlan); // This triggers Effect 1 to set pageState to "planLoaded"
                // Load completed exercises after plan is set
                const storedCompleted = localStorage.getItem(`completed-${uid}-${ts}`);
                if (storedCompleted) {
                  try {
                    setCompletedExercises(JSON.parse(storedCompleted));
                  } catch (e) {
                    console.error("Failed to parse stored completed exercises:", e);
                    localStorage.removeItem(`completed-${uid}-${ts}`); // Clear corrupted data
                  }
                }
              } else {
                console.warn(`Generated plan with ID ${ts} not found in user document.`);
                setPageState("error"); // Generated plan not found
              }
            } else {
              console.warn(`User document ${uid} not found for generated plan.`);
              setPageState("error"); // User document not found
            }
          } else {
            // Original logic for fetching from logs
            const logRef = doc(db, `users/${uid}/logs/${ts}`);
            const logSnap = await getDoc(logRef);

            if (!isActive) return;

            if (logSnap.exists()) {
              const workoutData = logSnap.data();
              setPlan(workoutData); // This triggers Effect 1 to set pageState to "planLoaded"
              
              // Load completed exercises after plan is set
              const storedCompleted = localStorage.getItem(`completed-${uid}-${ts}`);
              if (storedCompleted) {
                try {
                  setCompletedExercises(JSON.parse(storedCompleted));
                } catch (e) {
                  console.error("Failed to parse stored completed exercises:", e);
                  localStorage.removeItem(`completed-${uid}-${ts}`); // Clear corrupted data
                }
              }
            } else {
              setPageState("error"); // Plan not found in logs
            }
          }
        } catch (err) {
          if (!isActive) return;
          console.error("Error fetching workout:", err);
          setPageState("error"); // Error fetching plan
        }
      };

      fetchWorkoutData();

      return () => {
        isActive = false; // Cleanup
      };
    }
  }, [pageState, uid, ts, plan]); // `plan` is a dependency to ensure we don't re-fetch if it gets set

  // Effect for managing completed exercises and localStorage
  useEffect(() => {
    console.log("WorkoutDetailPage EFFECT 3 (completedExercises): completedExercises.length:", completedExercises.length, "plan:", plan ? "exists" : "null");

    if (plan && uid && ts) { // Ensure plan, uid, and ts are available
      const totalExercises = countTotalExercises(plan);
      setAllExercisesCompleted(totalExercises > 0 && completedExercises.length === totalExercises);
      // Save to localStorage only if there are completed exercises or if it was previously non-empty
      // This avoids writing an empty array string "[]" to localStorage unnecessarily on initial load if nothing is completed.
      if (completedExercises.length > 0 || localStorage.getItem(`completed-${uid}-${ts}`)) {
        localStorage.setItem(`completed-${uid}-${ts}`, JSON.stringify(completedExercises));
      }
    }
  }, [completedExercises, plan, uid, ts]);

  const handleToggleComplete = (exerciseId: string) => {
    setCompletedExercises(prev =>
      prev.includes(exerciseId)
        ? prev.filter(id => id !== exerciseId)
        : [...prev, exerciseId]
    )
  }

  const handleOpenExerciseInfoModal = async (exerciseName: string) => {
    setIsExerciseInfoModalOpen(true);
    setIsFetchingExerciseInfo(true);
    setCurrentExerciseForInfo({ name: exerciseName });

    // Explicitly check userProfile and userProfile.gender here
    if (!userProfile || !userProfile.gender) {
      setCurrentExerciseForInfo({ 
        name: exerciseName, 
        error: "User profile information (gender) is missing. Cannot fetch details. Please complete your profile." 
      });
      setIsFetchingExerciseInfo(false);
      return;
    }

    try {
      const response = await fetch('/api/exercise-info', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ exercise: exerciseName, gender: userProfile.gender }),
      });

      if (!response.ok) throw new Error((await response.json())?.message || `HTTP error! status: ${response.status}`);

      const data: ApiReturnedExerciseDetails = await response.json();
      setCurrentExerciseForInfo({ name: exerciseName, details: data });
    } catch (error: unknown) {
      const errorMessage = error instanceof Error ? error.message : "Could not load exercise details."
      setCurrentExerciseForInfo({ name: exerciseName, error: errorMessage });
    } finally {
      setIsFetchingExerciseInfo(false);
    }
  };

  // New loading sequence using pageState
  if (pageState === "contextLoading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-orange-500" />
        <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Loading user data...</span>
      </div>
    );
  }

  if (pageState === "profileLoading") { // New state for profile loading
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-orange-500" />
        <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Loading profile...</span>
      </div>
    );
  }

  if (pageState === "planLoading") {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-orange-500" />
        <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Loading workout details...</span>
      </div>
    );
  }

  if (pageState === "error" || (pageState === "planLoaded" && !plan)) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
        <p className="p-6 text-center text-xl text-slate-600 dark:text-slate-400">Workout not found or error loading.</p>
      </div>
    );
  }

  // If pageState is "planLoaded" and plan exists, render the content
  if (pageState === "planLoaded" && plan) {
    const workoutTitle = plan.plan?.title || "ForgeFit Workout";
    const pageOgUrl = `https://www.forgefit.pro/workout/${uid}/${ts}`;
    const ogDescription = "Join me on ForgeFit and try this custom AI-generated workout!";

    // Share message definitions  
    const emailSubject = `Check out this ForgeFit Workout: ${workoutTitle}`;
    const emailBody = `I thought you might like this workout I found on ForgeFit! Perfect for ${plan.plan?.goal || 'achieving your fitness goals'}. You can view it here: ${pageOgUrl}`;
    const xShareMessage = `Just finished a great workout: "${workoutTitle}" on ForgeFit! ${ogDescription}`;
    const facebookShareText = `Check out this amazing ForgeFit workout: "${workoutTitle}"! Perfect for ${plan.plan?.goal || 'achieving your fitness goals'}.`;


    const handlePrint = () => {
      if (typeof window !== 'undefined') {
        const printContents = document.getElementById("printable-workout")?.innerHTML;
        const printWindow = window.open("", "_blank", "height=800,width=800");

        if (printWindow && printContents) {
          printWindow.document.write(`
            <html>
              <head>
                <title>${plan.plan?.title || "ForgeFit Workout"} - Print</title>
                <style>
                  body { font-family: Arial, sans-serif; padding: 20px; color: #333; margin: 0 auto; max-width: 700px; }
                  .print-header { text-align: center; margin-bottom: 25px; }
                  .print-header img.logo { width: 160px; margin-bottom: 8px; }
                  .print-header .app-url { font-size: 13px; color: #555; margin:0; }
                  
                  .workout-title-print { text-align: center; color: #2c3e50; font-size: 26px; margin-bottom: 5px; font-weight: bold; }
                  .workout-duration-print { text-align: center; color: #555; font-size: 15px; margin-bottom: 25px; }

                  .exercise-section-print { margin-bottom: 20px; }
                  .exercise-section-print h3 { 
                    font-size: 18px; 
                    color: #ee772f; 
                    margin-top: 20px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 12px;
                  }
                  .exercise-section-print ul { list-style-type: none; padding-left: 0; margin-top: 0; }
                  .exercise-section-print li { 
                    font-size: 14px; 
                    margin-bottom: 8px; 
                    padding: 6px 0; 
                    border-bottom: 1px solid #eee; 
                  }
                  .exercise-section-print li:last-child { border-bottom: none; }
                  .exercise-name-print { font-weight: bold; color: #34495e; }
                  .exercise-details-print { font-size: 13px; color: #7f8c8d; margin-left: 8px; }
                  .exercise-actions-print { display: none !important; } /* Hide action buttons */

                  .notes-section-print { margin-top: 30px; }
                  .notes-section-print h3 { 
                    font-size: 18px; 
                    color: #ee772f; 
                    margin-top: 20px;
                    border-bottom: 1px solid #ddd;
                    padding-bottom: 5px;
                    margin-bottom: 8px;
                  }
                  .notes-section-print p { font-size: 14px; white-space: pre-wrap; line-height: 1.6; color: #333; }
                  
                  .print-footer { 
                    text-align: center; 
                    margin-top: 30px; 
                    padding-top: 15px; 
                    border-top: 1px solid #ccc; 
                    font-size: 12px; 
                    color: #555; 
                  }
                  /* Reset any potential inherited styles from the main page\'s classes */
                  .bg-white, .dark\\\\:bg-slate-800\\\\/70, .dark\\\\:bg-slate-800\\\\/50, .bg-slate-50, .dark\\\\:bg-slate-900 {
                    background-color: #ffffff !important;
                    box-shadow: none !important;
                  }
                  .p-4, .p-6 { padding: 0 !important; }
                  .mb-3, .mb-6, .mb-8, .mt-8 { margin: 0 !important; } /* More specific resets might be needed */
                 </style>
              </head>
              <body>
                <div class="print-header">
                  <img src="/images/Logo/forgefit-logo-orange.png" alt="ForgeFit Logo" class="logo" />
                  <p class="app-url">https://forgefit.pro</p>
                </div>
                ${printContents}
                <div class="print-footer">
                  Generated with <strong>ForgeFit</strong> &mdash; https://forgefit.pro
                </div>
              </body>
            </html>
          `);
          printWindow.document.close();
          printWindow.focus();
          setTimeout(() => {
            printWindow.print();
            printWindow.close();
          }, 250);
        } else if (!printContents) {
          console.error("Could not find printable content.");
        } else {
          console.error("Could not open print window.");
        }
      }
    };

    const renderExerciseSection = (title: string, exercises: ExerciseItem[], sectionKey: string) => {
      if (!exercises || exercises.length === 0) return null;
      return (
        <div className="mb-6 bg-white dark:bg-slate-800/50 p-4 rounded-lg shadow exercise-section-print">
          <h3 className="font-semibold text-xl mb-3 text-slate-700 dark:text-slate-300 border-b pb-2">{title}</h3>
          <ul className="space-y-3">
            {exercises.map((item: ExerciseItem, idx: number) => {
              const hasValidExerciseName = typeof item.exercise === 'string' && item.exercise.trim() !== '';
              const exerciseKeyName = hasValidExerciseName ? item.exercise!.replace(/\\s+/g, '-') : 'unknown-exercise';
              const exerciseId = `${sectionKey}-${exerciseKeyName}-${idx}`;
              const isCompleted = completedExercises.includes(exerciseId);
              return (
                <li key={exerciseId} className={`flex items-center justify-between p-3 rounded-md transition-all ${isCompleted ? 'bg-green-50 dark:bg-green-900/30 opacity-70' : 'bg-slate-50 dark:bg-slate-700/30 hover:bg-slate-100 dark:hover:bg-slate-600/40'}`}>
                  <div className="flex-grow">
                    <span className="font-medium text-slate-800 dark:text-slate-200 exercise-name-print">
                      {hasValidExerciseName ? item.exercise : "Unnamed Exercise"}
                    </span>
                    {(item.sets && item.reps) && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 exercise-details-print">
                        ({item.sets} sets x {item.reps} reps)
                      </span>
                    )}
                    {item.description && !item.sets && !item.reps && (
                      <span className="text-sm text-slate-500 dark:text-slate-400 ml-2 exercise-details-print">
                        ({item.description})
                      </span>
                    )}
                  </div>
                  <div className="flex items-center space-x-2 exercise-actions-print">
                    {hasValidExerciseName && (
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        onClick={() => handleOpenExerciseInfoModal(item.exercise!)} 
                        className="text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
                        aria-label={`More information about ${item.exercise}`}
                      >
                        <Info className="h-5 w-5" />
                      </Button>
                    )}
                    <Button
                      variant={isCompleted ? "ghost" : "outline"}
                      size="icon"
                      onClick={() => handleToggleComplete(exerciseId)}
                      className={`${isCompleted ? 'text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300' : 'text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'}`}
                      aria-label={isCompleted ? `Mark ${item.exercise} as incomplete` : `Mark ${item.exercise} as complete`}
                    >
                      <CheckCircle2 className="h-5 w-5" />
                    </Button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>
      );
    };

    return (
      <>
        <div className="max-w-3xl mx-auto p-4 sm:p-6 bg-slate-50 dark:bg-slate-900 min-h-screen pb-20 md:pb-6">
          <div className="flex justify-between items-center mb-6">
            <Button variant="outline" size="sm" onClick={() => router.back()} className="bg-white dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            {allExercisesCompleted && (
              <Badge variant="default" className="bg-green-500 hover:bg-green-600 text-white text-sm py-1 px-3">
                <BadgeCheck className="h-4 w-4 mr-1.5" />
                Workout Completed!
              </Badge>
            )}
          </div>

          {plan && (
            <>
              {plan.image && (
                <div className="mb-4">
                  <Image src={plan.image} alt={plan.plan?.title || "Workout Image"} width={600} height={400} className="rounded-lg mx-auto w-full h-auto shadow-md" priority />
                </div>
              )}
              
              <div className="flex justify-center items-center space-x-3 mt-4 mb-6">
                <Button variant="outline" size="icon" asChild className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <a href={`mailto:?subject=${encodeURIComponent(emailSubject)}&body=${encodeURIComponent(emailBody)}`} title="Share via Email">
                    <Mail className="h-5 w-5" />
                  </a>
                </Button>
                <Button 
                  variant="outline" 
                  size="icon" 
                  onClick={() => {
                    const url = encodeURIComponent(pageOgUrl);
                    const text = encodeURIComponent(facebookShareText);
                    window.open(
                      `https://www.facebook.com/sharer/sharer.php?u=${url}&quote=${text}`,
                      "_blank",
                      "width=600,height=400"
                    );
                  }}
                  className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700"
                  title="Share on Facebook"
                >
                  <Facebook className="h-5 w-5" />
                </Button>
                <Button variant="outline" size="icon" asChild className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <a 
                    href={`https://twitter.com/intent/tweet?url=${encodeURIComponent(pageOgUrl)}&text=${encodeURIComponent(xShareMessage)}`}
                    target="_blank" 
                    rel="noopener noreferrer" 
                    title="Share on X"
                  >
                    <X className="h-5 w-5" />
                  </a>
                </Button>
                <Button variant="outline" size="icon" onClick={handlePrint} title="Print Workout" className="text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-700">
                  <Printer className="h-5 w-5" />
                </Button>
              </div>

              <div id="printable-workout">
                <div className="bg-white dark:bg-slate-800/70 shadow-xl rounded-lg p-6 mb-8">
                  <h1 className="text-3xl font-bold text-center text-primary dark:text-orange-400 mb-2 workout-title-print">{plan.plan?.title || "Untitled Plan"}</h1>
                  <p className="text-center text-md text-muted-foreground dark:text-slate-400 mb-6 workout-duration-print">Duration: {plan.plan?.duration || "--"}</p>
                </div>

                {renderExerciseSection("Warm-up", plan.plan?.workout?.warmup || [], "warmup")}
                {plan.plan?.workout && (
                  <>
                    {renderExerciseSection("Main Workout", plan.plan.workout.mainWorkout || [], "mainWorkout")}
                    {renderExerciseSection("Cooldown", plan.plan.workout.cooldown || [], "cooldown")}
                  </>
                )}
                {plan.plan?.notes && (
                  <div className="mt-8 bg-white dark:bg-slate-800/70 shadow-xl rounded-lg p-6 notes-section-print">
                    <h3 className="font-semibold text-xl mb-3 text-slate-700 dark:text-slate-300 border-b pb-2">Workout Notes</h3>
                    <p className="text-sm text-slate-600 dark:text-slate-400 whitespace-pre-wrap">{plan.plan.notes}</p>
                  </div>
                )}
              </div> {/* END of printable-workout */}
            </>
          )}

          {isExerciseInfoModalOpen && currentExerciseForInfo && (
            <Dialog open={isExerciseInfoModalOpen} onOpenChange={setIsExerciseInfoModalOpen}>
              <DialogContent className="w-[95vw] max-w-lg bg-white dark:bg-slate-800 max-h-[90vh] flex flex-col rounded-lg p-4 sm:p-6">
                <DialogHeader>
                  <DialogTitle className="text-2xl font-semibold text-slate-800 dark:text-slate-100">
                    {currentExerciseForInfo.name}
                  </DialogTitle>
                  {currentExerciseForInfo.error && (
                    <DialogDescription className="text-red-500 dark:text-red-400 pt-2">
                      Error: {currentExerciseForInfo.error}
                    </DialogDescription>
                  )}
                </DialogHeader>
                {isFetchingExerciseInfo && (
                  <div className="flex justify-center items-center py-8 flex-1">
                    <Loader2 className="h-6 w-6 animate-spin text-primary dark:text-orange-500" />
                    <span className="ml-2 text-slate-600 dark:text-slate-300">Fetching details...</span>
                  </div>
                )}
                {!isFetchingExerciseInfo && currentExerciseForInfo.details && (
                  <div className="mt-4 space-y-5 overflow-y-auto pr-2 text-slate-700 dark:text-slate-300 flex-1 min-h-0">
                    <div>
                      <h4 className="font-semibold text-lg mb-1.5 text-primary dark:text-orange-400">Description:</h4>
                      <p className="text-sm leading-relaxed">{renderMarkdownBold(currentExerciseForInfo.details.description)}</p>
                    </div>
                    {currentExerciseForInfo.details.stepByStep && currentExerciseForInfo.details.stepByStep.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-lg mb-1.5 text-primary dark:text-orange-400">Step-by-Step Instructions:</h4>
                        <ul className="list-decimal list-outside pl-5 space-y-1 text-sm">
                          {currentExerciseForInfo.details.stepByStep.map((step, i) => (
                            <li key={i} className="leading-relaxed">{renderMarkdownBold(step.replace(/^\s*\d+\.\s*/, ''))}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {currentExerciseForInfo.details.commonMistakes && currentExerciseForInfo.details.commonMistakes.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-lg mb-1.5 text-primary dark:text-orange-400">Common Mistakes:</h4>
                        <ul className="list-disc list-outside pl-5 space-y-1 text-sm">
                          {currentExerciseForInfo.details.commonMistakes.map((mistake, i) => (
                            <li key={i} className="leading-relaxed">{renderMarkdownBold(mistake.replace(/^\s*([\*\-\+]|\d+\.)\s*/, ''))}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                    {currentExerciseForInfo.details.safetyTips && currentExerciseForInfo.details.safetyTips.length > 0 && (
                      <div>
                        <h4 className="font-semibold text-lg mb-1.5 text-primary dark:text-orange-400">Safety Tips:</h4>
                        <ul className="list-disc list-outside pl-5 space-y-1 text-sm">
                          {currentExerciseForInfo.details.safetyTips.map((tip, i) => (
                            <li key={i} className="leading-relaxed">{renderMarkdownBold(tip.replace(/^\s*([\*\-\+]|\d+\.)\s*/, ''))}</li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                )}
                {!isFetchingExerciseInfo && !currentExerciseForInfo.details && currentExerciseForInfo.error && (
                  <div className="mt-4 text-slate-700 dark:text-slate-300 flex-1 min-h-0">
                    {/* Error is already displayed in DialogDescription, this div is for layout consistency if needed */}
                  </div>
                )}
                {!isFetchingExerciseInfo && !currentExerciseForInfo.details && !currentExerciseForInfo.error && (
                   <div className="flex justify-center items-center py-8 flex-1">
                     <span className="text-slate-600 dark:text-slate-300">No details available.</span>
                   </div>
                )}
                <DialogFooter className="mt-6">
                  <DialogClose asChild>
                    <Button variant="outline" className="dark:text-slate-200 dark:border-slate-600 dark:hover:bg-slate-700">Close</Button>
                  </DialogClose>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </>
    );
  }

  return (
    <div className="flex justify-center items-center min-h-screen bg-slate-50 dark:bg-slate-900">
      <Loader2 className="h-8 w-8 animate-spin text-primary dark:text-orange-500" />
      <span className="ml-3 text-lg text-slate-700 dark:text-slate-300">Loading workout...</span>
    </div>
  );
}
