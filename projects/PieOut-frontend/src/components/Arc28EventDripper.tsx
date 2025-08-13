import React, { useCallback } from 'react'
import { useAppSubscriberCtx } from '../hooks/useAppSubscriberCtx'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'
import { ellipseAddress } from '../utils/ellipseAddress'
import { motion, AnimatePresence } from 'framer-motion'

// Item animation with smoother, longer transitions
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

// JSON stringify that handles bigint
const safeStringify = (obj: unknown) =>
  JSON.stringify(
    obj,
    (_, value) => {
      if (typeof value === 'bigint') return value.toString()
      return value
    },
    2,
  )

const Arc28EventDripper: React.FC = React.memo(() => {
  // Pull from subscriber context
  const { currentEvent, clearCurrentAndShowNext, fadingOutEventId, queueLength } = useAppSubscriberCtx()

  const isFadingOut = currentEvent && fadingOutEventId === currentEvent.eventId

  const handleSkipClick = useCallback(() => {
    if (!currentEvent) return
    consoleLogger.info(`🎬 User manually skipped event #${currentEvent.eventId}`)
    clearCurrentAndShowNext()
  }, [currentEvent, clearCurrentAndShowNext])

  const handleCopy = useCallback(() => {
    if (!currentEvent) return
    const eventToCopy = {
      ...currentEvent,
      // convert ms -> seconds
      timestamp: Math.floor(currentEvent.timestamp / 1000),
    }
    const payload = safeStringify(eventToCopy)
    navigator.clipboard
      .writeText(payload)
      .then(() => {
        consoleLogger.info('✅ Event copied to clipboard (timestamp in seconds)')
      })
      .catch((err) => {
        consoleLogger.error('❌ Failed to copy event JSON:', err)
      })
  }, [currentEvent])

  if (!currentEvent) {
    return (
      <div className="text-left">
        <div className="text-sm text-slate-400">No events in queue.</div>
        {queueLength > 0 && (
          <div className="text-xs text-slate-500 mt-1">
            {queueLength} event{queueLength === 1 ? '' : 's'} in queue
          </div>
        )}
      </div>
    )
  }
  return (
    <div className="relative">
      <div className="max-h-60 space-y-1 w-fit">
        <AnimatePresence mode="wait">
          <motion.div
            key={`${currentEvent.txnId}-${currentEvent.timestamp}-${currentEvent.eventId}`}
            variants={itemVariants}
            initial="initial"
            animate={isFadingOut ? 'fadingOut' : 'animate'}
            exit="exit"
            className="px-3 py-2 rounded-lg bg-slate-700 border border-slate-600 shadow-lg w-fit space-y-1 font-mono text-xs"
          >
            {/* Row 1: Event name + buttons */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 font-mono text-xs">
                {currentEvent.name === 'game_live' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                    <span className="text-green-400 font-semibold">Game Live</span>
                  </div>
                )}
                {currentEvent.name === 'player_score' && (
                  <div className="flex items-center gap-1">
                    <div className="w-2 h-2 bg-yellow-400 rounded-full"></div>
                    <span className="text-yellow-400 font-semibold">Player Score</span>
                  </div>
                )}
                {currentEvent.name === 'game_over' && (
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

            {/* Row 2: eventId • timestamp • txnId */}
            <div className="text-slate-300">
              # {currentEvent.eventId} • {new Date(currentEvent.timestamp).toLocaleTimeString()} • Txn ID:{' '}
              <span>{ellipseAddress(currentEvent.txnId, 6)}</span>
            </div>

            {/* Row 3: gameId + args */}
            <div className="text-indigo-200">
              Game ID: {String(currentEvent.args.game_id)}
              {currentEvent.name === 'game_live' && (
                <>
                  {' '}
                  • Phase: {currentEvent.args.staking_finalized ? 'Live' : 'Queue'}, Ends:{' '}
                  {new Date(Number(currentEvent.args.expiry_ts) * 1000).toLocaleTimeString()}
                </>
              )}
              {currentEvent.name === 'player_score' && (
                <>
                  {' '}
                  • Score: {String(currentEvent.args.score)}pts, Player: {ellipseAddress(String(currentEvent.args.player), 6)}
                </>
              )}
              {currentEvent.name === 'game_over' && (
                <div className="space-y-0.5">
                  <div className="text-yellow-300">
                    1st Score: {String(currentEvent.args.first_place_score)} • Player:{' '}
                    {ellipseAddress(String(currentEvent.args.first_place_address), 6)}
                  </div>
                  <div className="text-gray-300">
                    2nd Score: {String(currentEvent.args.second_place_score)} • Player:{' '}
                    {ellipseAddress(String(currentEvent.args.second_place_address), 6)}
                  </div>
                  <div className="text-orange-300">
                    3rd Score: {String(currentEvent.args.third_place_score)} • Player:{' '}
                    {ellipseAddress(String(currentEvent.args.third_place_address), 6)}
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
    </div>
  )
})

Arc28EventDripper.displayName = 'Arc28EventDripper'
export default Arc28EventDripper
