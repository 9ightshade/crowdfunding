import { expect } from "chai";
import { ethers } from "hardhat";
import { Signer, ContractTransactionResponse } from "ethers";
import { Crowdfunding } from "../typechain-types"; // Assumes you're using typechain

describe("Crowdfunding Contract", function () {
  let crowdfunding: Crowdfunding;
  let owner: Signer;
  let creator: Signer;
  let contributor1: Signer;
  let contributor2: Signer;

  // Deploy the contract before each test
  beforeEach(async function () {
    // Get signers
    [owner, creator, contributor1, contributor2] = await ethers.getSigners();

    // Deploy the contract
    const CrowdfundingContract = await ethers.getContractFactory("Crowdfunding");
    crowdfunding = await CrowdfundingContract.connect(owner).deploy() as Crowdfunding;
  });

  // Test campaign creation
  describe("Campaign Creation", function () {
    it("Should create a campaign successfully", async function () {
      const title = "Test Campaign";
      const description = "A test crowdfunding campaign";
      const goalAmount = ethers.parseEther("10"); // 10 ETH
      const duration = 30 * 24 * 60 * 60; // 30 days
      const platformFeePercentage = 3;

      // Create campaign
      const tx = await crowdfunding.connect(creator).createCampaign(
        title, 
        description, 
        goalAmount, 
        duration, 
        platformFeePercentage
      );

      // Get campaign details
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt?.logs.find(
        log => (log as any).fragment?.name === "CampaignCreated"
      );

      // Assertions
      expect((campaignCreatedEvent as any)?.args[1]).to.equal(await creator.getAddress());
      expect((campaignCreatedEvent as any)?.args[2]).to.equal(title);
      expect((campaignCreatedEvent as any)?.args[3]).to.equal(goalAmount);
    });

    it("Should reject campaign with invalid parameters", async function () {
      await expect(
        crowdfunding.connect(creator).createCampaign(
          "", // Empty title
          "Description", 
          ethers.parseEther("10"), 
          30 * 24 * 60 * 60, 
          3
        )
      ).to.be.revertedWith("Title is required");

      await expect(
        crowdfunding.connect(creator).createCampaign(
          "Title", 
          "Description", 
          0n, // Zero goal amount 
          30 * 24 * 60 * 60, 
          3
        )
      ).to.be.revertedWith("Goal amount must be greater than 0");

      await expect(
        crowdfunding.connect(creator).createCampaign(
          "Title", 
          "Description", 
          ethers.parseEther("10"), 
          6 * 24 * 60 * 60, // Less than 7 days 
          3
        )
      ).to.be.revertedWith("Invalid campaign duration");
    });
  });

  // Test contribution functionality
  describe("Contributions", function () {
    let campaignId: bigint;

    beforeEach(async function () {
      // Create a campaign before each contribution test
      const tx = await crowdfunding.connect(creator).createCampaign(
        "Test Campaign", 
        "Description", 
        ethers.parseEther("10"), 
        30 * 24 * 60 * 60, 
        3
      );
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt?.logs.find(
        log => (log as any).fragment?.name === "CampaignCreated"
      );
      campaignId = (campaignCreatedEvent as any)?.args[0];
    });

    it("Should allow contributions", async function () {
      const contributionAmount = ethers.parseEther("2");

      // Contribute to campaign
      const tx = await crowdfunding.connect(contributor1).contribute(campaignId, {
        value: contributionAmount
      });

      // Check contribution
      const contribution = await crowdfunding.getContribution(
        campaignId, 
        await contributor1.getAddress()
      );
      expect(contribution).to.equal(contributionAmount);
    });

    it("Should prevent contributions after deadline", async function () {
      // Advance time past campaign deadline
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");

      // Attempt to contribute
      await expect(
        crowdfunding.connect(contributor1).contribute(campaignId, {
          value: ethers.parseEther("2")
        })
      ).to.be.revertedWith("Campaign has ended");
    });
  });

  // Test fund withdrawal
  describe("Fund Withdrawal", function () {
    let campaignId: bigint;

    beforeEach(async function () {
      // Create campaign and contribute to meet goal
      const tx = await crowdfunding.connect(creator).createCampaign(
        "Successful Campaign", 
        "Description", 
        ethers.parseEther("10"), 
        30 * 24 * 60 * 60, 
        3
      );
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt?.logs.find(
        log => (log as any).fragment?.name === "CampaignCreated"
      );
      campaignId = (campaignCreatedEvent as any)?.args[0];

      // Contribute to meet goal
      await crowdfunding.connect(contributor1).contribute(campaignId, {
        value: ethers.parseEther("12")
      });
    });

    it("Should allow campaign creator to withdraw funds", async function () {
      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(await creator.getAddress());

      // Withdraw funds
      const tx = await crowdfunding.connect(creator).withdrawFunds(campaignId);
      const receipt = await tx.wait();

      // Calculate gas cost
      const gasUsed = receipt?.gasUsed ?? 0n;
      const gasPrice = receipt?.gasPrice ?? 0n;
      const gasCost = gasUsed * gasPrice;

      // Get final balance
      const finalBalance = await ethers.provider.getBalance(await creator.getAddress());

      // Check withdrawal amount (considering gas cost)
      const withdrawnAmount = ethers.parseEther("11.64"); // 12 - 3% platform fee
      expect(finalBalance).to.be.closeTo(
        initialBalance + withdrawnAmount - gasCost, 
        ethers.parseEther("0.01")
      );
    });

    it("Should prevent non-creator from withdrawing", async function () {
      await expect(
        crowdfunding.connect(contributor1).withdrawFunds(campaignId)
      ).to.be.revertedWith("Only creator can withdraw");
    });
  });

  // Test refund functionality
  describe("Refunds", function () {
    let failedCampaignId: bigint;

    beforeEach(async function () {
      // Create campaign
      const tx = await crowdfunding.connect(creator).createCampaign(
        "Failed Campaign", 
        "Description", 
        ethers.parseEther("10"), 
        30 * 24 * 60 * 60, 
        3
      );
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt?.logs.find(
        log => (log as any).fragment?.name === "CampaignCreated"
      );
      failedCampaignId = (campaignCreatedEvent as any)?.args[0];

      // Contribute less than goal
      await crowdfunding.connect(contributor1).contribute(failedCampaignId, {
        value: ethers.parseEther("5")
      });

      // Advance time past campaign deadline
      await ethers.provider.send("evm_increaseTime", [31 * 24 * 60 * 60]); // 31 days
      await ethers.provider.send("evm_mine");
    });

    it("Should mark campaign as failed and allow refunds", async function () {
      // Mark campaign as failed
      await crowdfunding.connect(creator).refundContributors(failedCampaignId);

      // Claim refund
      const initialBalance = await ethers.provider.getBalance(await contributor1.getAddress());
      
      const tx = await crowdfunding.connect(contributor1).claimRefund(failedCampaignId);
      const receipt = await tx.wait();

      // Calculate gas cost
      const gasUsed = receipt?.gasUsed ?? 0n;
      const gasPrice = receipt?.gasPrice ?? 0n;
      const gasCost = gasUsed * gasPrice;

      // Get final balance
      const finalBalance = await ethers.provider.getBalance(await contributor1.getAddress());

      // Check refund amount (considering gas cost)
      const refundAmount = ethers.parseEther("5");
      expect(finalBalance).to.be.closeTo(
        initialBalance + refundAmount - gasCost, 
        ethers.parseEther("0.01")
      );
    });

    it("Should prevent refunds before campaign fails", async function () {
      await expect(
        crowdfunding.connect(contributor1).claimRefund(failedCampaignId)
      ).to.be.revertedWith("Refunds not available");
    });
  });

  // Platform fee withdrawal
  describe("Platform Fee Withdrawal", function () {
    let campaignId: bigint;

    beforeEach(async function () {
      // Create campaign and contribute to meet goal
      const tx = await crowdfunding.connect(creator).createCampaign(
        "Fee Campaign", 
        "Description", 
        ethers.parseEther("10"), 
        30 * 24 * 60 * 60, 
        3
      );
      const receipt = await tx.wait();
      const campaignCreatedEvent = receipt?.logs.find(
        log => (log as any).fragment?.name === "CampaignCreated"
      );
      campaignId = (campaignCreatedEvent as any)?.args[0];

      // Contribute to meet goal
      await crowdfunding.connect(contributor1).contribute(campaignId, {
        value: ethers.parseEther("12")
      });

      // Withdraw campaign funds to accumulate platform fees
      await crowdfunding.connect(creator).withdrawFunds(campaignId);
    });

    it("Should allow platform owner to withdraw accumulated fees", async function () {
      // Get initial balance
      const initialBalance = await ethers.provider.getBalance(await owner.getAddress());

      // Withdraw platform fees
      const tx = await crowdfunding.connect(owner).withdrawPlatformFees();
      const receipt = await tx.wait();

      // Calculate gas cost
      const gasUsed = receipt?.gasUsed ?? 0n;
      const gasPrice = receipt?.gasPrice ?? 0n;
      const gasCost = gasUsed * gasPrice;

      // Get final balance
      const finalBalance = await ethers.provider.getBalance(await owner.getAddress());

      // Check fee withdrawal amount (3% of 12 ETH = 0.36 ETH)
      const feeAmount = ethers.parseEther("0.36");
      expect(finalBalance).to.be.closeTo(
        initialBalance + feeAmount - gasCost, 
        ethers.parseEther("0.01")
      );
    });

    it("Should prevent non-owner from withdrawing platform fees", async function () {
      await expect(
        crowdfunding.connect(contributor1).withdrawPlatformFees()
      ).to.be.revertedWith("Only platform owner");
    });
  });

  // Utility and getter functions
  describe("Utility Functions", function () {
    it("Should return correct platform owner", async function () {
      const platformOwner = await crowdfunding.getPlatformOwner();
      expect(platformOwner).to.equal(await owner.getAddress());
    });

    it("Should track total campaigns for a creator", async function () {
      // Create multiple campaigns
      await crowdfunding.connect(creator).createCampaign(
        "Campaign 1", "Description", ethers.parseEther("5"), 30 * 24 * 60 * 60, 3
      );
      await crowdfunding.connect(creator).createCampaign(
        "Campaign 2", "Description", ethers.parseEther("5"), 30 * 24 * 60 * 60, 3
      );

      // Check total campaigns
      const totalCampaigns = await crowdfunding.getUserTotalCampaigns(await creator.getAddress());
      expect(totalCampaigns).to.equal(2n);
    });
  });
});