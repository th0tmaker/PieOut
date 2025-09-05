// src/components/Home.tsx
import { useWallet } from '@txnlab/use-wallet-react'
import React, { useCallback } from 'react'
import { CopyAddressBtn } from './buttons/CopyAddressBtn'
import ConnectWallet from './components/ConnectWallet'
import GameEventSub from './components/GameEventSub'
import GameTable from './components/GameTable'
import { useAppCtx } from './hooks/useAppCtx'
import { useCurrentTimestamp } from './hooks/useCurrentTimestamp'
import { useLastRound } from './hooks/useLastRound'
import { useModal } from './hooks/useModal'
import GameModal from './modals/GameModal'
import HonorsModal from './modals/HonorsModal'
import ProfileModal from './modals/ProfileModal'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'
import { useMethodHandler } from './hooks/useMethodHandler'
import { useMethodLoadingCtx } from './hooks/useMethodLoadingCtx'

const ADMIN_BUTTONS = [
  { key: 'createApp', label: 'Create App', color: 'blue', action: 'createApp' },
  { key: 'mintTrophy', label: 'Mint Trophy', color: 'green', action: 'mintTrophy' },
  { key: 'deleteApp', label: 'Delete App', color: 'magenta', action: 'terminate' },
] as const

const BUTTON_COLORS = {
  blue: 'bg-blue-500 hover:bg-blue-600',
  green: 'bg-green-500 hover:bg-green-600',
  magenta: 'bg-fuchsia-700 hover:bg-fuchsia-800',
} as const

const USER_BUTTONS = [
  { key: 'wallet', label: 'Wallet', modal: 'wallet' },
  { key: 'profile', label: 'Profile', modal: 'profile' },
  { key: 'game', label: 'Game', modal: 'game' },
  { key: 'honors', label: 'Honors', modal: 'honors' },
] as const

const Home: React.FC = () => {
  const { activeAddress } = useWallet()
  const { toggleModal, getModalProps } = useModal()
  const { getAppClient, appClient, appCreator, isLoading: appIsLoading } = useAppCtx()
  const currentTimestamp = useCurrentTimestamp()
  const { lastRound } = useLastRound(algorand.client.algod)
  const { handle: handleMethod } = useMethodHandler()
  const { isMethodLoading } = useMethodLoadingCtx()

  const handleAction = useCallback(
    (action: string) => {
      const actions = {
        createApp: () => getAppClient(),
        mintTrophy: () => handleMethod('mintTrophy'),
        terminate: () => handleMethod('terminate'),
      }
      actions[action as keyof typeof actions]?.()
    },
    [getAppClient, handleMethod],
  )

  const isActionLoading = (key: string) => (key === 'mintTrophy' || key === 'deleteApp') && isMethodLoading

  const getLoadingLabel = (key: string, label: string) => {
    if (!isMethodLoading) return label
    return key === 'mintTrophy' ? 'Loading...' : key === 'deleteApp' ? 'Loading...' : label
  }

  return (
    <div className="p-6 min-h-screen bg-slate-800">
      {/* Admin Buttons */}
      <div className="flex gap-2 mb-2">
        {ADMIN_BUTTONS.map(({ key, label, color, action }) => (
          <button
            key={key}
            className={`py-2 px-4 rounded text-white font-bold border-2 border-black transition-colors
              ${BUTTON_COLORS[color as keyof typeof BUTTON_COLORS]}
              ${isActionLoading(key) ? 'opacity-50' : ''}
            `}
            onClick={() => handleAction(action)}
            disabled={isActionLoading(key)}
          >
            {getLoadingLabel(key, label)}
          </button>
        ))}
      </div>
      {/* User Buttons */}
      <div className="flex gap-2 mb-4">
        {USER_BUTTONS.map(({ key, label, modal }) => {
          // Disable all buttons if a method is loading
          const buttonDisabled = isMethodLoading || (key !== 'wallet' && (!activeAddress || !appClient))

          return (
            <button
              key={key}
              className={`text-base px-4 py-1 rounded font-semibold border-2 transition-colors duration-200 ${
                buttonDisabled
                  ? 'bg-gray-700 text-gray-300 border-gray-500'
                  : 'bg-slate-800 text-yellow-300 border-yellow-400 hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200'
              }`}
              onClick={() => toggleModal(modal)}
              disabled={buttonDisabled}
              title={!isMethodLoading && key !== 'wallet' && (!activeAddress || !appClient) ? 'Wallet connection required!' : undefined}
            >
              {label}
            </button>
          )
        })}
      </div>
      {/* App Information */}
      {appClient && (
        <div className="text-indigo-200 font-bold my-2 space-y-1">
          <div>
            App Name: <span className="text-cyan-300">{appClient.appName.toString()}</span>
          </div>
          <div>
            App ID: <span className="text-cyan-300">{appClient.appId.toString()}</span>
          </div>

          {appClient.appAddress && (
            <div className="flex items-center gap-2">
              App Address: <span className="text-cyan-300">{ellipseAddress(appClient.appAddress.toString())}</span>
              <CopyAddressBtn value={appClient.appAddress.toString()} title="Copy full address" />
            </div>
          )}

          <div className="flex items-center gap-2">
            App Creator: <span className="text-cyan-300">{ellipseAddress(appCreator!)}</span>
            <CopyAddressBtn value={appCreator!} title="Copy full address" />
          </div>

          <div>
            Last Block Round: <span className="text-cyan-300">{lastRound} ❒</span>
          </div>
          <div>
            Current Local Time: <span className="text-cyan-300">{new Date(currentTimestamp * 1000).toLocaleTimeString()}</span>
          </div>
        </div>
      )}
      {/* Game Components */}
      {activeAddress && appClient && !appIsLoading && (
        <div>
          <GameTable />
          <h1 className="text-indigo-200 font-bold text-xl mt-2 mb-3">Game Event Subscriber</h1>
          <GameEventSub />
        </div>
      )}
      {/* Modals */}
      <ConnectWallet {...getModalProps('wallet')} />
      <ProfileModal {...getModalProps('profile')} />
      <GameModal {...getModalProps('game')} />
      <HonorsModal {...getModalProps('honors')} />
    </div>
  )
}

export default Home
