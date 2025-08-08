// src/components/Home.tsx
import React, { useCallback, useEffect } from 'react'
import ConnectWallet from './components/ConnectWallet'
import { CopyAddressBtn } from './buttons/CopyAddressBtn'
import GameTable from './components/GameTable'
import { useAppCtx } from './hooks/useAppCtx'
import { useCurrentTimestamp } from './hooks/useCurrentTimestamp'
import { useGameDataCtx } from './hooks/useGameDataCtx'
import { useLastRound } from './hooks/useLastRound'
import { useMethodHandler } from './hooks/useMethodHandler'
import { useModal } from './hooks/useModal'
import GameModal from './modals/GameModal'
import HonorsModal from './modals/HonorsModal'
import ProfileModal from './modals/ProfileModal'
import { ellipseAddress } from './utils/ellipseAddress'
import { algorand } from './utils/network/getAlgorandClient'
import { Tooltip } from './components/Tooltip'
import Arc28EventLogger from './components/Arc28EventLogger'
import { useAppSubscriberCtx } from './hooks/useAppSubscriberCtx'
import { consoleLogger } from '@algorandfoundation/algokit-utils/types/logging'

// Button configurations
const NAVIGATION_BUTTONS = [
  { key: 'wallet', label: 'Wallet', modal: 'wallet' },
  { key: 'profile', label: 'Profile', modal: 'profile' },
  { key: 'game', label: 'Game', modal: 'game' },
  { key: 'honors', label: 'Honors', modal: 'honors' },
] as const

const ACTION_BUTTONS = [
  { key: 'wallet', label: 'Wallet', color: 'purple', action: 'toggleWallet' },
  { key: 'createApp', label: 'Create App', color: 'blue', action: 'createApp' },
  { key: 'mintTrophy', label: 'Mint Trophy', color: 'green', action: 'mintTrophy' },
] as const

const Home: React.FC = () => {
  const { toggleModal, getModalProps } = useModal()
  const { getAppClient, appClient, appCreator } = useAppCtx()
  const currentTimestamp = useCurrentTimestamp()
  const { lastRound } = useLastRound(algorand.client.algod)
  const { handle: handleMethod, isLoading: isLoadingMethod } = useMethodHandler()
  const { gameTrophyData, gameRegisterData } = useGameDataCtx()
  const handleMintTrophy = useCallback(() => handleMethod('mintTrophy'), [handleMethod])

  const getButtonColor = (color: string) => {
    const colors = {
      purple: 'bg-purple-500 hover:bg-purple-600',
      blue: 'bg-blue-500 hover:bg-blue-600',
      green: 'bg-green-500 hover:bg-green-600',
    }
    return colors[color as keyof typeof colors] || 'bg-gray-500 hover:bg-gray-600'
  }

  const handleAction = (action: string) => {
    switch (action) {
      case 'toggleWallet':
        toggleModal('wallet')
        break
      case 'createApp':
        getAppClient()
        break
      case 'mintTrophy':
        handleMintTrophy()
        break
    }
  }

  return (
    <div className="p-6 min-h-screen bg-slate-800">
      {/* Action Buttons - Only show if gameTrophyData is undefined */}
      {gameTrophyData === undefined && (
        <div className="flex gap-2 mb-2">
          {ACTION_BUTTONS.map(({ key, label, color, action }) => (
            <button
              key={key}
              className={`py-2 px-4 rounded text-white font-bold ${getButtonColor(color)} border-2 border-black transition-colors ${
                key === 'mintTrophy' && isLoadingMethod ? 'opacity-50 cursor-not-allowed' : ''
              }`}
              onClick={() => handleAction(action)}
              disabled={key === 'mintTrophy' && isLoadingMethod}
            >
              {key === 'mintTrophy' && isLoadingMethod ? 'Minting...' : label}
            </button>
          ))}
        </div>
      )}

      {/* Navigation Buttons */}
      <div className="flex gap-2 mb-4">
        {NAVIGATION_BUTTONS.map(({ key, label, modal }) => {
          const isDisabled = key === 'game' && !gameRegisterData

          const button = (
            <button
              key={key}
              className={`text-base border-2 px-4 py-1 rounded font-semibold transition-colors duration-200
        ${
          isDisabled
            ? 'bg-gray-500 border-gray-400 text-gray-300'
            : 'bg-slate-800 text-yellow-300 border-yellow-400 hover:bg-slate-700 hover:border-lime-400 hover:text-lime-200'
        }
      `}
              onClick={() => !isDisabled && toggleModal(modal)}
              disabled={isDisabled}
            >
              {label}
            </button>
          )

          return isDisabled ? (
            <Tooltip key={key} message="Profile required.">
              {button}
            </Tooltip>
          ) : (
            button
          )
        })}
      </div>

      {/* App Info */}
      {appClient && (
        <div className="text-indigo-200 font-bold my-2">
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

      <GameTable />
      {/* <Arc28EventLogger /> */}

      <div>
        {/* Your home UI */}
        <Arc28EventLogger />
      </div>

      {/* Modals */}
      <ConnectWallet {...getModalProps('wallet')} />
      <ProfileModal {...getModalProps('profile')} />
      <GameModal {...getModalProps('game')} />
      <HonorsModal {...getModalProps('honors')} />
    </div>
  )
}

export default Home
