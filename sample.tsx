// // SPDX-License-Identifier: MIT
// pragma solidity ^0.8.0;

// contract Crowdfunding {
//     // Campaign structure
//     struct Campaign {
//         uint256 id;
//         address creator;
//         string title;
//         string description;
//         uint256 goalAmount;
//         uint256 amountRaised;
//         uint256 deadline;
//         bool completed;
//         bool exists;
//     }

//     uint256 private campaignCounter;
//     mapping(uint256 => Campaign) private campaigns;
//     mapping(uint256 => mapping(address => uint256)) private contributions;

//     event CampaignCreated(
//         uint256 id,
//         address indexed creator,
//         string title,
//         uint256 goalAmount,
//         uint256 deadline
//     );

//     event ContributionReceived(
//         uint256 id,
//         address indexed contributor,
//         uint256 amount
//     );

//     event CampaignCompleted(uint256 id, address indexed creator);

//     /**
//      * @dev Create a new crowdfunding campaign.
//      * @param _title Title of the campaign.
//      * @param _description Description of the campaign.
//      * @param _goalAmount Target amount to be raised (in wei).
//      * @param _deadline Timestamp of the campaign deadline.
//      */
//     function createCampaign(
//         string memory _title,
//         string memory _description,
//         uint256 _goalAmount,
//         uint256 _deadline
//     ) external {
//         require(bytes(_title).length > 0, "Title is required");
//         require(bytes(_description).length > 0, "Description is required");
//         require(_goalAmount > 0, "Goal amount must be greater than 0");
//         require(
//             _deadline > block.timestamp,
//             "Deadline must be in the future"
//         );

//         campaignCounter++;

//         campaigns[campaignCounter] = Campaign({
//             id: campaignCounter,
//             creator: msg.sender,
//             title: _title,
//             description: _description,
//             goalAmount: _goalAmount,
//             amountRaised: 0,
//             deadline: _deadline,
//             completed: false,
//             exists: true
//         });

//         emit CampaignCreated(
//             campaignCounter,
//             msg.sender,
//             _title,
//             _goalAmount,
//             _deadline
//         );
//     }

//     /**
//      * @dev Contribute to a campaign.
//      * @param _id The ID of the campaign to contribute to.
//      */
//     function contribute(uint256 _id) external payable {
//         Campaign storage campaign = campaigns[_id];
//         require(campaign.exists, "Campaign does not exist");
//         require(block.timestamp < campaign.deadline, "Campaign has ended");
//         require(!campaign.completed, "Campaign is already completed");
//         require(msg.value > 0, "Contribution must be greater than 0");

//         campaign.amountRaised += msg.value;
//         contributions[_id][msg.sender] += msg.value;

//         emit ContributionReceived(_id, msg.sender, msg.value);

//         if (campaign.amountRaised >= campaign.goalAmount) {
//             campaign.completed = true;
//             emit CampaignCompleted(_id, campaign.creator);
//         }
//     }

//     /**
//      * @dev Withdraw funds if the campaign is completed and goal is met.
//      * @param _id The ID of the campaign to withdraw funds from.
//      */
//     function withdrawFunds(uint256 _id) external {
//         Campaign storage campaign = campaigns[_id];
//         require(campaign.exists, "Campaign does not exist");
//         require(campaign.completed, "Campaign is not yet completed");
//         require(campaign.creator == msg.sender, "Only the creator can withdraw");

//         uint256 amount = campaign.amountRaised;
//         campaign.amountRaised = 0;

//         (bool success, ) = msg.sender.call{value: amount}("");
//         require(success, "Transfer failed");
//     }

//     /**
//      * @dev Get campaign details.
//      * @param _id The ID of the campaign to fetch details for.
//      */
//     function getCampaign(uint256 _id)
//         external
//         view
//         returns (
//             uint256 id,
//             address creator,
//             string memory title,
//             string memory description,
//             uint256 goalAmount,
//             uint256 amountRaised,
//             uint256 deadline,
//             bool completed
//         )
//     {
//         Campaign storage campaign = campaigns[_id];
//         require(campaign.exists, "Campaign does not exist");

//         return (
//             campaign.id,
//             campaign.creator,
//             campaign.title,
//             campaign.description,
//             campaign.goalAmount,
//             campaign.amountRaised,
//             campaign.deadline,
//             campaign.completed
//         );
//     }

//     /**
//      * @dev Get campaigns created by a specific user.
//      * @param _creator Address of the campaign creator.
//      * @return An array of campaign IDs created by the user.
//      */
//     function getUserCampaigns(address _creator)
//         external
//         view
//         returns (uint256[] memory)
//     {
//         // First, count the number of campaigns by this creator
//         uint256 userCampaignCount = 0;
//         for (uint256 i = 1; i <= campaignCounter; i++) {
//             if (campaigns[i].creator == _creator) {
//                 userCampaignCount++;
//             }
//         }

//         // Create an array to store the campaign IDs
//         uint256[] memory userCampaignIds = new uint256[](userCampaignCount);

//         // Populate the array with campaign IDs
//         uint256 index = 0;
//         for (uint256 i = 1; i <= campaignCounter; i++) {
//             if (campaigns[i].creator == _creator) {
//                 userCampaignIds[index] = i;
//                 index++;
//             }
//         }

//         return userCampaignIds;
//     }

//     /**
//      * @dev Get detailed information for multiple campaigns.
//      * @param _campaignIds Array of campaign IDs to retrieve.
//      * @return An array of campaign details.
//      */
//     function getCampaignsBatch(uint256[] memory _campaignIds)
//         external
//         view
//         returns (
//             uint256[] memory ids,
//             address[] memory creators,
//             string[] memory titles,
//             string[] memory descriptions,
//             uint256[] memory goalAmounts,
//             uint256[] memory amountsRaised,
//             uint256[] memory deadlines,
//             bool[] memory completed
//         )
//     {
//         ids = new uint256[](_campaignIds.length);
//         creators = new address[](_campaignIds.length);
//         titles = new string[](_campaignIds.length);
//         descriptions = new string[](_campaignIds.length);
//         goalAmounts = new uint256[](_campaignIds.length);
//         amountsRaised = new uint256[](_campaignIds.length);
//         deadlines = new uint256[](_campaignIds.length);
//         completed = new bool[](_campaignIds.length);

//         for (uint256 i = 0; i < _campaignIds.length; i++) {
//             Campaign storage campaign = campaigns[_campaignIds[i]];
//             require(campaign.exists, "Campaign does not exist");

//             ids[i] = campaign.id;
//             creators[i] = campaign.creator;
//             titles[i] = campaign.title;
//             descriptions[i] = campaign.description;
//             goalAmounts[i] = campaign.goalAmount;
//             amountsRaised[i] = campaign.amountRaised;
//             deadlines[i] = campaign.deadline;
//             completed[i] = campaign.completed;
//         }

//         return (
//             ids,
//             creators,
//             titles,
//             descriptions,
//             goalAmounts,
//             amountsRaised,
//             deadlines,
//             completed
//         );
//     }

//      /**
//      * @dev Get total number of campaigns created.
//      * @return Total number of campaigns.
//      */
//     function getTotalCampaigns() external view returns (uint256) {
//         return campaignCounter;
//     }

//     /**
//      * @dev Get all campaign IDs created with the contract.
//      * @return An array of all campaign IDs.
//      */
//     function getAllCampaignIds() external view returns (uint256[] memory) {
//         uint256[] memory allCampaignIds = new uint256[](campaignCounter);

//         for (uint256 i = 1; i <= campaignCounter; i++) {
//             allCampaignIds[i - 1] = i;
//         }

//         return allCampaignIds;
//     }

//     /**
//      * @dev Get all campaigns with their details.
//      * @return Arrays containing details of all campaigns.
//      */
//     function getAllCampaigns()
//         external
//         view
//         returns (
//             uint256[] memory ids,
//             address[] memory creators,
//             string[] memory titles,
//             string[] memory descriptions,
//             uint256[] memory goalAmounts,
//             uint256[] memory amountsRaised,
//             uint256[] memory deadlines,
//             bool[] memory completed
//         )
//     {
//         ids = new uint256[](campaignCounter);
//         creators = new address[](campaignCounter);
//         titles = new string[](campaignCounter);
//         descriptions = new string[](campaignCounter);
//         goalAmounts = new uint256[](campaignCounter);
//         amountsRaised = new uint256[](campaignCounter);
//         deadlines = new uint256[](campaignCounter);
//         completed = new bool[](campaignCounter);

//         for (uint256 i = 1; i <= campaignCounter; i++) {
//             Campaign storage campaign = campaigns[i];

//             ids[i - 1] = campaign.id;
//             creators[i - 1] = campaign.creator;
//             titles[i - 1] = campaign.title;
//             descriptions[i - 1] = campaign.description;
//             goalAmounts[i - 1] = campaign.goalAmount;
//             amountsRaised[i - 1] = campaign.amountRaised;
//             deadlines[i - 1] = campaign.deadline;
//             completed[i - 1] = campaign.completed;
//         }

//         return (
//             ids,
//             creators,
//             titles,
//             descriptions,
//             goalAmounts,
//             amountsRaised,
//             deadlines,
//             completed
//         );
//     }
// }



// test
// import { ethers } from "hardhat";
// import { parseEther } from "ethers"; // Import utilities directly
// import { expect } from "chai";
// import { SignerWithAddress } from "@nomicfoundation/hardhat-ethers/signers";
// import { Crowdfunding } from "../typechain-types";

// describe("Crowdfunding Contract", function () {
//   let crowdfunding: Crowdfunding;
//   let owner: SignerWithAddress;
//   let addr1: SignerWithAddress;
//   let addr2: SignerWithAddress;

//   beforeEach(async () => {
//     const CrowdfundingFactory = await ethers.getContractFactory("Crowdfunding");
//     [owner, addr1, addr2] = await ethers.getSigners();
//     crowdfunding = (await CrowdfundingFactory.deploy()) as Crowdfunding;
//     // await crowdfunding.deployed();
//   });

//   it("Should create a campaign successfully", async () => {
//     const deadline = Math.floor(Date.now() / 1000) + 3600; // 1 hour from now
//     await crowdfunding.createCampaign(
//       "Test Campaign",
//       "This is a test description",
//       parseEther("1"), // 1 ETH goal
//       deadline
//     );

//     const campaign = await crowdfunding.getCampaign(1);

//     expect(campaign.title).to.equal("Test Campaign");
//     expect(campaign.description).to.equal("This is a test description");
//     expect(campaign.goalAmount).to.equal(parseEther("1"));
//     expect(campaign.amountRaised).to.equal(0);
//     expect(campaign.completed).to.equal(false);
//     expect(campaign.deadline).to.equal(deadline);
//   });

//   it("Should fail to create a campaign with invalid inputs", async () => {
//     const futureTimestamp = Math.floor(Date.now() / 1000) + 3600;

//     await expect(
//       crowdfunding.createCampaign(
//         "",
//         "This is a test description",
//         parseEther("1"),
//         futureTimestamp
//       )
//     ).to.be.revertedWith("Title is required");

//     await expect(
//       crowdfunding.createCampaign(
//         "Test Campaign",
//         "",
//         parseEther("1"),
//         futureTimestamp
//       )
//     ).to.be.revertedWith("Description is required");

//     await expect(
//       crowdfunding.createCampaign(
//         "Test Campaign",
//         "This is a test description",
//         0,
//         futureTimestamp
//       )
//     ).to.be.revertedWith("Goal amount must be greater than 0");

//     await expect(
//       crowdfunding.createCampaign(
//         "Test Campaign",
//         "This is a test description",
//         parseEther("1"),
//         Math.floor(Date.now() / 1000) - 3600 // Past timestamp
//       )
//     ).to.be.revertedWith("Deadline must be in the future");
//   });

//   it("Should accept contributions and update the amount raised", async () => {
//     await crowdfunding.createCampaign(
//       "Test Campaign",
//       "This is a test description",
//       parseEther("1"),
//       Math.floor(Date.now() / 1000) + 3600
//     );

//     await crowdfunding
//       .connect(addr1)
//       .contribute(1, { value: parseEther("0.5") });

//     await crowdfunding
//       .connect(addr2)
//       .contribute(1, { value: parseEther("0.4") });

//     const campaign = await crowdfunding.getCampaign(1);
//     expect(campaign.amountRaised).to.equal(parseEther("0.9"));
//   });

//   it("Should complete the campaign when the goal is reached", async () => {
//     await crowdfunding.createCampaign(
//       "Test Campaign",
//       "This is a test description",
//       parseEther("1"),
//       Math.floor(Date.now() / 1000) + 3600
//     );

//     await crowdfunding
//       .connect(addr1)
//       .contribute(1, { value: parseEther("1") });

//     const campaign = await crowdfunding.getCampaign(1);
//     expect(campaign.completed).to.equal(true);
//   });

//   it("Should allow the creator to withdraw funds after the campaign is completed", async () => {
//     await crowdfunding.createCampaign(
//       "Test Campaign",
//       "This is a test description",
//       parseEther("1"),
//       Math.floor(Date.now() / 1000) + 3600
//     );

//     await crowdfunding
//       .connect(addr1)
//       .contribute(1, { value: parseEther("1") });

//     const initialBalance = await ethers.provider.getBalance(owner.address);
//     const tx = await crowdfunding.withdrawFunds(1);
//     const receipt = await tx.wait();
//     // const gasUsed = receipt.gasUsed.mul(receipt.effectiveGasPrice);
//     const finalBalance = await ethers.provider.getBalance(owner.address);

//   //   expect(finalBalance).to.equal(
//   //     initialBalance.add(parseEther("1")).sub(gasUsed)
//   //   );
//   // });

//   it("Should fail to withdraw funds if the campaign is not completed", async () => {
//     await crowdfunding.createCampaign(
//       "Test Campaign",
//       "This is a test description",
//       parseEther("1"),
//       Math.floor(Date.now() / 1000) + 3600
//     );

//     await expect(crowdfunding.withdrawFunds(1)).to.be.revertedWith(
//       "Campaign is not yet completed"
//     );
//   });

//   it("Should fail to contribute to a non-existent campaign", async () => {
//     await expect(
//       crowdfunding.connect(addr1).contribute(999, { value: parseEther("0.1") })
//     ).to.be.revertedWith("Campaign does not exist");
//   });
// })}
// )