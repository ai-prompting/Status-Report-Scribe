import { GoogleGenAI } from "@google/genai";
import { blobToBase64 } from "../utils/audioUtils";
import { TargetLanguage, ContextFile } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const MODEL_NAME = "gemini-3-flash-preview";

const getSystemInstruction = (language: TargetLanguage) => `
You are an expert technical minute-taker for status meetings. 
Your Input: 
1. Optional: Existing Context (Text or File) describing the current status.
2. Audio: A person giving a status update.

Your Task: Compare the Audio against the Existing Context.
Your Output: Strictly clean, concise ${language === 'en' ? 'ENGLISH' : 'GERMAN'} bullet points for the "Comments" column.

CRITICAL RULES:
1. **NO DUPLICATES**: If the audio merely repeats what is in the Existing Context, IGNORE IT.
2. **UPDATES ONLY**: Only capture NEW information, changes to the existing status, answers to questions, or specific questions asked.
3. If the audio contradicts the context, note the change explicitly.
4. Output format: Plain text bullet points (using "- ").
5. Translate content to ${language === 'en' ? 'ENGLISH' : 'GERMAN'}.
6. Keep it short and knackig (concise).
`;

export const generateReportFromAudio = async (
  audioBlob: Blob, 
  mimeType: string, 
  language: TargetLanguage,
  contextText?: string,
  contextFile?: ContextFile
): Promise<string> => {
  try {
    const base64Audio = await blobToBase64(audioBlob);

    // Build the parts array
    const parts: any[] = [];

    // 1. Add Context File if exists (Image/PDF)
    if (contextFile) {
      parts.push({
        inlineData: {
          mimeType: contextFile.mimeType,
          data: contextFile.data
        }
      });
      parts.push({ text: `[SYSTEM] Above is the attached existing context file (${contextFile.name}).` });
    }

    // 2. Add Context Text if exists
    if (contextText && contextText.trim().length > 0) {
      parts.push({ 
        text: `[SYSTEM] EXISTING CONTEXT / CURRENT STATUS:\n"${contextText}"\n\n(Do not repeat this information in the output unless it is being corrected/updated).` 
      });
    }

    // 3. Add Audio
    parts.push({
      inlineData: {
        mimeType: mimeType,
        data: base64Audio
      }
    });

    // 4. Final Prompt
    parts.push({
      text: `Analyze the audio. Extract ONLY new info, changes, or Q&A relative to the context above. Output in ${language === 'en' ? 'English' : 'German'} bullet points.`
    });

    const response = await ai.models.generateContent({
      model: MODEL_NAME,
      config: {
        systemInstruction: getSystemInstruction(language),
        temperature: 0.2, // Low temperature for factual accuracy
      },
      contents: {
        parts: parts
      }
    });

    return response.text || (language === 'en' ? "No new updates detected." : "Keine neuen Updates erkannt.");
  } catch (error: any) {
    console.error("Gemini API Error:", error);
    throw new Error(error.message || "Failed to process audio.");
  }
};