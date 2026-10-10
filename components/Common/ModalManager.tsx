"use client";

import { useModal } from "@/contexts/ModalManagerProvider";
import { ModalId, modalRegistry } from "@/types/modal";

export const ModalManager = () => {
  const { isModalOpen, closeModal, getModalProps, getModalZIndex } = useModal();

  return (
    <>
      {Object.entries(modalRegistry).map(([id, Component]) => {
        const modalId = id as ModalId;
        const isOpen = isModalOpen(modalId);
        if (!isOpen) return null;
        const modalProps = getModalProps(modalId) || {};
        const zIndex = getModalZIndex(modalId);

        const ModalComponent = Component as any;

        return (
          <ModalComponent
            key={id}
            isOpen={isOpen}
            onClose={() => closeModal(modalId)}
            zIndex={zIndex}
            {...modalProps}
          />
        );
      })}
    </>
  );
};
