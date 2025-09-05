import { useAppCtx } from '../hooks/useAppCtx'
import { useMethodLoadingCtx } from './useMethodLoadingCtx'
import { useCallback } from 'react'
import type { MethodNames, MethodHandlerProps } from '../types/MethodHandler'

export const useMethodHandler = () => {
  const { appMethodHandler } = useAppCtx()
  const { isMethodLoading, setMethodLoading } = useMethodLoadingCtx()

  const handle = useCallback(
    async (methodName: MethodNames, dynamicProps?: Partial<MethodHandlerProps>) => {
      if (!appMethodHandler) throw new Error('App method handler not ready')
      if (isMethodLoading) return

      setMethodLoading(true)
      try {
        return await appMethodHandler.handle(methodName, dynamicProps)
      } finally {
        setMethodLoading(false)
      }
    },
    [appMethodHandler, isMethodLoading],
  )

  return { handle, isMethodLoading }
}
