// src/interfaces/modal.ts

// Base interface for all modals used in the application
export interface ModalInterface {
  openModal: boolean
  closeModal: () => void
}
