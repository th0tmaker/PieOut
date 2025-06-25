import { useCallback, useEffect, useMemo } from 'react'

type UseCollapseTableItemProps = {
  refs: React.RefObject<HTMLElement>[]
  conditions: boolean[]
  collapse: () => void
  listenEscape?: boolean
}

export function useCollapseTableItem2({ refs, conditions, collapse, listenEscape = false }: UseCollapseTableItemProps) {
  // Memoize the boolean check to avoid recalculating on every render
  const shouldListen = useMemo(() => conditions.some(Boolean), [conditions])

  const handleClickOutside = useCallback(
    (event: MouseEvent) => {
      // Early return if no valid refs
      if (refs.length === 0) return

      const target = event.target as Node
      const clickedOutside = refs.every((ref) => !ref.current?.contains(target))

      if (clickedOutside) {
        collapse()
      }
    },
    [refs, collapse],
  )

  const handleEscape = useCallback(
    (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        collapse()
      }
    },
    [collapse],
  )

  useEffect(() => {
    if (!shouldListen) return

    const controller = new AbortController()
    const options = { signal: controller.signal }

    document.addEventListener('mousedown', handleClickOutside, options)
    if (listenEscape) {
      document.addEventListener('keydown', handleEscape, options)
    }

    return () => controller.abort()
  }, [shouldListen, handleClickOutside, handleEscape, listenEscape])
}
