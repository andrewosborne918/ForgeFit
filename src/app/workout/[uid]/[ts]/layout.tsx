import { Metadata } from 'next'
import { getFirestore, doc, getDoc } from "firebase/firestore"
import { app, isFirebaseConfigured } from "@/lib/firebase"

interface WorkoutPlan {
  id?: string;
  title?: string;
  image?: string;
  plan?: {
    title?: string;
    goal?: string;
    duration?: string | number;
  };
}

interface Props {
  params: Promise<{ uid: string; ts: string }>
  children: React.ReactNode
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { uid, ts } = await params
  
  try {
    if (!isFirebaseConfigured || !app) {
      return {
        title: 'Workout Plan - ForgeFit',
        description: 'AI-generated workout plan on ForgeFit',
      }
    }

    const db = getFirestore(app)
    let plan: WorkoutPlan | null = null

    if (ts.startsWith("generated-")) {
      // Check user document for generated plans
      const userDocRef = doc(db, `users/${uid}`)
      const userDocSnap = await getDoc(userDocRef)
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data()
        
        // Check activePlan
        if (userData.activePlan && userData.activePlan.id === ts) {
          plan = userData.activePlan
        } 
        // Check weeklySchedule
        else if (userData.weeklySchedule && Array.isArray(userData.weeklySchedule)) {
          for (const daySchedule of userData.weeklySchedule) {
            if (daySchedule && daySchedule.type === 'workout' && daySchedule.workout && daySchedule.workout.id === ts) {
              plan = daySchedule.workout
              break
            }
          }
        }
      }
    } else {
      // Check logs for regular workout plans
      const logRef = doc(db, `users/${uid}/logs/${ts}`)
      const logSnap = await getDoc(logRef)
      
      if (logSnap.exists()) {
        plan = logSnap.data() as WorkoutPlan
      }
    }

    if (plan) {
      const workoutTitle = plan.plan?.title || plan.title || "ForgeFit Workout"
      const ogDescription = "Join me on ForgeFit and try this custom AI-generated workout!"
      const pageOgUrl = `https://www.forgefit.pro/workout/${uid}/${ts}`
      
      // Generate social media image URL
      const workoutImagePath = plan.image ? encodeURIComponent(plan.image) : ''
      const workoutTitleEncoded = encodeURIComponent(workoutTitle)
      const workoutDuration = plan.plan?.duration ? encodeURIComponent(plan.plan.duration.toString()) : ''
      const socialImageUrl = `https://www.forgefit.pro/api/generate-social-image?workoutImage=${workoutImagePath}&title=${workoutTitleEncoded}&duration=${workoutDuration}`
      
      // Use generated social image or fallback
      const fallbackImage = plan.image ? `https://www.forgefit.pro/${plan.image}` : "https://www.forgefit.pro/api/default-social-image"
      const ogImage = plan.image ? socialImageUrl : fallbackImage

      return {
        title: `${workoutTitle} - ForgeFit`,
        description: ogDescription,
        openGraph: {
          title: workoutTitle,
          description: ogDescription,
          url: pageOgUrl,
          siteName: 'ForgeFit',
          images: [
            {
              url: ogImage,
              width: 1200,
              height: 630,
              alt: workoutTitle,
            },
          ],
          type: 'website',
        },
        twitter: {
          card: 'summary_large_image',
          title: workoutTitle,
          description: ogDescription,
          images: [ogImage],
        },
      }
    }
  } catch (error) {
    console.error('Error generating metadata:', error)
  }

  // Fallback metadata
  return {
    title: 'Workout Plan - ForgeFit',
    description: 'AI-generated workout plan on ForgeFit',
    openGraph: {
      title: 'Workout Plan - ForgeFit',
      description: 'AI-generated workout plan on ForgeFit',
      url: `https://www.forgefit.pro/workout/${uid}/${ts}`,
      siteName: 'ForgeFit',
      images: [
        {
          url: 'https://www.forgefit.pro/api/default-social-image',
          width: 1200,
          height: 630,
          alt: 'ForgeFit Workout',
        },
      ],
      type: 'website',
    },
    twitter: {
      card: 'summary_large_image',
      title: 'Workout Plan - ForgeFit',
      description: 'AI-generated workout plan on ForgeFit',
      images: ['https://www.forgefit.pro/api/default-social-image'],
    },
  }
}

export default function WorkoutLayout({ children }: Props) {
  return <>{children}</>
}
