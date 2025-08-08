import React, { useEffect } from 'react'
import { useAppSubscriberCtx } from '../hooks/useAppSubscriberCtx'
// import { CopyAddressBtn } from '../buttons/CopyAddressBtn'
import { ellipseAddress } from '../utils/ellipseAddress'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

const Arc28EventLogger: React.FC = React.memo(() => {
  const { arc28Events, arc28EventsCount, clearArc28Events } = useAppSubscriberCtx()

  useEffect(() => {
    consoleLogger.info(`🎯 Arc28EventLogger: Now displaying ${arc28EventsCount} events`)
    if (arc28Events.length > 0) {
      consoleLogger.info(`🎯 Events details:`, arc28Events)
    }
  }, [arc28EventsCount, arc28Events])

  return (
    <div className="text-xs">
      <div className="flex justify-between items-center mb-1">
        <span className="font-bold">ARC28 Events ({arc28EventsCount})</span>
        <button
          className="px-2 py-0.5 bg-red-500 hover:bg-red-600 rounded text-white text-xs"
          onClick={clearArc28Events}
          disabled={arc28EventsCount === 0}
        >
          Clear
        </button>
      </div>

      <div className="max-h-60 overflow-y-auto space-y-1 font-mono">
        {arc28Events.length === 0 ? (
          <div className="py-1 text-center text-slate-400">No events yet</div>
        ) : (
          arc28Events.map((event, index) => (
            <div key={`${event.txnId}-${event.timestamp}`} className="flex gap-2 truncate">
              <span>#{index + 1}</span>
              <span>{new Date(event.timestamp).toLocaleTimeString()}</span>
              <span>{ellipseAddress(event.txnId, 6)}</span>
              <span>
                {event.name}({String(event.args.score)})
              </span>
              <span>{String(event.args.game_id || '-')}</span>
              <span>{String(event.args.score)}</span>
              <span>{ellipseAddress(String(event.args.player), 6)}</span>
            </div>
          ))
        )}
      </div>
    </div>
  )
})

Arc28EventLogger.displayName = 'Arc28EventLogger'
export default Arc28EventLogger
