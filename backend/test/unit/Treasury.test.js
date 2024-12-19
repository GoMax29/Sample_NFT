const { expect } = require("chai");
const { ethers } = require("hardhat");
const {
  loadFixture,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

describe("Treasury Contract", function () {
  async function deployTreasuryFixture() {
    const [admin, treasurer, ceo, newTreasurer, user1, user2] =
      await ethers.getSigners();

    const Treasury = await ethers.getContractFactory("Treasury");
    const treasury = await Treasury.deploy(admin.address, treasurer.address);

    return { treasury, admin, treasurer, ceo, newTreasurer, user1, user2 };
  }

  describe("Initialization", function () {
    it("Should set the right admin and treasurer", async function () {
      const { treasury, admin, treasurer } = await loadFixture(
        deployTreasuryFixture
      );

      expect(
        await treasury.hasRole(
          await treasury.DEFAULT_ADMIN_ROLE(),
          admin.address
        )
      ).to.be.true;
      expect(
        await treasury.hasRole(
          await treasury.TREASURER_ROLE(),
          treasurer.address
        )
      ).to.be.true;
    });
  });

  describe("Role Management", function () {
    it("Should allow admin to assign new treasurer", async function () {
      const { treasury, admin, newTreasurer } = await loadFixture(
        deployTreasuryFixture
      );

      await treasury.connect(admin).assignTreasurer(newTreasurer.address);
      expect(
        await treasury.hasRole(
          await treasury.TREASURER_ROLE(),
          newTreasurer.address
        )
      ).to.be.true;
    });

    it("Should allow admin to grant CEO role", async function () {
      const { treasury, admin, ceo } = await loadFixture(deployTreasuryFixture);

      await treasury
        .connect(admin)
        .grantRole(await treasury.CEO_ROLE(), ceo.address);
      expect(await treasury.hasRole(await treasury.CEO_ROLE(), ceo.address)).to
        .be.true;
    });

    it("Should not allow non-admin to assign treasurer", async function () {
      const { treasury, treasurer, newTreasurer } = await loadFixture(
        deployTreasuryFixture
      );

      await expect(
        treasury.connect(treasurer).assignTreasurer(newTreasurer.address)
      ).to.be.revertedWith("Only admin can assign treasurer");
    });
  });

  describe("Withdrawal Management", function () {
    it("Should allow proposing a withdrawal", async function () {
      const { treasury, treasurer, user1 } = await loadFixture(
        deployTreasuryFixture
      );
      const amount = ethers.parseEther("1.0");

      await treasurer.sendTransaction({
        to: treasury.getAddress(),
        value: amount,
      });

      await treasury
        .connect(treasurer)
        .proposeWithdrawal(user1.address, amount, "Test withdrawal");

      // Check that the proposal was created
      const pendingApproval = await treasury.pendingApproval();
      expect(pendingApproval.to).to.equal(user1.address);
      expect(pendingApproval.amount).to.equal(amount);
    });

    it("Should require both CEO and treasurer approval for withdrawal", async function () {
      const { treasury, admin, treasurer, ceo, user1 } = await loadFixture(
        deployTreasuryFixture
      );
      const amount = ethers.parseEther("1.0");

      // Fund the treasury
      await treasurer.sendTransaction({
        to: treasury.getAddress(),
        value: amount,
      });

      // Grant CEO role using grantRole
      await treasury
        .connect(admin)
        .grantRole(await treasury.CEO_ROLE(), ceo.address);

      // Propose withdrawal
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(user1.address, amount, "Test withdrawal");

      // Approve by treasurer
      await treasury.connect(treasurer).approveWithdrawal();

      // Approve by CEO
      await treasury.connect(ceo).approveWithdrawal();

      // Check that the withdrawal was executed (Treasury balance should be 0)
      const balance = await ethers.provider.getBalance(treasury.getAddress());
      expect(balance).to.equal(0);
    });
  });

  describe("Limits and Restrictions", function () {
    it("Should enforce maximum withdrawal amount", async function () {
      const { treasury, treasurer, user1 } = await loadFixture(
        deployTreasuryFixture
      );
      const amount = ethers.parseEther("11.0"); // Above 10 ETH limit

      // **Fund the Treasury with sufficient ETH to bypass 'Insufficient funds'**
      await treasurer.sendTransaction({
        to: treasury.getAddress(),
        value: ethers.parseEther("20.0"), // Send 20 ETH to Treasury
      });

      await expect(
        treasury
          .connect(treasurer)
          .proposeWithdrawal(user1.address, amount, "Test withdrawal")
      ).to.be.revertedWith("Exceeds maximum withdrawal amount");
    });

    it("Should enforce weekly withdrawal limit", async function () {
      const { treasury, admin, treasurer, ceo, user1 } = await loadFixture(
        deployTreasuryFixture
      );

      // **Fund the Treasury with enough ETH**
      await treasurer.sendTransaction({
        to: treasury.getAddress(),
        value: ethers.parseEther("100.0"), // Send 100 ETH to Treasury
      });

      // **Grant CEO role**
      await treasury
        .connect(admin)
        .grantRole(await treasury.CEO_ROLE(), ceo.address);

      // **First Withdrawal: 10 ETH**
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(
          user1.address,
          ethers.parseEther("10.0"),
          "First withdrawal"
        );
      await treasury.connect(treasurer).approveWithdrawal();
      await treasury.connect(ceo).approveWithdrawal();

      // **Second Withdrawal: 10 ETH**
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(
          user1.address,
          ethers.parseEther("10.0"),
          "Second withdrawal"
        );
      await treasury.connect(treasurer).approveWithdrawal();
      await treasury.connect(ceo).approveWithdrawal();

      // **Third Withdrawal: 10 ETH**
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(
          user1.address,
          ethers.parseEther("10.0"),
          "Third withdrawal"
        );
      await treasury.connect(treasurer).approveWithdrawal();
      await treasury.connect(ceo).approveWithdrawal();

      // **Fourth Withdrawal: 10 ETH**
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(
          user1.address,
          ethers.parseEther("10.0"),
          "Fourth withdrawal"
        );
      await treasury.connect(treasurer).approveWithdrawal();
      await treasury.connect(ceo).approveWithdrawal();

      // **Fifth Withdrawal: 10 ETH (Total: 50 ETH, which is the weekly limit)**
      await treasury
        .connect(treasurer)
        .proposeWithdrawal(
          user1.address,
          ethers.parseEther("10.0"),
          "Fifth withdrawal"
        );
      await treasury.connect(treasurer).approveWithdrawal();
      await treasury.connect(ceo).approveWithdrawal();

      // **Sixth Withdrawal: 10 ETH (Should exceed weekly limit)**
      await expect(
        treasury
          .connect(treasurer)
          .proposeWithdrawal(
            user1.address,
            ethers.parseEther("10.0"),
            "Sixth withdrawal"
          )
      ).to.be.revertedWith("Exceeds weekly withdrawal limit");
    });
  });

  describe("Treasury - Additional Coverage Tests", function () {
    describe("Limit Management", function () {
      it("Should update maximum withdrawal amount", async function () {
        const { treasury, admin } = await loadFixture(deployTreasuryFixture);
        const newMax = ethers.parseEther("20.0");

        await treasury.connect(admin).updateMaxWithdrawalAmount(newMax);
        expect(await treasury.maxWithdrawalAmount()).to.equal(newMax);
      });

      it("Should update weekly limit", async function () {
        const { treasury, admin } = await loadFixture(deployTreasuryFixture);
        const newLimit = ethers.parseEther("100.0");

        await treasury.connect(admin).updateWeeklyLimit(newLimit);
        expect(await treasury.weeklyLimit()).to.equal(newLimit);
      });

      it("Should not allow non-admin to update limits", async function () {
        const { treasury, treasurer } = await loadFixture(
          deployTreasuryFixture
        );
        await expect(
          treasury
            .connect(treasurer)
            .updateMaxWithdrawalAmount(ethers.parseEther("20.0"))
        ).to.be.revertedWith("Only admin can update limit");
      });
    });

    describe("Role Transfer", function () {
      it("Should transfer admin role correctly", async function () {
        const { treasury, admin, user1 } = await loadFixture(
          deployTreasuryFixture
        );
        const adminRole = await treasury.DEFAULT_ADMIN_ROLE();

        await treasury.connect(admin).grantRole(adminRole, user1.address);
        await treasury.connect(admin).renounceRole(adminRole, admin.address);

        expect(await treasury.hasRole(adminRole, user1.address)).to.be.true;
        expect(await treasury.hasRole(adminRole, admin.address)).to.be.false;
      });

      it("Should handle multiple role assignments", async function () {
        const { treasury, admin, user1 } = await loadFixture(
          deployTreasuryFixture
        );

        await treasury
          .connect(admin)
          .grantRole(await treasury.CEO_ROLE(), user1.address);
        await treasury
          .connect(admin)
          .grantRole(await treasury.TREASURER_ROLE(), user1.address);

        expect(await treasury.hasRole(await treasury.CEO_ROLE(), user1.address))
          .to.be.true;
        expect(
          await treasury.hasRole(await treasury.TREASURER_ROLE(), user1.address)
        ).to.be.true;
      });
    });

    describe("Withdrawal Edge Cases", function () {
      it("Should handle zero amount withdrawals", async function () {
        const { treasury, treasurer, user1 } = await loadFixture(
          deployTreasuryFixture
        );

        // Fund the treasury first
        await treasurer.sendTransaction({
          to: treasury.getAddress(),
          value: ethers.parseEther("1.0"),
        });

        await expect(
          treasury
            .connect(treasurer)
            .proposeWithdrawal(user1.address, 0, "Zero withdrawal")
        ).to.be.revertedWith("Amount must be greater than zero");
      });

      it("Should handle withdrawal to zero address", async function () {
        const { treasury, treasurer } = await loadFixture(
          deployTreasuryFixture
        );

        // Fund the treasury first
        await treasurer.sendTransaction({
          to: treasury.getAddress(),
          value: ethers.parseEther("1.0"),
        });

        await expect(
          treasury
            .connect(treasurer)
            .proposeWithdrawal(
              ethers.ZeroAddress,
              ethers.parseEther("0.5"),
              "Invalid address"
            )
        ).to.be.revertedWith("Invalid withdrawal address");
      });

      it("Should reset approval state after successful withdrawal", async function () {
        const { treasury, admin, treasurer, ceo, user1 } = await loadFixture(
          deployTreasuryFixture
        );
        const amount = ethers.parseEther("1.0");

        await treasurer.sendTransaction({
          to: treasury.getAddress(),
          value: amount,
        });

        await treasury
          .connect(admin)
          .grantRole(await treasury.CEO_ROLE(), ceo.address);
        await treasury
          .connect(treasurer)
          .proposeWithdrawal(user1.address, amount, "Test reset");
        await treasury.connect(treasurer).approveWithdrawal();
        await treasury.connect(ceo).approveWithdrawal();

        const pendingApproval = await treasury.pendingApproval();
        expect(pendingApproval.amount).to.equal(0);
      });
    });

    describe("Emergency Functions", function () {
      // Remove emergency withdrawal tests if the function doesn't exist in the contract
      // Or implement the function in the Treasury contract first
    });

    describe("Concurrent Operations", function () {
      it("Should handle multiple pending approvals correctly", async function () {
        const { treasury, admin, treasurer, ceo, user1, user2 } =
          await loadFixture(deployTreasuryFixture);
        const amount = ethers.parseEther("1.0");

        // Fund the treasury
        await treasurer.sendTransaction({
          to: treasury.getAddress(),
          value: amount * 2n,
        });

        await treasury
          .connect(admin)
          .grantRole(await treasury.CEO_ROLE(), ceo.address);

        // First withdrawal
        await treasury
          .connect(treasurer)
          .proposeWithdrawal(user1.address, amount, "First withdrawal");
        await treasury.connect(treasurer).approveWithdrawal();

        // Try to propose another withdrawal before first is complete
        await expect(
          treasury
            .connect(treasurer)
            .proposeWithdrawal(user2.address, amount, "Second withdrawal")
        ).to.be.revertedWith("Previous withdrawal still pending");
      });
    });

    describe("Weekly Limit Reset", function () {
      it("Should reset weekly withdrawn amount after a week", async function () {
        const { treasury, admin, treasurer, ceo, user1 } = await loadFixture(
          deployTreasuryFixture
        );
        const amount = ethers.parseEther("10.0");

        // Fund the treasury
        await treasurer.sendTransaction({
          to: treasury.getAddress(),
          value: amount * 10n,
        });

        await treasury
          .connect(admin)
          .grantRole(await treasury.CEO_ROLE(), ceo.address);

        // First withdrawal
        await treasury
          .connect(treasurer)
          .proposeWithdrawal(user1.address, amount, "Week 1");
        await treasury.connect(treasurer).approveWithdrawal();
        await treasury.connect(ceo).approveWithdrawal();

        // Simulate time passing (1 week + 1 second)
        await ethers.provider.send("evm_increaseTime", [7 * 24 * 60 * 60 + 1]);
        await ethers.provider.send("evm_mine");

        // Should allow withdrawal after week reset
        await expect(
          treasury
            .connect(treasurer)
            .proposeWithdrawal(user1.address, amount, "Week 2")
        ).to.not.be.reverted;
      });
    });
  });
});
