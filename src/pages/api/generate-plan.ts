import { GoogleGenerativeAI } from "@google/generative-ai"
import { NextApiRequest, NextApiResponse } from 'next';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  const { userProfile, preferences } = req.body // Destructure preferences

  const genAI = new GoogleGenerativeAI(process.env.NEXT_PUBLIC_GEMINI_API_KEY!)
  const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" })

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
    const result = await model.generateContent(prompt)
    const response = await result.response
    const text = await response.text()
    res.status(200).json({ text })
  } catch (error) {
    console.error("Error generating workout plan:", error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    res.status(500).json({ error: "Failed to generate workout plan", details: errorMessage });
  }
}
