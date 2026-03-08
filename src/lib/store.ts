import { create } from 'zustand';

interface AppStore {
  userId: string | null;
  setUserId: (id: string | null) => void;
  currencyMode: 'USD' | 'NGN';
  setCurrencyMode: (mode: 'USD' | 'NGN') => void;
}

export const useAppStore = create<AppStore>((set) => ({
  userId: null,
  setUserId: (id) => set({ userId: id }),
  currencyMode: 'NGN',
  setCurrencyMode: (mode) => set({ currencyMode: mode }),
}));
