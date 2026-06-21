export type AppMode = 'text' | 'timer';
export type ThemeName = 'midnight' | 'stage' | 'paper' | 'rose' | 'blush' | 'sepia' | 'purple' | 'green' | 'ocean' | 'signal';
export type SoundPack = 'beep' | 'bell' | 'horn' | 'chime';

export interface SavedDisplay {
  id: string;
  name: string;
  text: string;
  theme: ThemeName;
  textColor: string;
  bgColor: string;
  textScale: number;
  customColors: boolean;
}

export interface AppSettings {
  mode: AppMode;
  theme: ThemeName;
  text: string;
  textColor: string;
  bgColor: string;
  customColors: boolean;
  textScale: number;
  timerMinutes: number;
  timerSeconds: number;
  timerLabel: string;
  timerSound: boolean;
  soundPack: SoundPack;
  roomId: string;
  logoDataUrl: string;
  savedDisplays: SavedDisplay[];
  onboardingDone: boolean;
  licenseKey: string;
  pro: boolean;
}

export interface RoomState {
  settings: Partial<AppSettings>;
  timerRunning?: boolean;
  timerRemainingMs?: number;
}