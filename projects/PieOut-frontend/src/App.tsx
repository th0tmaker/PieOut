import { SupportedWallet, useWallet, WalletId, WalletManager, WalletProvider } from '@txnlab/use-wallet-react'
import { SnackbarProvider } from 'notistack'
import Home from './Home'
import { getAlgodConfigFromViteEnvironment, getKmdConfigFromViteEnvironment } from './utils/network/getAlgoClientConfigs'
import { algorand } from './utils/network/getAlgorandClient'
import { PieoutMethods } from './methods'
import { AppClientProvider } from './contexts/AppClientContext'
import { BoxCommitRandProvider } from './contexts/BoxCommitRandContext'

let supportedWallets: SupportedWallet[]
if (import.meta.env.VITE_ALGOD_NETWORK === 'localnet') {
  const kmdConfig = getKmdConfigFromViteEnvironment()
  supportedWallets = [
    {
      id: WalletId.KMD,
      options: {
        baseServer: kmdConfig.server,
        token: String(kmdConfig.token),
        port: String(kmdConfig.port),
      },
    },
  ]
} else {
  supportedWallets = [
    { id: WalletId.DEFLY },
    { id: WalletId.PERA },
    { id: WalletId.EXODUS },
    // If you are interested in WalletConnect v2 provider
    // refer to https://github.com/TxnLab/use-wallet for detailed integration instructions
  ]
}

const AppProvider = () => {
  const { activeAddress, transactionSigner } = useWallet()
  algorand.setDefaultSigner(transactionSigner)

  const appMethods = activeAddress ? new PieoutMethods(algorand, activeAddress) : undefined

  return (
    <AppClientProvider activeAddress={activeAddress ?? ''} appMethods={appMethods}>
      <Home />
    </AppClientProvider>
  )
}

export default function App() {
  const algodConfig = getAlgodConfigFromViteEnvironment()

  const walletManager = new WalletManager({
    wallets: supportedWallets,
    defaultNetwork: algodConfig.network,
    networks: {
      [algodConfig.network]: {
        algod: {
          baseServer: algodConfig.server,
          port: algodConfig.port,
          token: String(algodConfig.token),
        },
      },
    },
    options: {
      resetNetwork: true,
    },
  })

  return (
    <SnackbarProvider maxSnack={3}>
      <WalletProvider manager={walletManager}>
        <BoxCommitRandProvider>
          <AppProvider />
        </BoxCommitRandProvider>
      </WalletProvider>
    </SnackbarProvider>
  )
}
