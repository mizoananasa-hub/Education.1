const PREFIX = "learnova_settings_";

function get<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(PREFIX + key);
    if (raw === null) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function set<T>(key: string, value: T): void {
  localStorage.setItem(PREFIX + key, JSON.stringify(value));
}

export interface AppSettings {
  compactMode: boolean;
  notifyFileUpload: boolean;
  notifyRating: boolean;
  notifyAISummary: boolean;
  autoSaveNotes: boolean;
  flashcardStyle: "classic" | "minimal" | "colorful";
  ratingConfirmation: boolean;
  tableDensity: "comfortable" | "compact";
  displayNameOverride: string | null;
}

export function loadSettings(): AppSettings {
  return {
    compactMode: get("compactMode", false),
    notifyFileUpload: get("notifyFileUpload", true),
    notifyRating: get("notifyRating", true),
    notifyAISummary: get("notifyAISummary", true),
    autoSaveNotes: get("autoSaveNotes", true),
    flashcardStyle: get("flashcardStyle", "classic"),
    ratingConfirmation: get("ratingConfirmation", true),
    tableDensity: get("tableDensity", "comfortable"),
    displayNameOverride: get("displayNameOverride", null),
  };
}

export function saveSetting<K extends keyof AppSettings>(key: K, value: AppSettings[K]): void {
  set(key, value);
}
