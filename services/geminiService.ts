import { GoogleGenAI } from "@google/genai";

// Helper to safely get env vars in various environments (Vite, Next.js, Standard Node)
const getApiKey = (): string => {
  try {
    // 1. Check for Vite environment (Standard for Vercel React apps)
    // @ts-ignore
    if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_KEY) {
      // @ts-ignore
      return import.meta.env.VITE_API_KEY;
    }

    // 2. Check for standard process.env
    // We strictly check typeof process to avoid "ReferenceError" in browser environments
    if (typeof process !== 'undefined' && process.env) {
       // Support standard key, Next.js public key, or CRA key
       return process.env.API_KEY || process.env.NEXT_PUBLIC_API_KEY || process.env.REACT_APP_API_KEY || '';
    }
  } catch (e) {
    console.warn("Environment variable access failed");
  }
  return '';
};

const apiKey = getApiKey();

export const getWatermarkSuggestion = async (intent: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key not found. Please check your Environment Variables (e.g., VITE_API_KEY).");
    return "僅供申辦業務使用";
  }

  try {
    const ai = new GoogleGenAI({ apiKey });
    const response = await ai.models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: `User intent: "${intent}". 
      Based on this intent, generate a concise, formal Traditional Chinese watermark text commonly used on ID documents. 
      Example format: "僅供XX銀行開戶使用" or "僅供租屋申請使用".
      Keep it short (under 15 characters).
      Return ONLY the text string.`,
    });

    return response.text?.trim() || "僅供申辦業務使用";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "僅供申辦業務使用";
  }
};