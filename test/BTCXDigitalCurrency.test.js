const { expect } = require("chai");
const { ethers } = require("hardhat");
const { loadFixture, time } = require("@nomicfoundation/hardhat-network-helpers");

/**
 * @title BTCXDigitalCurrency Test Suite
 * @notice Comprehensive test coverage for BTCX Digital Currency token
 * @dev Tests cover all ERC20 functionality, ERC20Permit, edge cases, and security scenarios
 */
describe("BTCXDigitalCurrency", function () {
  // Constants matching contract
  const TOKEN_NAME = "BTCX Digital Currency";
  const TOKEN_SYMBOL = "BTCX";
  const DECIMALS = 18;
  const TOTAL_SUPPLY = ethers.parseUnits("1200000000", DECIMALS); // 1.2 billion tokens

  /**
   * @notice Deployment fixture for consistent test setup
   */
  async function deployBTCXFixture() {
    const [owner, recipient, alice, bob, charlie, spender] = await ethers.getSigners();

    const BTCXDigitalCurrency = await ethers.getContractFactory("BTCXDigitalCurrency");
    const btcx = await BTCXDigitalCurrency.deploy(recipient.address);
    await btcx.waitForDeployment();

    return { btcx, owner, recipient, alice, bob, charlie, spender };
  }

  /**
   * @notice Helper to get EIP-712 domain separator components
   */
  async function getDomainSeparator(btcx) {
    const [, name, version, chainId, verifyingContract] = await btcx.eip712Domain();
    return { name, version, chainId, verifyingContract };
  }

  /**
   * @notice Helper to create permit signature
   */
  async function createPermitSignature(btcx, owner, spender, value, deadline) {
    const domain = await getDomainSeparator(btcx);
    const nonce = await btcx.nonces(owner.address);

    const types = {
      Permit: [
        { name: "owner", type: "address" },
        { name: "spender", type: "address" },
        { name: "value", type: "uint256" },
        { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" },
      ],
    };

    const message = {
      owner: owner.address,
      spender: spender.address,
      value: value,
      nonce: nonce,
      deadline: deadline,
    };

    const signature = await owner.signTypedData(
      {
        name: domain.name,
        version: domain.version,
        chainId: domain.chainId,
        verifyingContract: domain.verifyingContract,
      },
      types,
      message
    );

    return ethers.Signature.from(signature);
  }

  // ============================================================
  // DEPLOYMENT TESTS
  // ============================================================
  describe("Deployment", function () {
    it("Should deploy with correct name", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.name()).to.equal(TOKEN_NAME);
    });

    it("Should deploy with correct symbol", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should deploy with 18 decimals", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.decimals()).to.equal(DECIMALS);
    });

    it("Should mint total supply to recipient", async function () {
      const { btcx, recipient } = await loadFixture(deployBTCXFixture);
      expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should set correct total supply", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should emit InitialMint event on deployment", async function () {
      const [, , , , , , newRecipient] = await ethers.getSigners();
      const BTCXDigitalCurrency = await ethers.getContractFactory("BTCXDigitalCurrency");
      
      const deployTx = await BTCXDigitalCurrency.deploy(newRecipient.address);
      await expect(deployTx.deploymentTransaction())
        .to.emit(deployTx, "InitialMint")
        .withArgs(newRecipient.address, TOTAL_SUPPLY);
    });

    it("Should emit Transfer event from zero address on deployment", async function () {
      const [, newRecipient] = await ethers.getSigners();
      const BTCXDigitalCurrency = await ethers.getContractFactory("BTCXDigitalCurrency");
      
      const deployTx = await BTCXDigitalCurrency.deploy(newRecipient.address);
      await expect(deployTx.deploymentTransaction())
        .to.emit(deployTx, "Transfer")
        .withArgs(ethers.ZeroAddress, newRecipient.address, TOTAL_SUPPLY);
    });

    it("Should deploy to different recipients correctly", async function () {
      const [, , alice, bob] = await ethers.getSigners();
      const BTCXDigitalCurrency = await ethers.getContractFactory("BTCXDigitalCurrency");
      
      const btcxAlice = await BTCXDigitalCurrency.deploy(alice.address);
      const btcxBob = await BTCXDigitalCurrency.deploy(bob.address);
      
      expect(await btcxAlice.balanceOf(alice.address)).to.equal(TOTAL_SUPPLY);
      expect(await btcxBob.balanceOf(bob.address)).to.equal(TOTAL_SUPPLY);
    });
  });

  // ============================================================
  // ERC20 BASIC FUNCTIONALITY TESTS
  // ============================================================
  describe("ERC20 Basic Functionality", function () {
    describe("balanceOf", function () {
      it("Should return correct balance for recipient", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY);
      });

      it("Should return zero for accounts with no tokens", async function () {
        const { btcx, alice } = await loadFixture(deployBTCXFixture);
        expect(await btcx.balanceOf(alice.address)).to.equal(0);
      });

      it("Should return zero for zero address", async function () {
        const { btcx } = await loadFixture(deployBTCXFixture);
        expect(await btcx.balanceOf(ethers.ZeroAddress)).to.equal(0);
      });
    });

    describe("totalSupply", function () {
      it("Should return fixed total supply", async function () {
        const { btcx } = await loadFixture(deployBTCXFixture);
        expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY);
      });

      it("Should remain constant after transfers", async function () {
        const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);
        const transferAmount = ethers.parseUnits("1000", DECIMALS);
        
        await btcx.connect(recipient).transfer(alice.address, transferAmount);
        expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY);
      });
    });
  });

  // ============================================================
  // TRANSFER TESTS
  // ============================================================
  describe("Transfer", function () {
    it("Should transfer tokens between accounts", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);
      const transferAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).transfer(alice.address, transferAmount);

      expect(await btcx.balanceOf(alice.address)).to.equal(transferAmount);
      expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - transferAmount);
    });

    it("Should emit Transfer event", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);
      const transferAmount = ethers.parseUnits("1000", DECIMALS);

      await expect(btcx.connect(recipient).transfer(alice.address, transferAmount))
        .to.emit(btcx, "Transfer")
        .withArgs(recipient.address, alice.address, transferAmount);
    });

    it("Should transfer zero tokens", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);

      await expect(btcx.connect(recipient).transfer(alice.address, 0))
        .to.emit(btcx, "Transfer")
        .withArgs(recipient.address, alice.address, 0);
    });

    it("Should transfer entire balance", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);

      await btcx.connect(recipient).transfer(alice.address, TOTAL_SUPPLY);

      expect(await btcx.balanceOf(recipient.address)).to.equal(0);
      expect(await btcx.balanceOf(alice.address)).to.equal(TOTAL_SUPPLY);
    });

    it("Should fail transfer to zero address", async function () {
      const { btcx, recipient } = await loadFixture(deployBTCXFixture);
      const transferAmount = ethers.parseUnits("1000", DECIMALS);

      await expect(btcx.connect(recipient).transfer(ethers.ZeroAddress, transferAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InvalidReceiver")
        .withArgs(ethers.ZeroAddress);
    });

    it("Should fail transfer exceeding balance", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);
      const excessAmount = TOTAL_SUPPLY + 1n;

      await expect(btcx.connect(recipient).transfer(alice.address, excessAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
    });

    it("Should fail transfer from account with zero balance", async function () {
      const { btcx, alice, bob } = await loadFixture(deployBTCXFixture);
      const transferAmount = ethers.parseUnits("1", DECIMALS);

      await expect(btcx.connect(alice).transfer(bob.address, transferAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
    });

    it("Should handle multiple sequential transfers", async function () {
      const { btcx, recipient, alice, bob, charlie } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("100", DECIMALS);

      await btcx.connect(recipient).transfer(alice.address, amount);
      await btcx.connect(alice).transfer(bob.address, amount);
      await btcx.connect(bob).transfer(charlie.address, amount);

      expect(await btcx.balanceOf(charlie.address)).to.equal(amount);
      expect(await btcx.balanceOf(bob.address)).to.equal(0);
      expect(await btcx.balanceOf(alice.address)).to.equal(0);
    });

    it("Should handle self-transfer", async function () {
      const { btcx, recipient } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("100", DECIMALS);

      await btcx.connect(recipient).transfer(recipient.address, amount);

      expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY);
    });
  });

  // ============================================================
  // APPROVAL TESTS
  // ============================================================
  describe("Approval", function () {
    it("Should approve spender", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(approvalAmount);
    });

    it("Should emit Approval event", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await expect(btcx.connect(recipient).approve(spender.address, approvalAmount))
        .to.emit(btcx, "Approval")
        .withArgs(recipient.address, spender.address, approvalAmount);
    });

    it("Should approve zero amount", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);

      await btcx.connect(recipient).approve(spender.address, 0);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
    });

    it("Should approve max uint256", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const maxUint256 = ethers.MaxUint256;

      await btcx.connect(recipient).approve(spender.address, maxUint256);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(maxUint256);
    });

    it("Should overwrite previous approval", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const firstAmount = ethers.parseUnits("1000", DECIMALS);
      const secondAmount = ethers.parseUnits("500", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, firstAmount);
      await btcx.connect(recipient).approve(spender.address, secondAmount);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(secondAmount);
    });

    it("Should fail approval to zero address", async function () {
      const { btcx, recipient } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await expect(btcx.connect(recipient).approve(ethers.ZeroAddress, approvalAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InvalidSpender")
        .withArgs(ethers.ZeroAddress);
    });

    it("Should allow approval from account with zero balance", async function () {
      const { btcx, alice, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(alice).approve(spender.address, approvalAmount);

      expect(await btcx.allowance(alice.address, spender.address)).to.equal(approvalAmount);
    });
  });

  // ============================================================
  // TRANSFERFROM TESTS
  // ============================================================
  describe("TransferFrom", function () {
    it("Should transfer tokens using allowance", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);
      const transferAmount = ethers.parseUnits("500", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, transferAmount);

      expect(await btcx.balanceOf(alice.address)).to.equal(transferAmount);
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(approvalAmount - transferAmount);
    });

    it("Should emit Transfer event on transferFrom", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);
      const transferAmount = ethers.parseUnits("500", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);

      await expect(btcx.connect(spender).transferFrom(recipient.address, alice.address, transferAmount))
        .to.emit(btcx, "Transfer")
        .withArgs(recipient.address, alice.address, transferAmount);
    });

    it("Should not decrease allowance when max uint256 approved", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const maxUint256 = ethers.MaxUint256;
      const transferAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, maxUint256);
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, transferAmount);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(maxUint256);
    });

    it("Should fail transferFrom exceeding allowance", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("100", DECIMALS);
      const transferAmount = ethers.parseUnits("200", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);

      await expect(btcx.connect(spender).transferFrom(recipient.address, alice.address, transferAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InsufficientAllowance");
    });

    it("Should fail transferFrom exceeding balance", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const excessAmount = TOTAL_SUPPLY + 1n;

      await btcx.connect(recipient).approve(spender.address, excessAmount);

      await expect(btcx.connect(spender).transferFrom(recipient.address, alice.address, excessAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
    });

    it("Should fail transferFrom to zero address", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);

      await expect(btcx.connect(spender).transferFrom(recipient.address, ethers.ZeroAddress, approvalAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InvalidReceiver");
    });

    it("Should fail transferFrom without approval", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const transferAmount = ethers.parseUnits("100", DECIMALS);

      await expect(btcx.connect(spender).transferFrom(recipient.address, alice.address, transferAmount))
        .to.be.revertedWithCustomError(btcx, "ERC20InsufficientAllowance");
    });

    it("Should handle transferFrom with exact allowance", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, amount);
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, amount);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
      expect(await btcx.balanceOf(alice.address)).to.equal(amount);
    });

    it("Should handle zero amount transferFrom", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const approvalAmount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, approvalAmount);

      await expect(btcx.connect(spender).transferFrom(recipient.address, alice.address, 0))
        .to.emit(btcx, "Transfer")
        .withArgs(recipient.address, alice.address, 0);
    });
  });

  // ============================================================
  // ERC20 PERMIT TESTS
  // ============================================================
  describe("ERC20 Permit", function () {
    it("Should have correct EIP-712 domain", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      const domain = await getDomainSeparator(btcx);

      expect(domain.name).to.equal(TOKEN_NAME);
      expect(domain.version).to.equal("1");
    });

    it("Should return correct DOMAIN_SEPARATOR", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      const domainSeparator = await btcx.DOMAIN_SEPARATOR();
      
      expect(domainSeparator).to.be.properHex(64);
    });

    it("Should start with nonce 0 for all accounts", async function () {
      const { btcx, recipient, alice, bob } = await loadFixture(deployBTCXFixture);

      expect(await btcx.nonces(recipient.address)).to.equal(0);
      expect(await btcx.nonces(alice.address)).to.equal(0);
      expect(await btcx.nonces(bob.address)).to.equal(0);
    });

    it("Should permit approval via signature", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600; // 1 hour from now

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);

      await btcx.permit(
        recipient.address,
        spender.address,
        value,
        deadline,
        sig.v,
        sig.r,
        sig.s
      );

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(value);
    });

    it("Should emit Approval event on permit", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);

      await expect(btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s))
        .to.emit(btcx, "Approval")
        .withArgs(recipient.address, spender.address, value);
    });

    it("Should increment nonce after permit", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      expect(await btcx.nonces(recipient.address)).to.equal(0);

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);
      await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

      expect(await btcx.nonces(recipient.address)).to.equal(1);
    });

    it("Should fail permit with expired deadline", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) - 1; // Already expired

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);

      await expect(btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWithCustomError(btcx, "ERC2612ExpiredSignature");
    });

    it("Should fail permit with invalid signature", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      // Sign with alice but try to permit for recipient
      const sig = await createPermitSignature(btcx, alice, spender, value, deadline);

      await expect(btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWithCustomError(btcx, "ERC2612InvalidSigner");
    });

    it("Should fail permit with reused nonce (replay attack)", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);
      
      // First permit succeeds
      await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

      // Second permit with same signature fails (nonce already incremented)
      await expect(btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s))
        .to.be.revertedWithCustomError(btcx, "ERC2612InvalidSigner");
    });

    it("Should allow permit to update existing allowance", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value1 = ethers.parseUnits("1000", DECIMALS);
      const value2 = ethers.parseUnits("2000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      // First permit
      const sig1 = await createPermitSignature(btcx, recipient, spender, value1, deadline);
      await btcx.permit(recipient.address, spender.address, value1, deadline, sig1.v, sig1.r, sig1.s);
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(value1);

      // Second permit with new value
      const sig2 = await createPermitSignature(btcx, recipient, spender, value2, deadline);
      await btcx.permit(recipient.address, spender.address, value2, deadline, sig2.v, sig2.r, sig2.s);
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(value2);
    });

    it("Should work with max uint256 deadline", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = ethers.MaxUint256;

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);

      await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(value);
    });

    it("Should permit zero value approval", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const value = 0n;
      const deadline = (await time.latest()) + 3600;

      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);

      await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
    });
  });

  // ============================================================
  // INTEGRATION TESTS
  // ============================================================
  describe("Integration Tests", function () {
    it("Should allow permit followed by transferFrom", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const value = ethers.parseUnits("1000", DECIMALS);
      const deadline = (await time.latest()) + 3600;

      // Permit
      const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);
      await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

      // TransferFrom
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, value);

      expect(await btcx.balanceOf(alice.address)).to.equal(value);
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
    });

    it("Should handle complex transfer chain", async function () {
      const { btcx, recipient, alice, bob, charlie } = await loadFixture(deployBTCXFixture);
      const amount1 = ethers.parseUnits("500000000", DECIMALS); // 500M
      const amount2 = ethers.parseUnits("250000000", DECIMALS); // 250M
      const amount3 = ethers.parseUnits("125000000", DECIMALS); // 125M

      await btcx.connect(recipient).transfer(alice.address, amount1);
      await btcx.connect(alice).transfer(bob.address, amount2);
      await btcx.connect(bob).transfer(charlie.address, amount3);

      expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - amount1);
      expect(await btcx.balanceOf(alice.address)).to.equal(amount1 - amount2);
      expect(await btcx.balanceOf(bob.address)).to.equal(amount2 - amount3);
      expect(await btcx.balanceOf(charlie.address)).to.equal(amount3);
      expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should handle multiple approvals and transferFroms", async function () {
      const { btcx, recipient, alice, bob, spender } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("100", DECIMALS);

      // Approve spender
      await btcx.connect(recipient).approve(spender.address, amount * 3n);

      // Multiple transferFroms
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, amount);
      await btcx.connect(spender).transferFrom(recipient.address, bob.address, amount);
      await btcx.connect(spender).transferFrom(recipient.address, alice.address, amount);

      expect(await btcx.balanceOf(alice.address)).to.equal(amount * 2n);
      expect(await btcx.balanceOf(bob.address)).to.equal(amount);
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
    });
  });

  // ============================================================
  // EDGE CASES AND SECURITY TESTS
  // ============================================================
  describe("Edge Cases and Security", function () {
    it("Should handle very small amounts (1 wei)", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);

      await btcx.connect(recipient).transfer(alice.address, 1n);

      expect(await btcx.balanceOf(alice.address)).to.equal(1n);
    });

    it("Should handle transfers at supply boundary", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);

      // Transfer all but 1 wei
      await btcx.connect(recipient).transfer(alice.address, TOTAL_SUPPLY - 1n);

      expect(await btcx.balanceOf(recipient.address)).to.equal(1n);
      expect(await btcx.balanceOf(alice.address)).to.equal(TOTAL_SUPPLY - 1n);
    });

    it("Should maintain invariant: sum of balances equals total supply", async function () {
      const { btcx, recipient, alice, bob, charlie } = await loadFixture(deployBTCXFixture);
      
      // Perform various transfers
      await btcx.connect(recipient).transfer(alice.address, ethers.parseUnits("100000000", DECIMALS));
      await btcx.connect(recipient).transfer(bob.address, ethers.parseUnits("200000000", DECIMALS));
      await btcx.connect(alice).transfer(charlie.address, ethers.parseUnits("50000000", DECIMALS));
      await btcx.connect(bob).transfer(alice.address, ethers.parseUnits("25000000", DECIMALS));

      // Sum all balances
      const balanceRecipient = await btcx.balanceOf(recipient.address);
      const balanceAlice = await btcx.balanceOf(alice.address);
      const balanceBob = await btcx.balanceOf(bob.address);
      const balanceCharlie = await btcx.balanceOf(charlie.address);

      const totalBalances = balanceRecipient + balanceAlice + balanceBob + balanceCharlie;

      expect(totalBalances).to.equal(TOTAL_SUPPLY);
    });

    it("Should not allow approval race condition exploitation", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const initialApproval = ethers.parseUnits("100", DECIMALS);
      const newApproval = ethers.parseUnits("50", DECIMALS);

      // Initial approval
      await btcx.connect(recipient).approve(spender.address, initialApproval);

      // Change approval (potential race condition in older implementations)
      await btcx.connect(recipient).approve(spender.address, newApproval);

      // Verify only new approval is valid
      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(newApproval);
    });

    it("Should handle contract as recipient", async function () {
      const { btcx, recipient } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      // Deploy a simple contract to receive tokens
      const contractAddress = await btcx.getAddress();

      // Transfer to the token contract itself (edge case)
      await btcx.connect(recipient).transfer(contractAddress, amount);

      expect(await btcx.balanceOf(contractAddress)).to.equal(amount);
    });
  });

  // ============================================================
  // GAS OPTIMIZATION TESTS
  // ============================================================
  describe("Gas Optimization", function () {
    it("Should have reasonable gas cost for transfer", async function () {
      const { btcx, recipient, alice } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      const tx = await btcx.connect(recipient).transfer(alice.address, amount);
      const receipt = await tx.wait();

      // ERC20 transfer should be under 65000 gas
      expect(receipt.gasUsed).to.be.lessThan(65000n);
    });

    it("Should have reasonable gas cost for approve", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      const tx = await btcx.connect(recipient).approve(spender.address, amount);
      const receipt = await tx.wait();

      // ERC20 approve should be under 50000 gas
      expect(receipt.gasUsed).to.be.lessThan(50000n);
    });

    it("Should have reasonable gas cost for transferFrom", async function () {
      const { btcx, recipient, alice, spender } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      await btcx.connect(recipient).approve(spender.address, amount);

      const tx = await btcx.connect(spender).transferFrom(recipient.address, alice.address, amount);
      const receipt = await tx.wait();

      // ERC20 transferFrom should be under 70000 gas
      expect(receipt.gasUsed).to.be.lessThan(70000n);
    });
  });

  // ============================================================
  // VIEW FUNCTION TESTS
  // ============================================================
  describe("View Functions", function () {
    it("Should return correct name", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.name()).to.equal(TOKEN_NAME);
    });

    it("Should return correct symbol", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.symbol()).to.equal(TOKEN_SYMBOL);
    });

    it("Should return correct decimals", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.decimals()).to.equal(DECIMALS);
    });

    it("Should return correct totalSupply", async function () {
      const { btcx } = await loadFixture(deployBTCXFixture);
      expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY);
    });

    it("Should return correct allowance", async function () {
      const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
      const amount = ethers.parseUnits("1000", DECIMALS);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);

      await btcx.connect(recipient).approve(spender.address, amount);

      expect(await btcx.allowance(recipient.address, spender.address)).to.equal(amount);
    });
  });

  // ============================================================
  // ERC20 BURNABLE TESTS
  // ============================================================
  describe("ERC20 Burnable", function () {
    describe("burn", function () {
      it("Should burn tokens from caller's balance", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        const balanceBefore = await btcx.balanceOf(recipient.address);
        await btcx.connect(recipient).burn(burnAmount);
        const balanceAfter = await btcx.balanceOf(recipient.address);

        expect(balanceAfter).to.equal(balanceBefore - burnAmount);
      });

      it("Should reduce total supply when burning", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        const totalSupplyBefore = await btcx.totalSupply();
        await btcx.connect(recipient).burn(burnAmount);
        const totalSupplyAfter = await btcx.totalSupply();

        expect(totalSupplyAfter).to.equal(totalSupplyBefore - burnAmount);
      });

      it("Should emit Transfer event to zero address on burn", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        await expect(btcx.connect(recipient).burn(burnAmount))
          .to.emit(btcx, "Transfer")
          .withArgs(recipient.address, ethers.ZeroAddress, burnAmount);
      });

      it("Should burn zero tokens", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);

        await expect(btcx.connect(recipient).burn(0))
          .to.emit(btcx, "Transfer")
          .withArgs(recipient.address, ethers.ZeroAddress, 0);
      });

      it("Should burn entire balance", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);

        await btcx.connect(recipient).burn(TOTAL_SUPPLY);

        expect(await btcx.balanceOf(recipient.address)).to.equal(0);
        expect(await btcx.totalSupply()).to.equal(0);
      });

      it("Should fail burn exceeding balance", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const excessAmount = TOTAL_SUPPLY + 1n;

        await expect(btcx.connect(recipient).burn(excessAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
      });

      it("Should fail burn from account with zero balance", async function () {
        const { btcx, alice } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1", DECIMALS);

        await expect(btcx.connect(alice).burn(burnAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
      });

      it("Should handle multiple sequential burns", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("100", DECIMALS);

        await btcx.connect(recipient).burn(burnAmount);
        await btcx.connect(recipient).burn(burnAmount);
        await btcx.connect(recipient).burn(burnAmount);

        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - burnAmount * 3n);
        expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY - burnAmount * 3n);
      });

      it("Should have reasonable gas cost for burn", async function () {
        const { btcx, recipient } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        const tx = await btcx.connect(recipient).burn(burnAmount);
        const receipt = await tx.wait();

        // Burn should be under 50000 gas
        expect(receipt.gasUsed).to.be.lessThan(50000n);
      });
    });

    describe("burnFrom", function () {
      it("Should burn tokens from approved account", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const approvalAmount = ethers.parseUnits("1000", DECIMALS);
        const burnAmount = ethers.parseUnits("500", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, approvalAmount);
        await btcx.connect(spender).burnFrom(recipient.address, burnAmount);

        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - burnAmount);
        expect(await btcx.allowance(recipient.address, spender.address)).to.equal(approvalAmount - burnAmount);
      });

      it("Should reduce total supply when using burnFrom", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, burnAmount);
        
        const totalSupplyBefore = await btcx.totalSupply();
        await btcx.connect(spender).burnFrom(recipient.address, burnAmount);
        const totalSupplyAfter = await btcx.totalSupply();

        expect(totalSupplyAfter).to.equal(totalSupplyBefore - burnAmount);
      });

      it("Should emit Transfer event to zero address on burnFrom", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, burnAmount);

        await expect(btcx.connect(spender).burnFrom(recipient.address, burnAmount))
          .to.emit(btcx, "Transfer")
          .withArgs(recipient.address, ethers.ZeroAddress, burnAmount);
      });

      it("Should not decrease allowance when max uint256 approved", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const maxUint256 = ethers.MaxUint256;
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, maxUint256);
        await btcx.connect(spender).burnFrom(recipient.address, burnAmount);

        expect(await btcx.allowance(recipient.address, spender.address)).to.equal(maxUint256);
      });

      it("Should fail burnFrom exceeding allowance", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const approvalAmount = ethers.parseUnits("100", DECIMALS);
        const burnAmount = ethers.parseUnits("200", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, approvalAmount);

        await expect(btcx.connect(spender).burnFrom(recipient.address, burnAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientAllowance");
      });

      it("Should fail burnFrom exceeding balance", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const excessAmount = TOTAL_SUPPLY + 1n;

        await btcx.connect(recipient).approve(spender.address, excessAmount);

        await expect(btcx.connect(spender).burnFrom(recipient.address, excessAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientBalance");
      });

      it("Should fail burnFrom without approval", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("100", DECIMALS);

        await expect(btcx.connect(spender).burnFrom(recipient.address, burnAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientAllowance");
      });

      it("Should handle burnFrom with exact allowance", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const amount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, amount);
        await btcx.connect(spender).burnFrom(recipient.address, amount);

        expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - amount);
      });

      it("Should handle zero amount burnFrom", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const approvalAmount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, approvalAmount);

        await expect(btcx.connect(spender).burnFrom(recipient.address, 0))
          .to.emit(btcx, "Transfer")
          .withArgs(recipient.address, ethers.ZeroAddress, 0);
      });

      it("Should have reasonable gas cost for burnFrom", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        await btcx.connect(recipient).approve(spender.address, burnAmount);

        const tx = await btcx.connect(spender).burnFrom(recipient.address, burnAmount);
        const receipt = await tx.wait();

        // BurnFrom should be under 60000 gas
        expect(receipt.gasUsed).to.be.lessThan(60000n);
      });
    });

    describe("Burn Integration", function () {
      it("Should allow permit followed by burnFrom", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const value = ethers.parseUnits("1000", DECIMALS);
        const deadline = (await time.latest()) + 3600;

        // Permit
        const sig = await createPermitSignature(btcx, recipient, spender, value, deadline);
        await btcx.permit(recipient.address, spender.address, value, deadline, sig.v, sig.r, sig.s);

        // BurnFrom
        await btcx.connect(spender).burnFrom(recipient.address, value);

        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY - value);
        expect(await btcx.allowance(recipient.address, spender.address)).to.equal(0);
        expect(await btcx.totalSupply()).to.equal(TOTAL_SUPPLY - value);
      });

      it("Should maintain invariant: sum of balances equals total supply after burns", async function () {
        const { btcx, recipient, alice, bob } = await loadFixture(deployBTCXFixture);
        
        // Distribute tokens
        await btcx.connect(recipient).transfer(alice.address, ethers.parseUnits("100000000", DECIMALS));
        await btcx.connect(recipient).transfer(bob.address, ethers.parseUnits("200000000", DECIMALS));
        
        // Burn from multiple accounts
        const burnRecipient = ethers.parseUnits("10000000", DECIMALS);
        const burnAlice = ethers.parseUnits("5000000", DECIMALS);
        const burnBob = ethers.parseUnits("20000000", DECIMALS);
        
        await btcx.connect(recipient).burn(burnRecipient);
        await btcx.connect(alice).burn(burnAlice);
        await btcx.connect(bob).burn(burnBob);

        // Sum all balances
        const balanceRecipient = await btcx.balanceOf(recipient.address);
        const balanceAlice = await btcx.balanceOf(alice.address);
        const balanceBob = await btcx.balanceOf(bob.address);

        const totalBalances = balanceRecipient + balanceAlice + balanceBob;
        const totalSupply = await btcx.totalSupply();

        expect(totalBalances).to.equal(totalSupply);
        expect(totalSupply).to.equal(TOTAL_SUPPLY - burnRecipient - burnAlice - burnBob);
      });

      it("Should not allow third party to burn without allowance", async function () {
        const { btcx, recipient, spender } = await loadFixture(deployBTCXFixture);
        const burnAmount = ethers.parseUnits("1000", DECIMALS);

        // Spender tries to burn recipient's tokens without approval
        await expect(btcx.connect(spender).burnFrom(recipient.address, burnAmount))
          .to.be.revertedWithCustomError(btcx, "ERC20InsufficientAllowance");

        // Recipient's balance should be unchanged
        expect(await btcx.balanceOf(recipient.address)).to.equal(TOTAL_SUPPLY);
      });
    });
  });
});
