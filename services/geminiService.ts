
import { GoogleGenAI, Type } from "@google/genai";
import { WordData, SentenceData, PronunciationFeedback } from "../types";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const wordCache = new Map<string, WordData>();
const sentenceCache = new Map<string, SentenceData>();

// Define schema objects directly for responseSchema
const wordSchema = {
  type: Type.OBJECT,
  properties: {
    word: { type: Type.STRING, description: "The English word (even if input was Vietnamese)" },
    meaning_vi: { type: Type.STRING, description: "Main Vietnamese meaning" },
    definition_en: { type: Type.STRING, description: "Short, simple English definition (max 15 words)" },
    ipa: { type: Type.STRING },
    syllables: { type: Type.STRING },
    spelling_tip: { type: Type.STRING },
    part_of_speech: { type: Type.STRING },
    example_en: { type: Type.STRING },
    example_vi: { type: Type.STRING },
    example_b2_en: { type: Type.STRING },
    example_b2_vi: { type: Type.STRING },
    root_word_mnemonic: { type: Type.STRING },
    synonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
    antonyms: { type: Type.ARRAY, items: { type: Type.STRING } },
    word_family: { type: Type.ARRAY, items: { type: Type.STRING } },
    collocations: { type: Type.ARRAY, items: { type: Type.STRING } },
  },
  required: ["word", "meaning_vi", "definition_en", "ipa", "example_en", "example_vi", "root_word_mnemonic"],
};

const sentenceSchema = {
  type: Type.OBJECT,
  properties: {
    sentence: { type: Type.STRING, description: "The English version of the sentence" },
    meaning_vi: { type: Type.STRING, description: "Vietnamese translation/original" },
    grammar_breakdown: { type: Type.STRING },
    usage_context: { type: Type.STRING },
    naturalness_score: { type: Type.NUMBER },
    similar_sentences: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          en: { type: Type.STRING },
          vi: { type: Type.STRING }
        }
      }
    }
  },
  required: ["sentence", "meaning_vi", "grammar_breakdown", "usage_context", "naturalness_score", "similar_sentences"]
};

const pronunciationSchema = {
  type: Type.OBJECT,
  properties: {
    score: { type: Type.NUMBER },
    is_correct: { type: Type.BOOLEAN },
    feedback_vi: { type: Type.STRING },
    detected_speech: { type: Type.STRING },
  },
  required: ["score", "is_correct", "feedback_vi", "detected_speech"],
};

export const lookupWord = async (input: string): Promise<WordData> => {
  const normalized = input.trim().toLowerCase();
  if (wordCache.has(normalized)) return wordCache.get(normalized)!;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: `Input: "${normalized}"`,
    config: {
      systemInstruction: `You are an ultra-fast bilingual English-Vietnamese dictionary. 
      RULES:
      1. Detect input language automatically.
      2. If Vietnamese, translate to the most common English word first, then analyze that English word.
      3. Provide a simple English definition (definition_en) that is easy to understand.
      4. Output MUST be valid JSON matching the schema.
      5. PRIORITY: Speed and precision. No chatty text.`,
      responseMimeType: "application/json",
      responseSchema: wordSchema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  
  const result = JSON.parse(response.text) as WordData;
  wordCache.set(normalized, result);
  return result;
};

export const lookupSentence = async (input: string): Promise<SentenceData> => {
  const normalized = input.trim();
  if (sentenceCache.has(normalized)) return sentenceCache.get(normalized)!;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview", 
    contents: `Sentence/Phrase: "${normalized}"`,
    config: {
      systemInstruction: `Analyze English/Vietnamese sentence. 
      If Vietnamese, translate to natural English first. 
      Provide grammar and context in JSON (Vietnamese descriptions). 
      Extreme speed required.`,
      responseMimeType: "application/json",
      responseSchema: sentenceSchema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    },
  });
  
  const result = JSON.parse(response.text) as SentenceData;
  sentenceCache.set(normalized, result);
  return result;
};

export const checkPronunciation = async (target: string, base64Audio: string, mimeType: string): Promise<PronunciationFeedback> => {
  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: {
      parts: [
        { inlineData: { data: base64Audio, mimeType: mimeType } },
        { text: `Check pronunciation for English: "${target}"` }
      ]
    },
    config: {
      systemInstruction: "Pronunciation coach. Be brief. JSON output. High speed.",
      responseMimeType: "application/json",
      responseSchema: pronunciationSchema,
      temperature: 0,
      thinkingConfig: { thinkingBudget: 0 },
    }
  });
  return JSON.parse(response.text) as PronunciationFeedback;
};
