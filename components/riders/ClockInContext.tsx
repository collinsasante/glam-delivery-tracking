"use client";

import { createContext, useContext, useState } from "react";

const ClockInContext = createContext<{
  isClockedIn: boolean;
  setIsClockedIn: (v: boolean) => void;
}>({ isClockedIn: false, setIsClockedIn: () => {} });

export function ClockInProvider({
  children,
  initialClockedIn,
}: {
  children: React.ReactNode;
  initialClockedIn: boolean;
}) {
  const [isClockedIn, setIsClockedIn] = useState(initialClockedIn);
  return (
    <ClockInContext.Provider value={{ isClockedIn, setIsClockedIn }}>
      {children}
    </ClockInContext.Provider>
  );
}

export function useClockIn() {
  return useContext(ClockInContext);
}
