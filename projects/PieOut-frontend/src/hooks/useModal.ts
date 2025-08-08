import { useState, useCallback } from 'react'
import { ModalTypes } from '../types/ModalStateProps'

// Define a custom hook to manage modal states (open, close, toggle)
export function useModal() {
  // Initialize all modals as closed (false)
  const [modal, setModal] = useState<ModalTypes>({
    wallet: false,
    profile: false,
    profileBlurb: false,
    unregister: false,
    game: false,
    gameBlurb: false,
    honors: false,
    honorsBlurb: false,
    activePlayers: false,
    leaderboard: false,
  })

  // Define a method that sets the boolean value to false explicitly for any key inside the ModalState type
  const close = useCallback((modalName: keyof ModalTypes) => {
    setModal((prev) => ({
      ...prev,
      [modalName]: false,
    }))
  }, [])

  // Define a method that sets the boolean value to true explicitly for any key inside the ModalState type
  const open = useCallback((modalName: keyof ModalTypes) => {
    setModal((prev) => ({
      ...prev,
      [modalName]: true,
    }))
  }, [])

  // Define a toggle method that flips between the two boolean values for any key inside the ModalState type
  const toggle = useCallback((modalName: keyof ModalTypes) => {
    setModal((prev) => ({
      ...prev,
      [modalName]: !prev[modalName],
    }))
  }, [])

  // Define a callback method that returns an object with openModal (boolean) and closeModal (function) props
  const getProps = useCallback(
    (modalName: keyof ModalTypes) => ({
      openModal: modal[modalName],
      closeModal: () => close(modalName),
    }),
    [modal, close],
  )

  // Return all the utilities for managing modals
  return {
    modal, // The complete modal state object
    toggleModal: toggle, // Function to toggle any modal
    openModal: open, // Function to open any modal
    closeModal: close, // Function to close any modal
    getModalProps: getProps, // Helper that matches any modal interface
  }
}
