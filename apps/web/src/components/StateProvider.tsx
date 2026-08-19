"use client";

import {
  createContext,
  type ReactNode,
  useContext,
  useMemo,
  useState,
} from "react";
import {
  ALL_INDIA_ISO,
  ALL_INDIA_STATES_UTS_DATA,
  ALL_INDIA_SUMMARY,
  getStateByIsoCode,
  type StateSummary,
} from "@/lib/states";

interface StateContextValue {
  selectedStateIso: string;
  selectedState: StateSummary;
  setSelectedStateIso: (isoCode: string) => void;
}

const StateContext = createContext<StateContextValue | null>(null);

const STORAGE_KEY = "viksit_selected_state_iso";

function getInitialStateIso(): string {
  if (typeof window === "undefined") return ALL_INDIA_ISO;
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved && getStateByIsoCode(saved)) {
      return saved;
    }
  } catch {
    // Ignore localStorage errors
  }
  return ALL_INDIA_ISO;
}

export function StateProvider({ children }: { children: ReactNode }) {
  const [selectedStateIso, setSelectedStateIsoState] =
    useState<string>(getInitialStateIso);

  const setSelectedStateIso = (isoCode: string) => {
    setSelectedStateIsoState(isoCode);
    try {
      localStorage.setItem(STORAGE_KEY, isoCode);
    } catch {
      // Ignore localStorage errors
    }
  };

  const selectedState = useMemo(() => {
    return getStateByIsoCode(selectedStateIso) || ALL_INDIA_SUMMARY;
  }, [selectedStateIso]);

  return (
    <StateContext.Provider
      value={{ selectedStateIso, selectedState, setSelectedStateIso }}
    >
      {children}
    </StateContext.Provider>
  );
}

export function useSelectedState(): StateContextValue {
  const value = useContext(StateContext);
  if (!value) {
    // Fallback for isolated component testing
    return {
      selectedStateIso: "IN-AP",
      selectedState: ALL_INDIA_STATES_UTS_DATA[0],
      setSelectedStateIso: () => {},
    };
  }
  return value;
}
