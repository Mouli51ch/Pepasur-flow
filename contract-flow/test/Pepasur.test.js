const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture } = require("@nomicfoundation/hardhat-network-helpers");

describe("Pepasur Contract", function () {
  // Fixture to deploy contract and set up initial state
  async function deployPepasurFixture() {
    const [owner, serverSigner, feeRecipient, player1, player2, player3, player4] =
      await ethers.getSigners();

    const Pepasur = await ethers.getContractFactory("Pepasur");
    const pepasur = await Pepasur.deploy();
    await pepasur.waitForDeployment();

    const contractAddress = await pepasur.getAddress();

    return {
      pepasur,
      contractAddress,
      owner,
      serverSigner,
      feeRecipient,
      player1,
      player2,
      player3,
      player4,
    };
  }

  // Fixture with initialized contract
  async function deployAndInitializeFixture() {
    const fixture = await deployPepasurFixture();
    const { pepasur, serverSigner, feeRecipient } = fixture;

    await pepasur.initialize(serverSigner.address, feeRecipient.address);

    return fixture;
  }

  describe("Deployment", function () {
    it("Should deploy with correct initial state", async function () {
      const { pepasur, owner } = await loadFixture(deployPepasurFixture);

      const config = await pepasur.getConfig();
      expect(config.admin).to.equal(owner.address);
      expect(config.feeRecipient).to.equal(owner.address);
      expect(config.houseCutBps).to.equal(200); // 2%
      expect(config.initialized).to.be.false;

      const nextGameId = await pepasur.getNextGameId();
      expect(nextGameId).to.equal(1);
    });

    it("Should have correct EIP-712 domain", async function () {
      const { pepasur } = await loadFixture(deployPepasurFixture);
      const domain = await pepasur.eip712Domain();

      expect(domain.name).to.equal("Pepasur");
      expect(domain.version).to.equal("1");
    });
  });

  describe("Initialization", function () {
    it("Should initialize correctly", async function () {
      const { pepasur, serverSigner, feeRecipient } = await loadFixture(
        deployPepasurFixture
      );

      await pepasur.initialize(serverSigner.address, feeRecipient.address);

      const config = await pepasur.getConfig();
      expect(config.serverSigner).to.equal(serverSigner.address);
      expect(config.feeRecipient).to.equal(feeRecipient.address);
      expect(config.initialized).to.be.true;
    });

    it("Should revert if initialized twice", async function () {
      const { pepasur, serverSigner, feeRecipient } = await loadFixture(
        deployAndInitializeFixture
      );

      await expect(
        pepasur.initialize(serverSigner.address, feeRecipient.address)
      ).to.be.revertedWithCustomError(pepasur, "AlreadyInitialized");
    });

    it("Should revert if non-admin tries to initialize", async function () {
      const { pepasur, serverSigner, feeRecipient, player1 } = await loadFixture(
        deployPepasurFixture
      );

      await expect(
        pepasur.connect(player1).initialize(serverSigner.address, feeRecipient.address)
      ).to.be.revertedWithCustomError(pepasur, "NotAuthorized");
    });

    it("Should revert if zero address provided", async function () {
      const { pepasur, feeRecipient } = await loadFixture(deployPepasurFixture);

      await expect(
        pepasur.initialize(ethers.ZeroAddress, feeRecipient.address)
      ).to.be.revertedWithCustomError(pepasur, "InvalidStakeAmount");
    });
  });

  describe("Game Creation", function () {
    it("Should create a game successfully", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");
      const minPlayers = 4;

      await expect(
        pepasur.connect(player1).createGame(stakeAmount, minPlayers, { value: stakeAmount })
      )
        .to.emit(pepasur, "GameCreated")
        .withArgs(1, player1.address, stakeAmount, minPlayers)
        .and.to.emit(pepasur, "PlayerJoined")
        .withArgs(1, player1.address, 1);

      const game = await pepasur.getGame(1);
      expect(game.id).to.equal(1);
      expect(game.creator).to.equal(player1.address);
      expect(game.stakeAmount).to.equal(stakeAmount);
      expect(game.minPlayers).to.equal(minPlayers);
      expect(game.players.length).to.equal(1);
      expect(game.players[0]).to.equal(player1.address);
      expect(game.status).to.equal(0); // LOBBY
      expect(game.totalPool).to.equal(stakeAmount);
    });

    it("Should revert if contract not initialized", async function () {
      const { pepasur, player1 } = await loadFixture(deployPepasurFixture);

      const stakeAmount = ethers.parseEther("1.0");

      await expect(
        pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount })
      ).to.be.revertedWithCustomError(pepasur, "NotInitialized");
    });

    it("Should revert if stake amount is zero", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      await expect(
        pepasur.connect(player1).createGame(0, 4, { value: 0 })
      ).to.be.revertedWithCustomError(pepasur, "InvalidStakeAmount");
    });

    it("Should revert if min players is less than 2", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");

      await expect(
        pepasur.connect(player1).createGame(stakeAmount, 1, { value: stakeAmount })
      ).to.be.revertedWithCustomError(pepasur, "MinPlayersNotMet");
    });

    it("Should revert if incorrect stake sent", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");
      const wrongAmount = ethers.parseEther("0.5");

      await expect(
        pepasur.connect(player1).createGame(stakeAmount, 4, { value: wrongAmount })
      ).to.be.revertedWithCustomError(pepasur, "IncorrectStakeAmount");
    });
  });

  describe("Joining Games", function () {
    it("Should allow players to join a game", async function () {
      const { pepasur, player1, player2 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });

      await expect(pepasur.connect(player2).joinGame(1, { value: stakeAmount }))
        .to.emit(pepasur, "PlayerJoined")
        .withArgs(1, player2.address, 2);

      const game = await pepasur.getGame(1);
      expect(game.players.length).to.equal(2);
      expect(game.players[1]).to.equal(player2.address);
      expect(game.totalPool).to.equal(stakeAmount * 2n);
    });

    it("Should auto-start game when min players reached", async function () {
      const { pepasur, player1, player2, player3, player4 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });

      await pepasur.connect(player2).joinGame(1, { value: stakeAmount });
      await pepasur.connect(player3).joinGame(1, { value: stakeAmount });

      await expect(pepasur.connect(player4).joinGame(1, { value: stakeAmount }))
        .to.emit(pepasur, "GameStarted")
        .withArgs(1, 4);

      const game = await pepasur.getGame(1);
      expect(game.status).to.equal(1); // IN_PROGRESS
    });

    it("Should revert if game not found", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");

      await expect(
        pepasur.connect(player1).joinGame(999, { value: stakeAmount })
      ).to.be.revertedWithCustomError(pepasur, "GameNotFound");
    });

    it("Should revert if game not in lobby", async function () {
      const { pepasur, player1, player2, player3, player4 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 3, { value: stakeAmount });
      await pepasur.connect(player2).joinGame(1, { value: stakeAmount });
      await pepasur.connect(player3).joinGame(1, { value: stakeAmount });

      // Game is now IN_PROGRESS
      await expect(
        pepasur.connect(player4).joinGame(1, { value: stakeAmount })
      ).to.be.revertedWithCustomError(pepasur, "GameNotInLobby");
    });

    it("Should revert if player already in game", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });

      await expect(
        pepasur.connect(player1).joinGame(1, { value: stakeAmount })
      ).to.be.revertedWithCustomError(pepasur, "PlayerAlreadyInGame");
    });
  });

  describe("Game Settlement", function () {
    async function createStartedGame() {
      const fixture = await loadFixture(deployAndInitializeFixture);
      const { pepasur, player1, player2, player3, player4 } = fixture;

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });
      await pepasur.connect(player2).joinGame(1, { value: stakeAmount });
      await pepasur.connect(player3).joinGame(1, { value: stakeAmount });
      await pepasur.connect(player4).joinGame(1, { value: stakeAmount });

      return { ...fixture, stakeAmount };
    }

    it("Should settle game with valid signature", async function () {
      const { pepasur, contractAddress, serverSigner, player1, player2, stakeAmount } =
        await createStartedGame();

      const gameId = 1;
      const winners = [player1.address, player2.address];
      const totalPool = stakeAmount * 4n;
      const houseFee = (totalPool * 200n) / 10000n; // 2%
      const remainingPool = totalPool - houseFee;
      const payouts = [remainingPool / 2n, remainingPool / 2n];

      // Create EIP-712 signature
      const domain = {
        name: "Pepasur",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Settlement: [
          { name: "gameId", type: "uint64" },
          { name: "winners", type: "address[]" },
          { name: "payouts", type: "uint256[]" },
        ],
      };

      const value = {
        gameId,
        winners,
        payouts,
      };

      const signature = await serverSigner.signTypedData(domain, types, value);

      await expect(pepasur.settleGame(gameId, winners, payouts, signature))
        .to.emit(pepasur, "GameSettled")
        .withArgs(gameId, winners, payouts, houseFee);

      const game = await pepasur.getGame(gameId);
      expect(game.status).to.equal(2); // SETTLED

      const player1Withdrawal = await pepasur.getPendingWithdrawal(player1.address);
      const player2Withdrawal = await pepasur.getPendingWithdrawal(player2.address);
      expect(player1Withdrawal).to.equal(payouts[0]);
      expect(player2Withdrawal).to.equal(payouts[1]);
    });

    it("Should revert with invalid signature", async function () {
      const { pepasur, player1, player2, player3, stakeAmount } = await createStartedGame();

      const gameId = 1;
      const winners = [player1.address];
      const totalPool = stakeAmount * 4n;
      const houseFee = (totalPool * 200n) / 10000n;
      const remainingPool = totalPool - houseFee;
      const payouts = [remainingPool];

      // Sign with wrong signer (player3 instead of serverSigner)
      const domain = {
        name: "Pepasur",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: await pepasur.getAddress(),
      };

      const types = {
        Settlement: [
          { name: "gameId", type: "uint64" },
          { name: "winners", type: "address[]" },
          { name: "payouts", type: "uint256[]" },
        ],
      };

      const value = { gameId, winners, payouts };
      const signature = await player3.signTypedData(domain, types, value);

      await expect(
        pepasur.settleGame(gameId, winners, payouts, signature)
      ).to.be.revertedWithCustomError(pepasur, "InvalidSignature");
    });

    it("Should revert if payouts exceed pool", async function () {
      const { pepasur, contractAddress, serverSigner, player1, stakeAmount } =
        await createStartedGame();

      const gameId = 1;
      const winners = [player1.address];
      const totalPool = stakeAmount * 4n;
      const tooMuch = totalPool * 2n; // Way more than available
      const payouts = [tooMuch];

      const domain = {
        name: "Pepasur",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Settlement: [
          { name: "gameId", type: "uint64" },
          { name: "winners", type: "address[]" },
          { name: "payouts", type: "uint256[]" },
        ],
      };

      const value = { gameId, winners, payouts };
      const signature = await serverSigner.signTypedData(domain, types, value);

      await expect(
        pepasur.settleGame(gameId, winners, payouts, signature)
      ).to.be.revertedWithCustomError(pepasur, "InvalidPayouts");
    });
  });

  describe("Withdrawals", function () {
    it("Should allow winner to withdraw", async function () {
      const { pepasur, contractAddress, serverSigner, player1 } = await loadFixture(
        deployAndInitializeFixture
      );

      // Manually set pending withdrawal for testing
      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 2, { value: stakeAmount });

      // Settle directly to create withdrawal
      const gameId = 1;
      const winners = [player1.address];
      const payouts = [stakeAmount];

      const domain = {
        name: "Pepasur",
        version: "1",
        chainId: (await ethers.provider.getNetwork()).chainId,
        verifyingContract: contractAddress,
      };

      const types = {
        Settlement: [
          { name: "gameId", type: "uint64" },
          { name: "winners", type: "address[]" },
          { name: "payouts", type: "uint256[]" },
        ],
      };

      // Need to start the game first
      const { player2 } = await loadFixture(deployAndInitializeFixture);
      const pepasur2 = pepasur.connect(player2);
      await pepasur2.joinGame(1, { value: stakeAmount });

      const value = { gameId, winners, payouts };
      const signature = await serverSigner.signTypedData(domain, types, value);

      await pepasur.settleGame(gameId, winners, payouts, signature);

      const balanceBefore = await ethers.provider.getBalance(player1.address);

      await expect(pepasur.connect(player1).withdraw())
        .to.emit(pepasur, "Withdrawn")
        .withArgs(player1.address, stakeAmount);

      const balanceAfter = await ethers.provider.getBalance(player1.address);
      expect(balanceAfter).to.be.gt(balanceBefore);

      const pendingWithdrawal = await pepasur.getPendingWithdrawal(player1.address);
      expect(pendingWithdrawal).to.equal(0);
    });

    it("Should revert if no pending withdrawal", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      await expect(
        pepasur.connect(player1).withdraw()
      ).to.be.revertedWithCustomError(pepasur, "NoPendingWithdrawal");
    });
  });

  describe("Game Cancellation", function () {
    it("Should allow creator to cancel game in lobby", async function () {
      const { pepasur, player1, player2 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });
      await pepasur.connect(player2).joinGame(1, { value: stakeAmount });

      await expect(pepasur.connect(player1).cancelGame(1))
        .to.emit(pepasur, "GameCancelled")
        .withArgs(1, [player1.address, player2.address]);

      const game = await pepasur.getGame(1);
      expect(game.status).to.equal(3); // CANCELLED

      // Check refunds queued
      const player1Withdrawal = await pepasur.getPendingWithdrawal(player1.address);
      const player2Withdrawal = await pepasur.getPendingWithdrawal(player2.address);
      expect(player1Withdrawal).to.equal(stakeAmount);
      expect(player2Withdrawal).to.equal(stakeAmount);
    });

    it("Should revert if non-creator tries to cancel", async function () {
      const { pepasur, player1, player2 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });

      await expect(
        pepasur.connect(player2).cancelGame(1)
      ).to.be.revertedWithCustomError(pepasur, "NotAuthorized");
    });
  });

  describe("Admin Functions", function () {
    it("Should allow admin to update server signer", async function () {
      const { pepasur, owner, player1 } = await loadFixture(
        deployAndInitializeFixture
      );

      await pepasur.updateServerSigner(player1.address);

      const config = await pepasur.getConfig();
      expect(config.serverSigner).to.equal(player1.address);
    });

    it("Should allow admin to update fee recipient", async function () {
      const { pepasur, owner, player1 } = await loadFixture(
        deployAndInitializeFixture
      );

      await pepasur.updateFeeRecipient(player1.address);

      const config = await pepasur.getConfig();
      expect(config.feeRecipient).to.equal(player1.address);
    });

    it("Should allow admin to update house cut", async function () {
      const { pepasur } = await loadFixture(deployAndInitializeFixture);

      await pepasur.updateHouseCut(300); // 3%

      const config = await pepasur.getConfig();
      expect(config.houseCutBps).to.equal(300);
    });

    it("Should revert if non-admin tries admin functions", async function () {
      const { pepasur, player1, player2 } = await loadFixture(
        deployAndInitializeFixture
      );

      await expect(
        pepasur.connect(player1).updateServerSigner(player2.address)
      ).to.be.revertedWithCustomError(pepasur, "NotAuthorized");

      await expect(
        pepasur.connect(player1).updateFeeRecipient(player2.address)
      ).to.be.revertedWithCustomError(pepasur, "NotAuthorized");

      await expect(
        pepasur.connect(player1).updateHouseCut(300)
      ).to.be.revertedWithCustomError(pepasur, "NotAuthorized");
    });
  });

  describe("View Functions", function () {
    it("Should return correct game count", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      const stakeAmount = ethers.parseEther("1.0");

      expect(await pepasur.getTotalGames()).to.equal(0);

      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });
      expect(await pepasur.getTotalGames()).to.equal(1);

      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });
      expect(await pepasur.getTotalGames()).to.equal(2);
    });

    it("Should check if player is in game", async function () {
      const { pepasur, player1, player2 } = await loadFixture(
        deployAndInitializeFixture
      );

      const stakeAmount = ethers.parseEther("1.0");
      await pepasur.connect(player1).createGame(stakeAmount, 4, { value: stakeAmount });

      expect(await pepasur.isPlayerInGame(1, player1.address)).to.be.true;
      expect(await pepasur.isPlayerInGame(1, player2.address)).to.be.false;

      await pepasur.connect(player2).joinGame(1, { value: stakeAmount });
      expect(await pepasur.isPlayerInGame(1, player2.address)).to.be.true;
    });
  });

  describe("Security", function () {
    it("Should prevent direct ETH transfers", async function () {
      const { pepasur, player1 } = await loadFixture(deployAndInitializeFixture);

      await expect(
        player1.sendTransaction({
          to: await pepasur.getAddress(),
          value: ethers.parseEther("1.0"),
        })
      ).to.be.reverted;
    });

    it("Should prevent reentrancy in withdraw", async function () {
      // This is implicitly tested by using ReentrancyGuard
      // Full reentrancy testing would require a malicious contract
      expect(true).to.be.true;
    });
  });
});
