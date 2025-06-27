import { useCallback, useEffect, useMemo } from 'react'

type UseDropdownEventListenerProps = {
  dropdownListRefs: React.RefObject<HTMLElement>[]
  dropdownBtnRefs: React.RefObject<HTMLElement>[]
  isOpen: boolean | boolean[]
  onClose: () => void
  listenEscape?: boolean
}

export function useDropdownEventListener({
  dropdownListRefs,
  dropdownBtnRefs,
  isOpen,
  onClose,
  listenEscape = true,
}: UseDropdownEventListenerProps) {
  // Handle both single boolean and array of booleans
  const shouldListen = useMemo(() => {
    return Array.isArray(isOpen) ? isOpen.some(Boolean) : isOpen
  }, [isOpen])

  const handleClickOutsideDropdown = useCallback(
    (event: MouseEvent) => {
      if (!shouldListen || dropdownListRefs.length === 0) return

      const target = event.target as Node

      // Check if click was outside all dropdown and button refs
      const clickedOutside = [...dropdownListRefs, ...dropdownBtnRefs].every((ref) => !ref.current?.contains(target))

      if (clickedOutside) {
        onClose()
      }
    },
    [dropdownListRefs, dropdownBtnRefs, onClose, shouldListen],
  )

  const handlEscKeyPress = useCallback(
    (event: KeyboardEvent) => {
      if (shouldListen && event.key === 'Escape') {
        onClose()
      }
    },
    [onClose, shouldListen],
  )

  useEffect(() => {
    if (!shouldListen) return

    const controller = new AbortController()
    const options = { signal: controller.signal, passive: true }

    document.addEventListener('mousedown', handleClickOutsideDropdown, options)

    if (listenEscape) {
      document.addEventListener('keydown', handlEscKeyPress, options)
    }

    return () => controller.abort()
  }, [shouldListen, handleClickOutsideDropdown, handlEscKeyPress, listenEscape])
}
