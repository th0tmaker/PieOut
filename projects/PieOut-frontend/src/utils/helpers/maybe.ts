import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

export const maybe = async <T>(promise: Promise<T>): Promise<T | undefined> => {
  try {
    return await promise
  } catch (err) {
    // consoleLogger.warn(`maybe(): Failed to await promise due to error: ${err}`)
    return undefined
  }
}
