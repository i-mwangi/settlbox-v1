"use client";

import { createContext, useContext, useState, useCallback, useMemo, ReactNode } from "react";

interface TitleContextType {
  title: string | ReactNode;
  showBackArrow: boolean;
  setTitle: (title: string | ReactNode) => void;
  setShowBackArrow: (show: boolean) => void;
  onBackClick?: () => void;
  setOnBackClick: (callback: (() => void) | undefined) => void;
  resetTitle: () => void;
}

const TitleContext = createContext<TitleContextType | undefined>(undefined);

export const TitleProvider = ({ children }: { children: ReactNode }) => {
  const [title, setTitle] = useState<string | ReactNode>("Welcome to Settlbox");
  const [showBackArrow, setShowBackArrow] = useState<boolean>(false);
  const [onBackClick, setOnBackClick] = useState<(() => void) | undefined>(undefined);

  const resetTitle = useCallback(() => {
    setTitle("Welcome to Settlbox");
    setShowBackArrow(false);
    setOnBackClick(undefined);
  }, []);

  const value = useMemo(
    () => ({
      title,
      showBackArrow,
      setTitle,
      setShowBackArrow,
      onBackClick,
      setOnBackClick,
      resetTitle,
    }),
    [title, showBackArrow, onBackClick, resetTitle],
  );

  return (
    <TitleContext.Provider value={value}>
      {children}
    </TitleContext.Provider>
  );
};

const NOOP_TITLE: TitleContextType = {
  title: "",
  showBackArrow: false,
  setTitle: () => {},
  setShowBackArrow: () => {},
  onBackClick: undefined,
  setOnBackClick: () => {},
  resetTitle: () => {},
};

export const useTitle = () => {
  const context = useContext(TitleContext);
  // When rendered outside a TitleProvider (e.g. inside a modal), fall back to a no-op
  // so consumers that can appear both in-page and in-modal don't crash.
  return context ?? NOOP_TITLE;
};
