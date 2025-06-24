//src/methods.ts

import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import { ABIMethod } from 'algosdk'
import { PieoutClient, PieoutFactory } from './contracts/Pieout'

export class PieOutMethods {
  private readonly algorand: AlgorandClient
  private readonly factory: PieoutFactory

  // Constructor
  constructor(algorand: AlgorandClient, sender: string) {
    this.algorand = algorand
    this.factory = algorand.client.getTypedAppFactory(PieoutFactory, {
      defaultSender: sender,
      defaultSigner: this.algorand.account.getSigner(sender),
      deployTimeParams: { GEN_UNIX: BigInt(Math.floor(Date.now() / 1000)) },
      updatable: undefined,
      deletable: true,
    })
  }

  // Factory deploy and handle the smart contract application creation and deletion
  async factoryDeployContract(sender: string): Promise<PieoutClient> {
    const { appClient } = await this.factory.deploy({
      appName: 'PieOut',
      createParams: {
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        method: 'generate',
        args: [],
        maxFee: microAlgo(10_000),
      },
      deleteParams: {
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        method: 'terminate',
        args: [],
        maxFee: microAlgo(10_000),
      },
      onUpdate: 'replace',
      onSchemaBreak: 'fail',
      coverAppCallInnerTransactionFees: true,
    })

    return appClient
  }

  // Factory create the smart contract application by calling the generate method
  async genContract(sender: string, noteGenContract?: string | Uint8Array, noteFundAppMbr?: string | Uint8Array): Promise<PieoutClient> {
    const { appClient } = await this.factory.send.create.generate({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: noteGenContract,
    })

    // Send a payment transaction that covers the smart contract application minimum balance requirement
    this.algorand.send.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: appClient.appAddress,
      amount: microAlgo(100_000),
      note: noteFundAppMbr,
    })

    return appClient
  }

  // Delete the smart contract application by calling the terminate method
  async terminateContract(appId: bigint, sender: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.appClient.send.delete({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      method: 'terminate',
      args: [],
      note: note,
      maxFee: microAlgo(100_000),
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Read the smart contract application genesis unix timestamp
  async readGenUnix(appId: bigint, sender: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const genUnix = await client.readGenUnix({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
    })

    return genUnix
  }

  // Read game state box data
  async readGameState(appId: bigint, sender: string, gameId: bigint) {
    const client = this.factory.getAppClientById({ appId })

    const readBoxGameState = await client.readBoxGameState({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
    })

    return readBoxGameState
  }

  // Read game players box data
  async readGamePlayers(appId: bigint, sender: string, gameId: bigint, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const readBoxGamePlayers = await client.readBoxGamePlayers({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: note,
    })

    return readBoxGamePlayers
  }

  // Read commit rand box data
  async readBoxCommitRand(appId: bigint, sender: string, player: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const readBoxCommitRand = await client.readBoxCommitRand({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player },
      note: note,
    })

    return readBoxCommitRand
  }

  // Mint game trophy asset
  async mintTrophy(
    appId: bigint,
    sender: string,
    noteBoxTPay?: string | Uint8Array,
    noteMintPay?: string | Uint8Array,
    noteMintTrophy?: string | Uint8Array,
  ) {
    const client = this.factory.getAppClientById({ appId })

    const boxTPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(19_300),
      note: noteBoxTPay,
    })

    const mintPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(100_000),
      note: noteMintPay,
    })

    await client.send.mintTrophy({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { boxTPay: boxTPay, mintPay: mintPay },
      note: noteMintTrophy,
      maxFee: microAlgo(100_000),
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Claim game trophy asset
  async claimTrophy(appId: bigint, sender: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.claimTrophy({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
      maxFee: microAlgo(100_000),
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Create new game
  async newGame(
    appId: bigint,
    sender: string,
    maxPlayers: bigint,
    noteBoxSPay?: string | Uint8Array,
    noteBoxPPay?: string | Uint8Array,
    noteStakePay?: string | Uint8Array,
    noteNewGame?: string | Uint8Array,
  ) {
    const client = this.factory.getAppClientById({ appId })

    const { return: boxPAmount } = await client.send.calcSingleBoxCost({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { keySize: 10, valueSize: maxPlayers * 32n },
    })

    if (boxPAmount === undefined) throw new Error('boxPAmount is undefined')

    const [boxSPay, boxPPay, stakePay] = await Promise.all([
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(67_300),
        note: noteBoxSPay,
      }),
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(boxPAmount),
        note: noteBoxPPay,
      }),
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(11_000), // current arbitrary stake pay amount
        note: noteStakePay,
      }),
    ])

    await client.send.newGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { maxPlayers: maxPlayers, boxSPay: boxSPay, boxPPay: boxPPay, stakePay: stakePay },
      note: noteNewGame,
      // maxFee: microAlgo(100_000),
      // populateAppCallResources: true,
    })
  }

  // Join existing game
  async joinGame(appId: bigint, sender: string, gameId: bigint, noteStakePay?: string | Uint8Array, noteJoinGame?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const stakePay = await this.algorand.createTransaction.payment({
      sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(11_000), // current arbitrary stake pay amount
      note: noteStakePay,
    })

    await client.send.joinGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, stakePay: stakePay },
      note: noteJoinGame,
      // maxFee: microAlgo(100_000),
      // populateAppCallResources: true,
    })
  }

  // Get box commit rand
  async getBoxCommitRand(appId: bigint, sender: string, noteBoxCPay?: string | Uint8Array, noteGetBoxCommitRand?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const boxCPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(28_900),
      note: noteBoxCPay,
    })

    await client.send.getBoxCommitRand({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { boxCPay: boxCPay },
      note: noteGetBoxCommitRand,
    })
  }

  // Set box commit rand
  async setBoxCommitRand(appId: bigint, sender: string, gameId: bigint, noteSetBoxCommitRand?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.setBoxCommitRand({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: noteSetBoxCommitRand,
      // maxFee: microAlgo(100_000),
      // populateAppCallResources: true,
    })
  }

  // Delete box commit rand for self
  async delBoxCommitRandForSelf(appId: bigint, sender: string, gameId: bigint, noteDelBoxCommitRandForSelf?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.delBoxCommitRandForSelf({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: noteDelBoxCommitRandForSelf,
      maxFee: microAlgo(100_000),
      populateAppCallResources: true,
    })
  }

  // Delete box commit rand for other
  async delBoxCommitRandForOther(appId: bigint, sender: string, player: string, noteDelBoxCommitRandForOther?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.delBoxCommitRandForOther({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player },
      note: noteDelBoxCommitRandForOther,
      maxFee: microAlgo(100_000),
      populateAppCallResources: true,
    })
  }

  // Play designated game
  async playGame(
    appId: bigint,
    sender: string,
    gameId: bigint,
    noteUpRefBudgetForPlayGame?: string | Uint8Array,
    notePlayGame?: string | Uint8Array,
  ) {
    const client = this.factory.getAppClientById({ appId })
    const composer = this.algorand.newGroup()

    composer
      .addAppCallMethodCall({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        appId: client.appId,
        maxFee: microAlgo(100_000),
        method: ABIMethod.fromSignature('up_ref_budget_for_play_game(uint64)void'),
        args: [gameId],
        note: noteUpRefBudgetForPlayGame,
      })
      .addAppCallMethodCall({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        appId: client.appId,
        maxFee: microAlgo(100_000),
        method: ABIMethod.fromSignature('play_game(uint64)void'),
        args: [gameId],
        note: notePlayGame,
      })

    await composer.send({ coverAppCallInnerTransactionFees: true })
  }

  // Trigger game proggession
  async triggerGameProg(appId: bigint, sender: string, gameId: bigint, triggerId: bigint, noteTriggerGameProg?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const triggerGameProgTxn = await client.send.triggerGameProg({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, triggerId: triggerId },
      note: noteTriggerGameProg,
      maxFee: microAlgo(100_000),
      coverAppCallInnerTransactionFees: true,
    })

    return triggerGameProgTxn.return
  }

  // Reset existing game
  async resetGame(appId: bigint, sender: string, gameId: bigint, noteStakePay?: string | Uint8Array, noteResetGame?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const stakePay = await this.algorand.createTransaction.payment({
      sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(11_100), // current arbitrary stake pay amount
      note: noteStakePay,
    })

    await client.send.resetGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, stakePay: stakePay },
      note: noteResetGame,
    })
  }

  // Delete existing game
  async deleteGame(appId: bigint, sender: string, gameId: bigint, noteDeleteGame?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.deleteGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: noteDeleteGame,
      maxFee: microAlgo(100_000),
      populateAppCallResources: true,
    })
  }
}
