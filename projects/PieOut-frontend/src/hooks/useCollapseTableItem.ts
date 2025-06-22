//src/hooks/useCollapseTableItem.ts
import { useEffect } from 'react'

type UseCollapseTableItemProps = {
  // An array of refs to DOM elements (table <li> items)
  // The hook will monitor these elements to determine if a click occurred outside them
  refs: React.RefObject<HTMLElement>[]

  // A set of conditions that determine whether the collapse logic should be active
  // Example: visibility states like [viewingPlayers, viewingAdminActions...]
  conditions: boolean[]

  // A function to be called when a click outside the refs is detected and conditions are met
  // This will collapse a UI element (dropdown, table row)
  collapse: () => void
}
// Custom hook to collapse a table item when the user clicks outside of the referenced elements
export function useCollapseTableItem({ refs, conditions, collapse }: UseCollapseTableItemProps) {
  // Listen useEffet
  useEffect(() => {
    // Return from function early if none of the conditions are true
    if (!conditions.some(Boolean)) return

    // Handler to detect mouse clicks outside all referenced elements
    const handleDetectMouseClickOutside = (event: MouseEvent) => {
      const isClickOutside = refs.every((ref) => !ref.current || !ref.current.contains(event.target as Node))

      // If the click is outside all refs, trigger the collapse callback
      if (isClickOutside) {
        collapse()
      }
    }
    // Add event listener for mouse clicks anywhere on the document

    document.addEventListener('mousedown', handleDetectMouseClickOutside)
    // Cleanup the event listener when conditions change or on unmount

    return () => {
      document.removeEventListener('mousedown', handleDetectMouseClickOutside)
    }
    // Dependency array: rerun effect when refs or conditions change
  }, [refs.map((r) => r.current), conditions.join(''), collapse])
}
