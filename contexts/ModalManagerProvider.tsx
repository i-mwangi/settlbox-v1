"use client";

import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { BaseModalProps, ModalProps, ModalPropsMap } from "@/types/modal";

export type ModalProp<T extends ModalProps> = T & { isOpen: boolean };

type ModalInput<T> = Omit<T, keyof BaseModalProps>;
interface ModalContextType {
  openModal<K extends keyof ModalPropsMap>(modalId: K, props?: ModalInput<ModalPropsMap[K]>, closeAll?: boolean): void;
  openModal<T extends BaseModalProps>(modalId: string, props?: ModalInput<T>, closeAll?: boolean): void;
  closeModal: (modalId: string) => void;
  closeAllModals: () => void;
  isModalOpen: (modalId: string) => boolean;
  getModalProps: (modalId: string) => object | undefined;
  getModalZIndex: (modalId: string) => number;
}

interface OpenModal {
  props: object;
  order: number;
}

const ModalContext = createContext<ModalContextType | null>(null);

export function ModalProvider({ children }: { children: ReactNode }) {
  const [openModals, setOpenModals] = useState<Record<string, OpenModal>>({});
  const openModal = useCallback((modalId: string, props: object = {}, closeAll = false) => {
    setOpenModals(previous => {
      const order = Math.max(0, ...Object.values(previous).map(modal => modal.order)) + 1;
      return { ...(closeAll ? {} : previous), [modalId]: { props, order } };
    });
  }, []);
  const closeModal = useCallback((modalId: string) => {
    setOpenModals(previous => {
      const next = { ...previous };
      delete next[modalId];
      return next;
    });
  }, []);
  const closeAllModals = useCallback(() => setOpenModals({}), []);
  const isModalOpen = useCallback((modalId: string) => Boolean(openModals[modalId]), [openModals]);
  const getModalProps = useCallback((modalId: string) => openModals[modalId]?.props, [openModals]);
  const getModalZIndex = useCallback((modalId: string) => {
    const ordered = Object.keys(openModals).sort((left, right) => openModals[left].order - openModals[right].order);
    return 100 + Math.max(0, ordered.indexOf(modalId)) * 10;
  }, [openModals]);
  const value = useMemo(() => ({ openModal, closeModal, closeAllModals, isModalOpen, getModalProps, getModalZIndex }),
    [openModal, closeModal, closeAllModals, isModalOpen, getModalProps, getModalZIndex]);
  return <ModalContext.Provider value={value}>{children}</ModalContext.Provider>;
}

export function useModal() {
  const context = useContext(ModalContext);
  if (!context) throw new Error("Modal provider is required");
  return context;
}
