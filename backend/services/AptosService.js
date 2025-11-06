const { Aptos, AptosConfig, Network, Account, Ed25519PrivateKey } = require("@aptos-labs/ts-sdk");
const crypto = require('crypto');

class AptosService {
  constructor() {
    this.aptos = null;
    this.account = null;
    this.initialize();
  }

  async initialize() {
    try {
      // Determine network from environment
      const network = process.env.NETWORK === 'mainnet' ? Network.MAINNET :
                      process.env.NETWORK === 'testnet' ? Network.TESTNET :
                      Network.DEVNET;

      // Initialize Aptos client with SDK v5
      const config = new AptosConfig({
        network,
        fullnode: process.env.APTOS_NODE_URL
      });
      this.aptos = new Aptos(config);

      // Initialize account if private key is provided
      if (process.env.SERVER_PRIVATE_KEY) {
        // Remove 'ed25519-priv-0x' prefix if present
        const privateKeyHex = process.env.SERVER_PRIVATE_KEY.replace('ed25519-priv-0x', '').replace('0x', '');
        const privateKey = new Ed25519PrivateKey(privateKeyHex);
        this.account = Account.fromPrivateKey({ privateKey });
        console.log('🔑 Server account initialized:', this.account.accountAddress.toString());
      }

      console.log('🌊 Aptos service initialized successfully on', network);
    } catch (error) {
      console.error('❌ Error initializing Aptos service:', error);
    }
  }

  async createGame(stakeAmount, minPlayers) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::create_game`,
          functionArguments: [stakeAmount, minPlayers],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      const executedTransaction = await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`🎮 Game created on-chain. Transaction: ${committedTxn.hash}`);

      // Extract game_id from events
      const gameCreatedEvent = executedTransaction.events?.find(
        (e) => e.type === `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::GameCreated`
      );

      if (!gameCreatedEvent) {
        throw new Error('Game creation event not found');
      }

      const gameId = gameCreatedEvent.data.game_id;
      console.log(`🎮 Game ID: ${gameId}`);
      return gameId;
    } catch (error) {
      console.error('❌ Error creating game on-chain:', error);
      throw error;
    }
  }

  async joinGame(gameId, playerAddress) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::join_game`,
          functionArguments: [gameId],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`✅ Join game transaction confirmed: ${committedTxn.hash}`);
      return committedTxn.hash;
    } catch (error) {
      console.error('❌ Error joining game on-chain:', error);
      throw error;
    }
  }

  async storeRoleCommit(gameId, commit) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::store_role_commit`,
          functionArguments: [gameId, commit],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`✅ Role commit transaction confirmed: ${committedTxn.hash}`);
      return committedTxn.hash;
    } catch (error) {
      console.error('❌ Error storing role commit on-chain:', error);
      throw error;
    }
  }

  async submitSettlement(gameId, winners, payoutAmounts) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      console.log('💰 Submitting settlement for game:', gameId);
      console.log('💰 Winners:', winners);
      console.log('💰 Payout amounts:', payoutAmounts.map(a => a.toString()));
      console.log('💰 Server account address:', this.account.accountAddress.toString());

      // First verify the server signer public key matches
      try {
        const contractInfo = await this.getContractInfo();
        const contractPubkey = contractInfo.serverSignerPubkey;
        const ourPubkey = this.account.publicKey.toUint8Array();

        console.log('💰 Contract public key (vector<u8>):', contractPubkey);
        console.log('💰 Our public key (bytes):', Array.from(ourPubkey));
        console.log('💰 Our public key (hex):', Buffer.from(ourPubkey).toString('hex'));
        console.log('💰 Contract initialized:', contractInfo.initialized);

        // Compare public keys
        if (contractInfo.initialized && contractPubkey && contractPubkey.length > 0) {
          // Convert contract pubkey (which might be hex string or array) to comparable format
          const contractPubkeyHex = Array.isArray(contractPubkey)
            ? Buffer.from(contractPubkey).toString('hex')
            : contractPubkey;
          const ourPubkeyHex = Buffer.from(ourPubkey).toString('hex');

          console.log('💰 Comparing pubkeys:', { contractPubkeyHex, ourPubkeyHex });

          if (contractPubkeyHex !== ourPubkeyHex) {
            throw new Error(`Public key mismatch! Contract expects: ${contractPubkeyHex}, but we have: ${ourPubkeyHex}`);
          }
          console.log('✅ Public key verification passed!');
        } else {
          console.warn('⚠️ Contract not initialized or server_signer not set! You need to call initialize() or update_server_signer() on the contract.');
          console.warn(`⚠️ To fix this, call: update_server_signer(admin, 0x${Buffer.from(ourPubkey).toString('hex')})`);
        }
      } catch (error) {
        console.error('⚠️ Could not verify server signer:', error.message);
      }

      // Create signature message following contract format: BCS(game_id) || BCS(winners) || BCS(payouts)
      // The contract uses bcs::to_bytes() for each component separately
      const { Serializer, AccountAddress } = require("@aptos-labs/ts-sdk");

      // Serialize game_id (u64)
      const gameIdSerializer = new Serializer();
      gameIdSerializer.serializeU64(BigInt(gameId));
      const gameIdBytes = gameIdSerializer.toUint8Array();

      // Serialize winners vector (vector<address>)
      const winnersSerializer = new Serializer();
      winnersSerializer.serializeU32AsUleb128(winners.length);
      winners.forEach(addr => {
        const accountAddr = AccountAddress.from(addr);
        accountAddr.serialize(winnersSerializer);
      });
      const winnersBytes = winnersSerializer.toUint8Array();

      // Serialize payouts vector (vector<u64>)
      const payoutsSerializer = new Serializer();
      payoutsSerializer.serializeU32AsUleb128(payoutAmounts.length);
      payoutAmounts.forEach(amount => {
        payoutsSerializer.serializeU64(BigInt(amount));
      });
      const payoutsBytes = payoutsSerializer.toUint8Array();

      // Concatenate all serialized bytes
      const message = new Uint8Array(gameIdBytes.length + winnersBytes.length + payoutsBytes.length);
      message.set(gameIdBytes, 0);
      message.set(winnersBytes, gameIdBytes.length);
      message.set(payoutsBytes, gameIdBytes.length + winnersBytes.length);

      // Sign the message with server's private key
      const signature = this.account.sign(message);
      const signatureBytes = signature.toUint8Array();

      console.log('💰 Message hex:', Buffer.from(message).toString('hex'));
      console.log('💰 Message length:', message.length);
      console.log('💰 Signature hex:', Buffer.from(signatureBytes).toString('hex'));
      console.log('💰 Signature length:', signatureBytes.length);
      console.log('💰 Public key:', this.account.publicKey.toString());

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::settle_game`,
          functionArguments: [gameId, winners, payoutAmounts, Array.from(signatureBytes)],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`✅ Settlement transaction confirmed: ${committedTxn.hash}`);
      return committedTxn.hash;
    } catch (error) {
      console.error('❌ Error submitting settlement on-chain:', error);
      throw error;
    }
  }

  async getGameInfo(gameId) {
    try {
      if (!this.aptos) {
        throw new Error('Aptos client not initialized');
      }

      const result = await this.aptos.view({
        payload: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::get_game_info`,
          functionArguments: [gameId],
        },
      });

      return result[0];
    } catch (error) {
      console.error('❌ Error getting game info from chain:', error);
      throw error;
    }
  }

  async getGamePlayers(gameId) {
    try {
      if (!this.aptos) {
        throw new Error('Aptos client not initialized');
      }

      const result = await this.aptos.view({
        payload: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::get_game_players`,
          functionArguments: [gameId],
        },
      });

      return result[0];
    } catch (error) {
      console.error('❌ Error getting game players from chain:', error);
      throw error;
    }
  }

  async withdraw(playerAddress) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::withdraw`,
          functionArguments: [],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`✅ Withdrawal transaction confirmed: ${committedTxn.hash}`);
      return committedTxn.hash;
    } catch (error) {
      console.error('❌ Error withdrawing funds:', error);
      throw error;
    }
  }

  async emergencyCancel(gameId) {
    try {
      if (!this.aptos || !this.account) {
        throw new Error('Aptos client or account not initialized');
      }

      const transaction = await this.aptos.transaction.build.simple({
        sender: this.account.accountAddress,
        data: {
          function: `${process.env.PEPASUR_APTOS_CONTRACT_ADDRESS}::pepasur::emergency_cancel`,
          functionArguments: [gameId],
        },
      });

      const committedTxn = await this.aptos.signAndSubmitTransaction({
        signer: this.account,
        transaction,
      });

      await this.aptos.waitForTransaction({
        transactionHash: committedTxn.hash,
      });

      console.log(`✅ Emergency cancel transaction confirmed: ${committedTxn.hash}`);
      return committedTxn.hash;
    } catch (error) {
      console.error('❌ Error emergency canceling game:', error);
      throw error;
    }
  }

  async getContractInfo() {
    try {
      if (!this.aptos) {
        throw new Error('Aptos client not initialized');
      }

      const contractAddress = process.env.PEPASUR_APTOS_CONTRACT_ADDRESS;

      // Get Config resource which contains server_signer as vector<u8> (public key)
      const config = await this.aptos.getAccountResource({
        accountAddress: contractAddress,
        resourceType: `${contractAddress}::pepasur::Config`,
      });

      console.log(`📋 Raw Config resource:`, JSON.stringify(config, null, 2));

      const result = {
        admin: config.admin,
        serverSignerPubkey: config.server_signer, // This is vector<u8> containing the public key
        feeRecipient: config.fee_recipient,
        houseCutBps: config.house_cut_bps,
        initialized: config.initialized,
      };

      console.log(`📋 Contract info retrieved:`, result);
      return result;
    } catch (error) {
      console.error('❌ Error getting contract info from chain:', error);
      throw error;
    }
  }

}

module.exports = AptosService;
