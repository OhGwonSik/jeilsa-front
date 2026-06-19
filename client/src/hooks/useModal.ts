import { useState } from "react";

type ModalMode = "create" | "edit" | null;

export function useModal<T>(defaultData: T) {
    const [modalMode, setModalMode] = useState<ModalMode>(null);
    const [modalData, setModalData] = useState<T>(defaultData);
    const modalOpen = modalMode !== null;

    const openModal = (mode: Exclude<ModalMode, null>, data?: Partial<T>) => {
        if (mode === "edit" && data) {
            setModalData(prev => ({ ...prev, ...data }));
        } else {
            setModalData(defaultData);
        }
        setModalMode(mode);
    };

    const closeModal = () => {
        setModalMode(null);
    };

    const handleModalCancel = () => {
        closeModal();
    };

    return {
        modalMode,
        modalOpen,
        modalData,
        setModalData,
        openModal,
        closeModal,
        handleModalCancel
    };
}
