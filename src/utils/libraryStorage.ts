import { LessonPlanDocument } from '../types';

const LIBRARY_STORAGE_KEY = 'khbd_bilingual_library_v2';
const HISTORY_STORAGE_KEY = 'khbd_bilingual_history_v2';

export function getSavedLibrary(): LessonPlanDocument[] {
  try {
    const raw = localStorage.getItem(LIBRARY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading library from LocalStorage:', e);
    return [];
  }
}

export function saveToLibrary(doc: LessonPlanDocument): LessonPlanDocument[] {
  try {
    const library = getSavedLibrary();
    const existingIndex = library.findIndex((item) => item.id === doc.id);
    const updatedDoc = {
      ...doc,
      updatedAt: new Date().toISOString(),
    };

    let newLibrary: LessonPlanDocument[];
    if (existingIndex >= 0) {
      newLibrary = [...library];
      newLibrary[existingIndex] = updatedDoc;
    } else {
      newLibrary = [updatedDoc, ...library];
    }

    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(newLibrary));
    return newLibrary;
  } catch (e) {
    console.error('Error saving to library:', e);
    return getSavedLibrary();
  }
}

export function deleteFromLibrary(docId: string): LessonPlanDocument[] {
  try {
    const library = getSavedLibrary();
    const newLibrary = library.filter((item) => item.id !== docId);
    localStorage.setItem(LIBRARY_STORAGE_KEY, JSON.stringify(newLibrary));
    return newLibrary;
  } catch (e) {
    console.error('Error deleting from library:', e);
    return getSavedLibrary();
  }
}

export function getSavedHistory(): LessonPlanDocument[] {
  try {
    const raw = localStorage.getItem(HISTORY_STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw);
  } catch (e) {
    console.error('Error reading history:', e);
    return [];
  }
}

export function addToHistory(doc: LessonPlanDocument): LessonPlanDocument[] {
  try {
    const history = getSavedHistory();
    // Keep max 20 history items
    const filtered = history.filter((item) => item.id !== doc.id);
    const newHistory = [{ ...doc, updatedAt: new Date().toISOString() }, ...filtered].slice(0, 20);
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(newHistory));
    return newHistory;
  } catch (e) {
    console.error('Error adding to history:', e);
    return getSavedHistory();
  }
}
