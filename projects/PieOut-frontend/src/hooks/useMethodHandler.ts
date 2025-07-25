import { useAppCtx } from '../hooks/useAppCtx'
import { useState, useCallback } from 'react'
import type { MethodNames, MethodHandlerProps } from '../types/MethodHandler'

export const useMethodHandler = () => {
  const { appMethodHandler } = useAppCtx()
  const [isLoading, setIsLoading] = useState(false)

  const handle = useCallback(
    async (methodName: MethodNames, dynamicProps?: Partial<MethodHandlerProps>) => {
      if (!appMethodHandler) throw new Error('App method handler not ready')
      if (isLoading) return

      setIsLoading(true)
      try {
        return await appMethodHandler.handle(methodName, dynamicProps)
      } finally {
        setIsLoading(false)
      }
    },
    [appMethodHandler, isLoading],
  )

  return { handle, isLoading }
}
