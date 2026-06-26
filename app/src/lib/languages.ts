/**
 * Languages offered for the LLM-written notes. This is the language of the
 * curated note (its headings and prose) — NOT the transcription language, which
 * follows the audio (Whisper). `native` is the UI label; `english` is the name
 * handed to Claude in the prompt. The YAML frontmatter keys stay English.
 */
export interface NoteLang {
  code: string;
  native: string;
  english: string;
}

export const NOTE_LANGS: NoteLang[] = [
  { code: "en", native: "English", english: "English" },
  { code: "pt", native: "Português (BR)", english: "Brazilian Portuguese" },
  { code: "es", native: "Español", english: "Spanish" },
  { code: "fr", native: "Français", english: "French" },
  { code: "de", native: "Deutsch", english: "German" },
  { code: "it", native: "Italiano", english: "Italian" },
  { code: "ja", native: "日本語", english: "Japanese" },
  { code: "zh", native: "中文", english: "Simplified Chinese" },
];

export const DEFAULT_NOTE_LANG = "en";

export const NOTE_LANG_CODES = NOTE_LANGS.map((l) => l.code);

/** Human name used in the Claude prompt (falls back to English). */
export function noteLangEnglish(code: string): string {
  return NOTE_LANGS.find((l) => l.code === code)?.english ?? "English";
}

/** UI label (native name) for a code. */
export function noteLangNative(code: string): string {
  return NOTE_LANGS.find((l) => l.code === code)?.native ?? code;
}
