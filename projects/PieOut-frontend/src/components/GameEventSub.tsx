//src/components/GameEventSub.tsx
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { AnimatePresence, motion } from 'framer-motion'
import React, { useCallback, useEffect, useState } from 'react'
import { AppBaseBtn } from '../buttons/AppBaseBtn'
import { useAppSubscriberCtx } from '../hooks/useAppSubscriberCtx'
import { useGameIdCtx } from '../hooks/useGameIdCtx'
import { ellipseAddress } from '../utils/ellipseAddress'

// Define the animation variants for the game event subscriber
const itemVariants = {
  initial: {
    opacity: 0,
    y: -12,
    scale: 0.9,
  },
  animate: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 1, // 1 second fade-in
      ease: 'easeOut' as const,
    },
  },
  exit: {
    opacity: 0,
    y: 12,
    scale: 0.9,
    transition: {
      duration: 1, // 1 second fade-out
      ease: 'easeIn' as const,
    },
  },
  fadingOut: {
    opacity: 0,
    y: 12,
    scale: 0.9,
    transition: {
      duration: 1, // 1 second fade-out
      ease: 'easeInOut' as const,
    },
  },
}

const GameEventSub: React.FC = React.memo(() => {
  // Hooks
  const { gameId } = useGameIdCtx()
  const {
    currentEvent: subCurrentEvent,
    clearCurrentAndShowNext: subClearCurrentAndShowNext,
    fadingOutTxnId: subFadingOutTxnId,
    queueLength: subQueueLength,
    start: subStart,
    stop: subStop,
    pollOnce: subPollOnce,
    isRunning: subIsRunning,
  } = useAppSubscriberCtx()

  // States
  const [isPolling, setIsPolling] = useState(false)
  const [pollStatus, setPollStatus] = useState<string | null>(null)
  const [gameIdFilterEnabled, setGameIdFilterEnabled] = useState(false)

  // Boolean conditions
  const isFadingOut = subCurrentEvent && subFadingOutTxnId === subCurrentEvent.txnId

  // Effects
  // Automatically clear poll status message from screen after a delay
  useEffect(() => {
    // If poll status is missing, return early
    if (!pollStatus) return

    // Define timer reference for delayed clearing
    let timer: ReturnType<typeof setTimeout> | null = null

    // If there is no current event, schedule poll status reset
    if (!subCurrentEvent) {
      timer = setTimeout(() => setPollStatus(null), 5000) // Clear after 5 seconds
    }

    // Clear the timer if effect re-runs or component unmounts
    return () => {
      if (timer) clearTimeout(timer)
    }
  }, [subCurrentEvent, pollStatus])

  // Callbacks
  // Callback to determine whether the current event should be shown based on filters
  const shouldShowEvent = useCallback(() => {
    if (!subCurrentEvent) return false
    if (!gameIdFilterEnabled) return true
    if (!gameId) return true

    const eventGameId = String(subCurrentEvent.args.game_id)
    const currentGameId = String(gameId)
    return eventGameId === currentGameId
  }, [subCurrentEvent, gameIdFilterEnabled, gameId])

  // Handlers
  // Callback to toggle the game ID filter on/off
  const handleGameIdFilterToggle = useCallback(() => {
    const newState = !gameIdFilterEnabled
    setGameIdFilterEnabled(newState)
    // consoleLogger.info(`Game ID filter ${newState ? 'enabled' : 'disabled'} for gameId: ${gameId}`)
  }, [gameIdFilterEnabled, gameId])

  // Callback to start the subscriber
  const handleStart = useCallback(() => {
    // consoleLogger.info('User clicked Start - starting subscriber')
    subStart()
  }, [subStart])

  // Callback to stop the subscriber
  const handleStop = useCallback(() => {
    // consoleLogger.info('User clicked Stop - stopping subscriber')
    subStop()
  }, [subStop])

  // Callback to perform a single poll request, ensuring no concurrent polling
  const handlePollOnce = useCallback(async () => {
    // If subscriber is already polling, return early
    if (isPolling) return
    setIsPolling(true)

    try {
      await subPollOnce()
      setPollStatus('Poll request successful')
    } catch (error) {
      setPollStatus('Poll request failed')
    } finally {
      setIsPolling(false)
    }
  }, [isPolling, subPollOnce])

  // Callback to manually skip the current event and show the next one
  const handleSkipClick = useCallback(() => {
    if (!subCurrentEvent) return
    // consoleLogger.info(`User manually skipped event with txnId: ${subCurrentEvent.txnId}`)
    subClearCurrentAndShowNext()
  }, [subCurrentEvent, subClearCurrentAndShowNext])

  // Callback to copy the current event JSON to clipboard, converting timestamp to seconds
  const handleCopy = useCallback(() => {
    if (!subCurrentEvent) return

    const eventToCopy = {
      ...subCurrentEvent,
      timestamp: Math.floor(subCurrentEvent.timestamp / 1000), // ms -> seconds
    }

    // Inline safe stringify to handle BigInt
    const payload = JSON.stringify(eventToCopy, (_, value) => (typeof value === 'bigint' ? value.toString() : value), 2)

    navigator.clipboard
      .writeText(payload)
      .then(() => {
        // consoleLogger.info('Event copied to clipboard (timestamp in seconds)')
      })
      .catch((err) => {
        consoleLogger.error('Failed to copy event JSON:', err)
      })
  }, [subCurrentEvent])

  return (
    <div className="relative space-y-4">
      {/* Control buttons */}
      <div className="flex flex-wrap gap-2 mb-3">
        <AppBaseBtn variant="regular" textSize="xs" disabled={subIsRunning} onClick={handleStart}>
          Start
        </AppBaseBtn>
        <AppBaseBtn variant="regular" textSize="xs" disabled={!subIsRunning} onClick={handleStop}>
          Stop
        </AppBaseBtn>
        <AppBaseBtn variant="regular" textSize="xs" disabled={subIsRunning || isPolling} onClick={handlePollOnce}>
          Poll
        </AppBaseBtn>
        <AppBaseBtn variant="regular" textSize="xs" disabled={!gameId} onClick={handleGameIdFilterToggle}>
          {gameIdFilterEnabled ? 'Unfilter' : 'Filter'}
        </AppBaseBtn>
      </div>

      {/* Status indicators */}
      <div className="flex flex-wrap items-center gap-2 mb-3 text-xs font-medium">
        {subIsRunning && (
          <span className="px-2 py-0.5 rounded-full bg-green-900/40 text-green-400 border border-green-600">🟢 Running</span>
        )}
        {pollStatus && <span className="px-2 py-0.5 rounded-full bg-cyan-900/40 text-cyan-300 border border-cyan-600">{pollStatus}</span>}
        {subQueueLength > 0 && (
          <span className="px-2 py-0.5 rounded-full bg-indigo-900/40 text-indigo-300 border border-indigo-600">
            {subQueueLength} Event{subQueueLength === 1 ? '' : 's'} in Queue
          </span>
        )}
      </div>

      {!subCurrentEvent && <div className="text-left text-sm text-slate-400 bg-slate-800 rounded mb-2">No events to display.</div>}

      {/* Event display */}
      <div>
        {subCurrentEvent && shouldShowEvent() && (
          <div className="max-h-60 w-fit space-y-2">
            <AnimatePresence mode="wait">
              <motion.div
                key={`${subCurrentEvent.txnId}-${subCurrentEvent.timestamp}`}
                variants={itemVariants}
                initial="initial"
                animate={isFadingOut ? 'fadingOut' : 'animate'}
                exit="exit"
                className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 shadow-lg w-fit space-y-1 font-mono text-xs"
              >
                {/* Row 1: Event name + buttons */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2 font-mono text-xs">
                    {subCurrentEvent.name === 'game_live' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                        <span className="text-green-400 font-semibold">Game Live</span>
                      </div>
                    )}
                    {subCurrentEvent.name === 'player_score' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                        <span className="text-yellow-400 font-semibold">Player Score</span>
                      </div>
                    )}
                    {subCurrentEvent.name === 'game_over' && (
                      <div className="flex items-center gap-1">
                        <div className="w-2 h-2 bg-red-400 rounded-full"></div>
                        <span className="text-red-400 font-semibold">Game Over</span>
                      </div>
                    )}
                  </div>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={handleCopy}
                      className="text-blue-400 hover:text-blue-300 px-1 py-0.5 rounded hover:bg-slate-600 transition-colors"
                      title="Copy event as JSON"
                    >
                      📋
                    </button>
                    <button
                      onClick={handleSkipClick}
                      className="text-orange-400 hover:text-orange-300 px-1 py-0.5 rounded hover:bg-slate-600 transition-colors"
                      title="Skip to next event"
                    >
                      ⏭️
                    </button>
                  </div>
                </div>

                {/* Row 2: timestamp • txnId (removed eventId) */}
                <div className="text-slate-300">
                  {new Date(subCurrentEvent.timestamp).toLocaleTimeString()} • Txn ID:{' '}
                  <span>{ellipseAddress(subCurrentEvent.txnId, 6)}</span>
                </div>

                {/* Row 3: gameId + args */}
                <div className="text-indigo-200">
                  Game ID: {String(subCurrentEvent.args.game_id)}
                  {subCurrentEvent.name === 'game_live' && (
                    <>
                      {' '}
                      • Phase: {subCurrentEvent.args.staking_finalized ? 'Live' : 'Queue'}, Ends:{' '}
                      {new Date(Number(subCurrentEvent.args.expiry_ts) * 1000).toLocaleTimeString()}
                    </>
                  )}
                  {subCurrentEvent.name === 'player_score' && (
                    <>
                      {' '}
                      • Score: {String(subCurrentEvent.args.score)}pts, Player: {ellipseAddress(String(subCurrentEvent.args.player), 6)}
                    </>
                  )}
                  {subCurrentEvent.name === 'game_over' && (
                    <div className="space-y-0.5">
                      <div className="text-yellow-300">
                        1st Score: {String(subCurrentEvent.args.first_place_score)} • Player:{' '}
                        {ellipseAddress(String(subCurrentEvent.args.first_place_address), 6)}
                      </div>
                      <div className="text-gray-300">
                        2nd Score: {String(subCurrentEvent.args.second_place_score)} • Player:{' '}
                        {ellipseAddress(String(subCurrentEvent.args.second_place_address), 6)}
                      </div>
                      <div className="text-orange-300">
                        3rd Score: {String(subCurrentEvent.args.third_place_score)} • Player:{' '}
                        {ellipseAddress(String(subCurrentEvent.args.third_place_address), 6)}
                      </div>
                    </div>
                  )}
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        )}
        {subCurrentEvent && !shouldShowEvent() && (
          <div className="text-left text-sm text-slate-400 p-2 bg-slate-800 rounded">
            Event filtered out (Game ID: {String(subCurrentEvent.args.game_id)} ≠ {String(gameId)})
          </div>
        )}
      </div>
    </div>
  )
})

GameEventSub.displayName = 'GameEventSub'
export default GameEventSub
