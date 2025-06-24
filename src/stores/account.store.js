import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

const useAccountStore = create(
  persist(
    (set) => ({
      account: null,
      setAccount: (account) => set({ account }),
      clearAccount: () => set({ account: null }),
    }),
    {
      name: "account-storage",
      storage: createJSONStorage(() => localStorage),
    }
  )
);

export default useAccountStore;
