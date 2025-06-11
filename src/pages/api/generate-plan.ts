import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextApiRequest, NextApiResponse } from 'next';
import { adminDB } from '../../lib/firebase-admin';

const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  // Check if API method is POST
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  // Validate API key
  if (!API_KEY) {
    console.error("NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables");
    return res.status(500).json({ error: "API key not configured", details: "NEXT_PUBLIC_GEMINI_API_KEY is missing" });
  }

  // Validate request body
  const { userProfile, preferences, userId } = req.body || {};
  
  if (!userProfile) {
    console.error("Missing userProfile in request body");
    return res.status(400).json({ error: "Missing userProfile in request body" });
  }

  if (!userId) {
    console.error("Missing userId in request body");
    return res.status(400).json({ error: "Missing userId in request body" });
  }

  // Check user subscription status and workout count with proper debugging
  try {
    if (!adminDB) {
      console.warn("Firebase Admin not configured, skipping subscription check");
    } else {
      const userDoc = await adminDB.collection('users').doc(userId).get();
      
      if (userDoc.exists) {
        const userData = userDoc.data();
        const profile = userData?.profile || {};
        const plan = profile?.plan || 'free';
        const workoutsGenerated = profile?.workoutsGenerated || 0;
        
        console.log(`🔍 Checking limits for user ${userId}:`);
        console.log(`   Plan: ${plan}`);
        console.log(`   Workouts Generated: ${workoutsGenerated}`);
        console.log(`   Is Premium: ${plan === 'premium'}`);
        console.log(`   Should Block: ${plan !== 'premium' && workoutsGenerated >= 3}`);
        
        // If user is on free plan and has generated 3 or more workouts, deny access
        if (plan !== 'premium' && workoutsGenerated >= 3) {
          console.log(`❌ BLOCKING: User ${userId} has reached free limit (${workoutsGenerated}/3)`);
          return res.status(403).json({ error: "Free limit reached. Upgrade to generate more." });
        }
        
        console.log(`✅ ALLOWING: User ${userId} can generate workout (${workoutsGenerated}/3)`);
      } else {
        console.log(`⚠️ User document does not exist for ${userId}, treating as new user`);
      }
    }
  } catch (error) {
    console.error("Error checking user subscription:", error);
    // Continue with generation if there's an error checking subscription
  }

  console.log("Generating workout plan for user:", userProfile);
  console.log("With preferences:", preferences);

  const genAI = new GoogleGenerativeAI(API_KEY);
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

  let equipmentPrompt = "The user has no specific equipment available, so focus on bodyweight exercises.";
  if (preferences?.equipment && preferences.equipment.length > 0) {
    equipmentPrompt = `The user has the following equipment available: ${preferences.equipment.join(', ')}.`;
    if (preferences.otherEquipment && preferences.otherEquipment.trim() !== "") {
      equipmentPrompt += ` They also listed: ${preferences.otherEquipment.trim()}.`;
    }
  } else if (preferences?.otherEquipment && preferences.otherEquipment.trim() !== "") {
    equipmentPrompt = `The user has the following equipment available: ${preferences.otherEquipment.trim()}.`;
  }

  let workoutFocusPrompt = "The user wants a full body workout."; // Default to full body

  if (preferences?.type === "target-muscle") {
    const { upperBody, core, lowerBody } = preferences.muscles || {};
    const targetMuscles = [...(upperBody || []), ...(core || []), ...(lowerBody || [])];

    if (targetMuscles.length > 0) {
        workoutFocusPrompt = `You are strictly required to include exercises ONLY for the following muscle groups: ${targetMuscles.join(', ')}. Do NOT include any exercises targeting unrelated areas. 
        If a compound movement affects other muscles, exclude it unless it is commonly used specifically for the selected target group.`;
    } else {
      // Fallback if "target-muscle" is selected but no specific muscles are provided
      workoutFocusPrompt = "The user selected 'target muscle groups' but did not specify any particular muscles. In this case, please provide a comprehensive full body workout.";
    }
  }
  // If preferences.type is not "target-muscle", workoutFocusPrompt remains "The user wants a full body workout."

  const durationPrompt = preferences?.duration ? `The workout duration should be approximately ${preferences.duration} minutes.` : "The workout duration should be a standard length (e.g., 45-60 minutes).";

const prompt = `Create a workout plan for a ${userProfile.experience} user whose goal is ${userProfile.goals}, age ${userProfile.age}, gender ${userProfile.gender}. 
${durationPrompt}
${workoutFocusPrompt}
${equipmentPrompt}

Return only a valid JSON object with the following shape:

{
  "title": string, // e.g., "Full Body Strength Blast" or "Targeted Upper Body Pump"
  "duration": string, // e.g., "45 minutes", "1 hour, 15 minutes"
  "workout": {
    "warmup": [ { "exercise": string, "description": string } ], // e.g., { "exercise": "Jumping Jacks", "description": "30 seconds" }
    "mainWorkout": [ { "exercise": string, "description": string, "sets": number, "reps": string } ], // e.g., { "exercise": "Push-ups", "description": "Chest, Shoulders, Triceps", "sets": 3, "reps": "10-12" } or { "exercise": "Squats", "description": "Quads, Glutes, Hamstrings", "sets": 4, "reps": "AMRAP" }
    "cooldown": [ { "exercise": string, "description": string } ], // e.g., { "exercise": "Quad Stretch", "description": "30 seconds per side" }
    "notes": string // Any additional notes, tips, or advice for the workout.
  }
}

Do not include markdown formatting, code blocks, or any text outside the JSON object. Just return the raw JSON.`

  try {
    console.log("Calling Gemini API...");
    const result = await model.generateContent(prompt);
    console.log("Gemini API call successful");
    
    const response = await result.response;
    const text = await response.text();
    
    console.log("Generated text:", text.substring(0, 200) + "...");
    
    // Increment workout count for the user
    try {
      if (adminDB) {
        console.log(`🔄 Attempting to increment workoutsGenerated for user: ${userId}`);
        const userDoc = await adminDB.collection('users').doc(userId).get();
        const currentProfile = userDoc.data()?.profile || {};
        const currentCount = currentProfile?.workoutsGenerated || 0;
        
        console.log(`   Current count before increment: ${currentCount}`);
        
        await adminDB.collection('users').doc(userId).set({
          profile: {
            ...currentProfile,
            workoutsGenerated: currentCount + 1,
            lastWorkoutGenerated: new Date(),
          }
        }, { merge: true });
        
        console.log(`✅ Successfully updated workoutsGenerated for user ${userId}: ${currentCount} -> ${currentCount + 1}`);
        
        // Verify the update worked
        const verifyDoc = await adminDB.collection('users').doc(userId).get();
        const newCount = verifyDoc.data()?.profile?.workoutsGenerated || 0;
        console.log(`✅ Verified new workoutsGenerated count: ${newCount}`);
        
        // Log if user is now at the limit
        if (newCount >= 3) {
          console.log(`⚠️ User ${userId} has now reached the free limit (${newCount}/3). Next generation should be blocked.`);
        }
      } else {
        console.warn("❌ Firebase Admin DB not available, workout count will not be updated");
      }
    } catch (error) {
      console.error("❌ Error updating workout count:", error);
      // Don't fail the request if we can't update the count
    }
    
    res.status(200).json({ text });
  } catch (error) {
    console.error("Error generating workout plan:", error);
    
    // More detailed error logging
    if (error instanceof Error) {
      console.error("Error name:", error.name);
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }
    
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ 
      error: "Failed to generate workout plan", 
      details: errorMessage,
      type: error instanceof Error ? error.name : "UnknownError"
    });
  }
}
