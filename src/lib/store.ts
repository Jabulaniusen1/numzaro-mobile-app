import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import AsyncStorage from '@react-native-async-storage/async-storage';

interface AppStore {
  userId: string | null;
  setUserId: (id: string | null) => void;
  currencyMode: 'USD' | 'NGN';
  setCurrencyMode: (mode: 'USD' | 'NGN') => void;
  darkMode: boolean;
  setDarkMode: (v: boolean) => void;
}

export const useAppStore = create<AppStore>()(
  persist(
    (set) => ({
      userId: null,
      setUserId: (id) => set({ userId: id }),
      currencyMode: 'NGN',
      setCurrencyMode: (mode) => set({ currencyMode: mode }),
      darkMode: false,
      setDarkMode: (v) => set({ darkMode: v }),
    }),
    {
      name: 'numzaro-store',
      storage: createJSONStorage(() => AsyncStorage),
      partialize: (state) => ({
        darkMode: state.darkMode,
        currencyMode: state.currencyMode,
      }),
    }
  )
);
