//src/methods.ts
import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import { ABIMethod } from 'algosdk'
import { PieoutClient, PieoutFactory } from './contracts/Pieout'

export class PieoutMethods {
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
  async deploy(sender: string): Promise<PieoutClient> {
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
  async generate(sender: string, noteGenContract?: string | Uint8Array, noteFundAppMbr?: string | Uint8Array): Promise<PieoutClient> {
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
  async terminate(appId: bigint, sender: string, note?: string | Uint8Array) {
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

  //Calculate the minimum balance requirement (MBR) cost for storing a single box unit
  async calcSingleBoxCost(appId: bigint, sender: string, keySize: number | bigint, valueSize: number | bigint, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })
    const result = await client.calcSingleBoxCost({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { keySize: keySize, valueSize: valueSize },
      note: note,
    })
    return result
  }

  // Read the smart contract application genesis unix timestamp
  async readGenUnix(appId: bigint, sender: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const result = await client.readGenUnix({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
    })

    return result
  }

  async doesBoxGameTrophyExist(appId: bigint, sender: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const result = await client.doesBoxGameTrophyExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
    })

    return result
  }

  // Read game state box data
  async doesBoxGameStateExist(appId: bigint, sender: string, gameId: bigint) {
    const client = this.factory.getAppClientById({ appId })

    const result = await client.doesBoxGameStateExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
    })

    return result
  }

  // Read game players box data
  async readBoxGamePlayers(appId: bigint, sender: string, gameId: bigint, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const result = await client.readBoxGamePlayers({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: note,
    })

    return result
  }

  // Check if Game Register box exists for the given player account address
  async doesBoxGameRegisterExist(appId: bigint, sender: string, player: string, note?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const result = await client.doesBoxGameRegisterExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player },
      note: note,
    })

    return result
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
      amount: microAlgo(19_700),
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
      maxFee: microAlgo(10_000),
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
      maxFee: microAlgo(10_000),
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
        amount: microAlgo(80_500),
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
  async getBoxGameRegister(appId: bigint, sender: string, noteBoxCPay?: string | Uint8Array, noteGetBoxGameRegister?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    const boxRPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(29_700),
      note: noteBoxCPay,
    })

    await client.send.getBoxGameRegister({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { boxRPay: boxRPay },
      note: noteGetBoxGameRegister,
    })
  }

  // Set game commit
  async setGameCommit(appId: bigint, sender: string, gameId: bigint, noteSetGameCommit?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.setGameCommit({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId },
      note: noteSetGameCommit,
    })
  }

  // Delete box commit rand for self
  async delBoxGameRegisterForSelf(appId: bigint, sender: string, noteDelBoxGameRegisterForSelf?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.delBoxGameRegisterForSelf({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: noteDelBoxGameRegisterForSelf,
      maxFee: microAlgo(10_000),
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Delete box commit rand for other
  async delBoxGameRegisterForOther(appId: bigint, sender: string, player: string, noteDelBoxGameRegisterForOther?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.delBoxGameRegisterForOther({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player },
      note: noteDelBoxGameRegisterForOther,
      maxFee: microAlgo(10_000),
      coverAppCallInnerTransactionFees: true,
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
  async triggerGameEvent(appId: bigint, sender: string, gameId: bigint, triggerId: bigint, noteTriggerGameProg?: string | Uint8Array) {
    const client = this.factory.getAppClientById({ appId })

    await client.send.triggerGameEvent({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, triggerId: triggerId },
      note: noteTriggerGameProg,
      maxFee: microAlgo(10_000),
      coverAppCallInnerTransactionFees: true,
    })
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
      maxFee: microAlgo(10_000),
      coverAppCallInnerTransactionFees: true,
      note: noteDeleteGame,
    })
  }
}
