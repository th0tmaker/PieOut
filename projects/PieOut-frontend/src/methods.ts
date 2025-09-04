//src/methods.ts
import { AlgorandClient, microAlgo } from '@algorandfoundation/algokit-utils'
import { ABIMethod } from 'algosdk'
import { PieoutClient, PieoutFactory } from './contracts/Pieout'

// Create a class for managing application method calls
export class PieoutMethods {
  private readonly algorand: AlgorandClient // Define a private property that stores an instance of the `AlgorandClient`
  private readonly factory: PieoutFactory // Define a private property that stores an instance of the `PieoutFactory`

  // Initialize class constructor with default params
  constructor(algorand: AlgorandClient, sender: string) {
    this.algorand = algorand // Pass and instance of the `AlgorandClient` from the constructor params

    // Use algorand to get an instance of the factory class that handles app deployment and lifecycle
    this.factory = algorand.client.getTypedAppFactory(PieoutFactory, {
      defaultSender: sender,
      defaultSigner: this.algorand.account.getSigner(sender),
      // GEN_UNIX must be different on each deployment to ensure approval bytecode is unique
      deployTimeParams: { GEN_UNIX: BigInt(Math.floor(Date.now() / 1000)) },
      updatable: undefined, // App has no update logic
      deletable: true, // Allow app deletion
    })
  }

  // Deploy and manage the application creation and deletion lifecycle using the factory feature
  async deploy(sender: string): Promise<PieoutClient> {
    const { appClient } = await this.factory.deploy({
      appName: 'PieOut',
      createParams: {
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        method: 'generate', // Pass method name that handles app creation logic
        args: [],
        maxFee: microAlgo(10_000), // Fee Required: If any; 'create', 'delete', 'update' requires fee, all do
      },
      deleteParams: {
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        method: 'terminate', // Pass method name that handles app deletion logic
        args: [],
        maxFee: microAlgo(10_000), // Fee Required: Deletion logic contains inner transactions
      },
      onUpdate: 'replace', // If approval bytecode is unique, replace exisitng app with new one
      onSchemaBreak: 'fail', // If storage schema or extra pages change value, fail deployment
      coverAppCallInnerTransactionFees: true,
    })

    // Return the created application client from the factory deploy method call
    return appClient
  }

  // Create application using the factory feature
  async generate(sender: string, noteGenContract?: string | Uint8Array, noteFundAppMbr?: string | Uint8Array): Promise<PieoutClient> {
    // Use factory to send an app call transaction that executes the smart contract create method called `generate`
    const { appClient } = await this.factory.send.create.generate({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: noteGenContract,
    })

    // Ensure creator sends a payment transaction that covers the application account's minimum balance requirement
    this.algorand.send.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: appClient.appAddress,
      amount: microAlgo(100_000), // 0.1A is the minimum required amount for any account to transact on the blockchain
      note: noteFundAppMbr,
    })

    return appClient
  }

  // Delete application using the factory feature
  async terminate(appId: bigint, sender: string, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract delete method called `terminate`
    await client.appClient.send.delete({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      method: 'terminate', // Pass method name that handles app deletion logic
      args: [],
      note: note,
      maxFee: microAlgo(10_000), // Fee Required: Deletion logic contains inner transactions
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Simulate read-only transaction that calculates the total storage cost of a single box unit
  async calcSingleBoxCost(appId: bigint, sender: string, keySize: number | bigint, valueSize: number | bigint, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `calcSingleBoxCost`
    const result = await client.calcSingleBoxCost({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { keySize: keySize, valueSize: valueSize },
      note: note,
    })
    return result
  }

  // Simulate read-only transaction that reads the smart contract creation genesis unix timestamp
  async readGenUnix(appId: bigint, sender: string, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `readGenUnix`
    const result = await client.readGenUnix({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
    })

    return result
  }

  // Simulate read-only transaction that checks if the game trophy box exists inside the contract storage
  async doesBoxGameTrophyExist(appId: bigint, sender: string, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `doesBoxGameTrophyExist`
    const result = await client.doesBoxGameTrophyExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
    })

    // Return true if found to exist, else false
    return result
  }

  // Simulate read-only transaction that checks if the game register box under a given key exists inside the contract storage
  async doesBoxGameRegisterExist(appId: bigint, sender: string, player: string, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `doesBoxGameRegisterExist`
    const result = await client.doesBoxGameRegisterExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player }, // PLAYER arg is the key that identifies the game register box we are looking up
      note: note,
    })

    // Return true if found to exist, else false
    return result
  }

  // Simulate read-only transaction that checks if the game state box under a given key exists inside the contract storage
  async doesBoxGameStateExist(appId: bigint, sender: string, gameId: bigint) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `doesBoxGameStateExist`
    const result = await client.doesBoxGameStateExist({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId }, // GAME ID arg is the key that identifies the game state box we are looking up
    })

    // Return true if found to exist, else false
    return result
  }

  // Simulate read-only transaction that reads the game players box contents under a given key
  async readBoxGamePlayers(appId: bigint, sender: string, gameId: bigint, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate an app call read-only transaction that executes the smart contract method called `readBoxGamePlayers`
    const result = await client.readBoxGamePlayers({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId }, // GAME ID arg is the key that identifies the game players box we are looking up
      note: note,
    })

    // Return an array of string values, each element is an Algorand address of an active player
    return result
  }

  // Mint game trophy NFT that will serve as the reward for the all-time highest scoring player
  async mintTrophy(
    appId: bigint,
    sender: string,
    noteBoxTPay?: string | Uint8Array,
    noteMintPay?: string | Uint8Array,
    noteMintTrophy?: string | Uint8Array,
  ) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Create a payment transaction to cover the storage cost of creating a game trophy box
    const boxTPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(19_700), // Amount needed to cover cost: 0.0197A
      note: noteBoxTPay,
    })

    // Create a payment transaction to cover the creation cost of minting the game trophy asset
    const mintPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(100_000), // Amount needed to cover cost: 0.1A
      note: noteMintPay,
    })

    // Send an app call transaction that executes the smart contract method called `mintTrophy`
    await client.send.mintTrophy({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { boxTPay: boxTPay, mintPay: mintPay }, // Add the payment transactions to the group
      note: noteMintTrophy,
      maxFee: microAlgo(10_000), // Cover for inner transaction fees
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Allow the all-time high score holder to claim the game trophy NFT and add it to their account asset balance
  async claimTrophy(appId: bigint, sender: string, note?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `claimTrophy`
    await client.send.claimTrophy({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: note,
      maxFee: microAlgo(10_000), // Cover for inner transaction fees
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Allow user to create a new game instance within the application
  async newGame(
    appId: bigint,
    sender: string,
    quickPlayEnabled: boolean,
    maxPlayers: bigint,
    noteBoxSPay?: string | Uint8Array,
    noteBoxPPay?: string | Uint8Array,
    noteStakePay?: string | Uint8Array,
    noteNewGame?: string | Uint8Array,
  ) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Simulate the app `calcSingleBoxCost` method to calculate the storage cost of creating a game players box
    const { return: boxPAmount } = await client.send.calcSingleBoxCost({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { keySize: 10, valueSize: maxPlayers * 32n }, // Num of max players * address size in bytes dictate value size
    })

    // If game players box storage cost amount was not calculated successfully and remains undefined, throw error
    if (boxPAmount === undefined) throw new Error('boxPAmount is undefined')

    // Define the payment transactions to cover the cost of creating a new game instance
    const [boxSPay, boxPPay, stakePay] = await Promise.all([
      // Create a payment transaction to cover the storage cost of creating a game state box
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(80_500), // Amount needed to cover cost: 0.0805A
        note: noteBoxSPay,
      }),
      // Create a payment transaction to cover the storage cost of creating a game players box
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(boxPAmount), // Amount needed to cover cost: depends on dynamic size at creation
        note: noteBoxPPay,
      }),
      // Create a payment transaction to cover the entry stake
      this.algorand.createTransaction.payment({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        receiver: client.appAddress,
        amount: microAlgo(1_000_000), // current arbitrary stake pay amount
        note: noteStakePay,
      }),
    ])

    // Send an app call transaction that executes the smart contract method called `newGame`
    await client.send.newGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { quickPlayEnabled: quickPlayEnabled, maxPlayers: maxPlayers, boxSPay: boxSPay, boxPPay: boxPPay, stakePay: stakePay },
      note: noteNewGame,
    })
  }

  // Allow user to join an existing game instance within the application
  async joinGame(appId: bigint, sender: string, gameId: bigint, noteStakePay?: string | Uint8Array, noteJoinGame?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Create a payment transaction to cover the entry stake
    const stakePay = await this.algorand.createTransaction.payment({
      sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(1_000_000), // current arbitrary stake pay amount
      note: noteStakePay,
    })

    // Send an app call transaction that executes the smart contract method called `joinGame`
    await client.send.joinGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, stakePay: stakePay },
      note: noteJoinGame,
    })
  }

  // Allow user to request and obtain a game register box tied to thier address, this is required in order to interact with any games
  async getBoxGameRegister(appId: bigint, sender: string, noteBoxCPay?: string | Uint8Array, noteGetBoxGameRegister?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Create a payment transaction to cover the storage cost of creating a game register box
    const boxRPay = await this.algorand.createTransaction.payment({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(29_700), // Amount needed to cover cost: 0.0297A
      note: noteBoxCPay,
    })

    // Send an app call transaction that executes the smart contract method called `getBoxGameRegister`
    await client.send.getBoxGameRegister({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { boxRPay: boxRPay },
      note: noteGetBoxGameRegister,
    })
  }

  // Allow user to set a commitment to a specific game instance, this is required in order to play the game one committed to
  async setGameCommit(appId: bigint, sender: string, gameId: bigint, noteSetGameCommit?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `setGameCommit`
    await client.send.setGameCommit({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId }, // GAME ID is arg that denotes the game instance tied to the player's commitment
      note: noteSetGameCommit,
    })
  }

  // Allow users to delete the game register box for their own account
  async delBoxGameRegisterForSelf(appId: bigint, sender: string, noteDelBoxGameRegisterForSelf?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `delBoxGameRegisterForSelf`
    await client.send.delBoxGameRegisterForSelf({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: [],
      note: noteDelBoxGameRegisterForSelf,
      maxFee: microAlgo(10_000), // Cover for inner transaction fees that refund the MBR to the account deleting the box
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Allow users to delete the game register box for another foreign account
  async delBoxGameRegisterForOther(appId: bigint, sender: string, player: string, noteDelBoxGameRegisterForOther?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `delBoxGameRegisterForOther`
    await client.send.delBoxGameRegisterForOther({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { player: player }, // PLAYER arg is the key for the game register box being deleted
      note: noteDelBoxGameRegisterForOther,
      maxFee: microAlgo(10_000), // Cover for inner transaction fees that refund the MBR to the player account
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Allow user to play the designated game they committed to
  async playGame(
    appId: bigint,
    sender: string,
    gameId: bigint,
    noteUpRefBudgetForPlayGame?: string | Uint8Array,
    notePlayGame?: string | Uint8Array,
  ) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Use algorand client to access the transaction composer
    const composer = this.algorand.newGroup()

    // Use the transaction composer object to add methods in an atomic group
    composer
      // Add an app call transaction that executes the smart contract method called `upRefBudgetForPlayGame`
      .addAppCallMethodCall({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        appId: client.appId,
        maxFee: microAlgo(100_000),
        method: ABIMethod.fromSignature('up_ref_budget_for_play_game(uint64)void'),
        args: [gameId],
        note: noteUpRefBudgetForPlayGame,
      })
      // Add an app call transaction that executes the smart contract method called `playGame`
      .addAppCallMethodCall({
        sender: sender,
        signer: this.algorand.account.getSigner(sender),
        appId: client.appId,
        maxFee: microAlgo(100_000), // Mainly covers opcode budget increase inner transactions, but also others
        method: ABIMethod.fromSignature('play_game(uint64)void'),
        args: [gameId],
        note: notePlayGame,
      })

    // Use the transaction composer object to send the entire atomic group to the network
    await composer.send({ coverAppCallInnerTransactionFees: true })
  }

  // Allow any user to trigger a game event check and potentially progress the game to the next phase
  async triggerGameEvent(appId: bigint, sender: string, gameId: bigint, triggerId: bigint, noteTriggerGameProg?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `triggerGameEvent`
    await client.send.triggerGameEvent({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId, triggerId: triggerId }, // triggerId:0n=checkGameLive, triggerId:2n=checkGameOver
      note: noteTriggerGameProg,
      maxFee: microAlgo(10_000), // Cover for inner transaction fees if game over check is triggered
      coverAppCallInnerTransactionFees: true,
    })
  }

  // Allow authorized user to reset an existing game instance within the application
  async resetGame(
    appId: bigint,
    sender: string,
    gameId: bigint,
    changeQuickPlay: boolean,
    changeMaxPlayers: boolean,
    newMaxPlayers: bigint,
    noteStakePay?: string | Uint8Array,
    noteResetGame?: string | Uint8Array,
  ) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Create a payment transaction to cover the entry stake
    const stakePay = await this.algorand.createTransaction.payment({
      sender,
      signer: this.algorand.account.getSigner(sender),
      receiver: client.appAddress,
      amount: microAlgo(1_000_000), // current arbitrary stake pay amount
      note: noteStakePay,
    })

    // Send an app call transaction that executes the smart contract method called `resetGame`
    await client.send.resetGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: {
        gameId: gameId,
        changeQuickPlay: changeQuickPlay,
        changeMaxPlayers: changeMaxPlayers,
        newMaxPlayers: newMaxPlayers,
        stakePay: stakePay,
      },
      note: noteResetGame,
    })
  }

  // Allow authorized user to delete an existing game instance within the application
  async deleteGame(appId: bigint, sender: string, gameId: bigint, noteDeleteGame?: string | Uint8Array) {
    // Use factory to get an instance of the application client by referencing the client unique ID
    const client = this.factory.getAppClientById({ appId })

    // Send an app call transaction that executes the smart contract method called `deleteGame`
    await client.send.deleteGame({
      sender: sender,
      signer: this.algorand.account.getSigner(sender),
      args: { gameId: gameId }, // GAME ID arg is the key that identifies the game state box we are trying to delete
      maxFee: microAlgo(10_000), // Cover for inner transaction fees
      coverAppCallInnerTransactionFees: true,
      note: noteDeleteGame,
    })
  }
}
