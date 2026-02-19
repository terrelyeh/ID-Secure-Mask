import { GoogleGenAI } from "@google/genai";

const apiKey = process.env.API_KEY || '';

export const getWatermarkSuggestion = async (intent: string): Promise<string> => {
  if (!apiKey) {
    console.warn("API Key not found");
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