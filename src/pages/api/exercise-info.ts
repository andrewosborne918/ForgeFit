import { NextApiRequest, NextApiResponse } from 'next';
import { GoogleGenerativeAI, HarmCategory, HarmBlockThreshold } from '@google/generative-ai';

const MODEL_NAME = "gemini-1.5-flash";
const API_KEY = process.env.NEXT_PUBLIC_GEMINI_API_KEY;

if (!API_KEY) {
  throw new Error("NEXT_PUBLIC_GEMINI_API_KEY is not set in environment variables.");
}

const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: MODEL_NAME });

const generationConfig = {
  temperature: 0.7, // Adjusted for a balance between creativity and factualness
  topK: 1,
  topP: 1,
  maxOutputTokens: 2048, // Increased to allow for detailed descriptions
};

const safetySettings = [
  { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
  { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE },
];

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', ['POST']);
    return res.status(405).json({ error: `Method ${req.method} Not Allowed` });
  }

  const { exercise, gender } = req.body;

  if (!exercise || typeof exercise !== 'string') {
    return res.status(400).json({ error: 'Exercise name (string) is required in the request body.' });
  }
  if (!gender || typeof gender !== 'string') {
    // Gender might not be strictly necessary for all exercises, but good to have for context if needed by LLM
    // For now, let's make it required as per the prompt, can be relaxed later.
    return res.status(400).json({ error: 'Gender (string) is required in the request body.' });
  }

  const prompt = `
    Provide detailed information for the exercise: "${exercise}".
    Consider the user's gender is ${gender} if it influences the advice or common mistakes.

    Return ONLY a valid JSON object (no markdown, no surrounding text, just the raw JSON) with the following exact structure:
    {
      "exercise": "${exercise}",
      "description": "A concise overview of the exercise, what muscles it targets, and its primary benefits.",
      "stepByStep": [
        "Clear, numbered step for performing the exercise correctly, from start to finish.",
        "Another step...",
        "And so on..."
      ],
      "safetyTips": [
        "Important safety considerations to prevent injury.",
        "Another safety tip..."
      ],
      "commonMistakes": [
        "Common errors people make when performing this exercise and how to avoid them.",
        "Another common mistake..."
      ],
      "imagePrompt": "A detailed textual prompt for an AI image generator to create a visually accurate and helpful image of a person (gender: ${gender}) correctly performing the '${exercise}'. Describe the starting position, key movement, and ideal form. For example: 'Photo of a ${gender} performing a perfect squat, side view, back straight, thighs parallel to the floor, weights held at shoulder height.'"
    }
  `;

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: prompt }] }],
      generationConfig,
      safetySettings,
    });

    if (!result.response || !result.response.candidates || result.response.candidates.length === 0) {
      console.error('No candidates in LLM response for exercise:', exercise, result);
      return res.status(500).json({ error: 'Failed to generate exercise information: No response from model.' });
    }
    
    const candidate = result.response.candidates[0];

    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
        console.error('No content parts in LLM response for exercise:', exercise, candidate);
        return res.status(500).json({ error: 'Failed to generate exercise information: No content from model.' });
    }

    let text = candidate.content.parts[0].text || "";
    
    // Clean the response to ensure it's valid JSON
    text = text.trim();
    const jsonPrefix = "```json";
    const jsonSuffix = "```";

    if (text.startsWith(jsonPrefix)) {
      text = text.substring(jsonPrefix.length);
    }
    if (text.endsWith(jsonSuffix)) {
      text = text.substring(0, text.length - jsonSuffix.length);
    }
    text = text.trim();

    try {
      const parsedJson = JSON.parse(text);
      return res.status(200).json(parsedJson);
    } catch (parseError) {
      console.error('Failed to parse LLM response as JSON for exercise:', exercise, 'Raw text:', text, 'Error:', parseError);
      return res.status(500).json({ error: 'Failed to generate exercise information: Invalid JSON format from model.', details: (parseError as Error).message, rawOutput: text });
    }

  } catch (error) {
    console.error('Error calling Generative AI for exercise:', exercise, error);
    const errorMessage = error instanceof Error ? error.message : "An unknown error occurred";
    return res.status(500).json({ error: 'Failed to generate exercise information.', details: errorMessage });
  }
}
