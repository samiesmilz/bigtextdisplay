import type { AppSettings, SavedDisplay } from './types';
import { verifyLicense } from './api';

const LICENSE_KEY = 'btd-license';

export function getStoredLicense(): string {
  return localStorage.getItem(LICENSE_KEY) || '';
}

export function storeLicense(key: string) {
  localStorage.setItem(LICENSE_KEY, key);
}

export async function checkPro(licenseKey?: string): Promise<boolean> {
  const key = licenseKey || getStoredLicense();
  if (!key) return false;
  try {
    const result = await verifyLicense(key);
    if (result.valid) {
      storeLicense(key);
      return true;
    }
  } catch { /* offline */ }
  if (import.meta.env.DEV && key === 'BTD-DEV-PRO') return true;
  return false;
}

export function saveDisplay(settings: AppSettings, name: string): SavedDisplay[] {
  const item: SavedDisplay = {
    id: crypto.randomUUID(),
    name,
    text: settings.text,
    theme: settings.theme,
    textColor: settings.textColor,
    bgColor: settings.bgColor,
    textScale: settings.textScale,
    customColors: settings.customColors,
  };
  const list = [...(settings.savedDisplays || []), item].slice(-20);
  return list;
}

export function applySavedDisplay(saved: SavedDisplay): Partial<AppSettings> {
  return {
    text: saved.text,
    theme: saved.theme,
    textColor: saved.textColor,
    bgColor: saved.bgColor,
    textScale: saved.textScale,
    customColors: saved.customColors,
  };
}