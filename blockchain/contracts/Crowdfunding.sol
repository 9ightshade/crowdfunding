// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

/**
 * @title Advanced Crowdfunding Contract
 * @notice Allows creation and management of crowdfunding campaigns with enhanced features
 */
contract Crowdfunding {
    // Enum to track campaign status
    enum CampaignStatus {
        Active,
        Successful,
        Failed,
        Withdrawn
    }

    // Campaign structure with more detailed tracking
    struct Campaign {
        uint256 id;
        address creator;
        string title;
        string description;
        uint256 goalAmount;
        uint256 amountRaised;
        uint256 startTime;
        uint256 deadline;
        CampaignStatus status;
        uint256 platformFeePercentage;
    }

    // Configuration variables
    uint256 private constant MAX_CAMPAIGN_DURATION = 90 days;
    uint256 private constant MIN_CAMPAIGN_DURATION = 7 days;
    uint256 private constant MAX_PLATFORM_FEE_PERCENTAGE = 5; // 5%

    // State variables
    uint256 private campaignCounter;
    address private immutable platformOwner;
    uint256 private platformTotalFees;

    // Mappings
    mapping(uint256 => Campaign) private campaigns;
    mapping(uint256 => mapping(address => uint256)) private contributions;
    mapping(address => uint256) private creatorTotalCampaigns;

    // Events with more detailed information
    event CampaignCreated(
        uint256 indexed id,
        address indexed creator,
        string title,
        uint256 goalAmount,
        uint256 deadline,
        uint256 platformFeePercentage
    );

    event ContributionReceived(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    event CampaignStatusChanged(uint256 indexed id, CampaignStatus status);

    event FundsWithdrawn(
        uint256 indexed campaignId,
        address indexed creator,
        uint256 amount,
        uint256 platformFee
    );

    event ContributionRefunded(
        uint256 indexed campaignId,
        address indexed contributor,
        uint256 amount
    );

    // Modifiers
    modifier onlyPlatformOwner() {
        require(msg.sender == platformOwner, "Only platform owner");
        _;
    }

    /**
     * @dev Constructor to set platform owner
     */
    constructor() {
        platformOwner = msg.sender;
    }

    /**
     * @dev Create a new crowdfunding campaign
     * @param _title Campaign title
     * @param _description Campaign description
     * @param _goalAmount Funding goal in wei
     * @param _duration Campaign duration in seconds
     * @param _platformFeePercentage Platform fee percentage
     */
    function createCampaign(
        string memory _title,
        string memory _description,
        uint256 _goalAmount,
        uint256 _duration,
        uint256 _platformFeePercentage
    ) external {
        // Validate inputs
        require(bytes(_title).length > 0, "Title is required");
        require(bytes(_description).length > 0, "Description is required");
        require(_goalAmount > 0, "Goal amount must be greater than 0");
        require(
            _duration >= MIN_CAMPAIGN_DURATION &&
                _duration <= MAX_CAMPAIGN_DURATION,
            "Invalid campaign duration"
        );
        require(
            _platformFeePercentage <= MAX_PLATFORM_FEE_PERCENTAGE,
            "Platform fee exceeds maximum"
        );

        // Increment campaign counter
        campaignCounter++;

        // Create campaign
        campaigns[campaignCounter] = Campaign({
            id: campaignCounter,
            creator: msg.sender,
            title: _title,
            description: _description,
            goalAmount: _goalAmount,
            amountRaised: 0,
            startTime: block.timestamp,
            deadline: block.timestamp + _duration,
            status: CampaignStatus.Active,
            platformFeePercentage: _platformFeePercentage
        });

        // Track creator's total campaigns
        creatorTotalCampaigns[msg.sender]++;

        // Emit event
        emit CampaignCreated(
            campaignCounter,
            msg.sender,
            _title,
            _goalAmount,
            block.timestamp + _duration,
            _platformFeePercentage
        );
    }

    /**
     * @dev Contribute to a campaign
     * @param _id Campaign ID to contribute to
     */
    function contribute(uint256 _id) external payable {
        Campaign storage campaign = campaigns[_id];

        // Validate contribution
        require(msg.value > 0, "Contribution must be greater than 0");
        require(
            campaign.status == CampaignStatus.Active,
            "Campaign not active"
        );
        require(block.timestamp < campaign.deadline, "Campaign has ended");

        // Update campaign details
        campaign.amountRaised += msg.value;
        contributions[_id][msg.sender] += msg.value;

        // Emit contribution event
        emit ContributionReceived(_id, msg.sender, msg.value);

        // Check if campaign goal is reached
        if (campaign.amountRaised >= campaign.goalAmount) {
            campaign.status = CampaignStatus.Successful;
            emit CampaignStatusChanged(_id, CampaignStatus.Successful);
        }
    }

    /**
     * @dev Withdraw funds for a successful campaign
     * @param _id Campaign ID to withdraw funds from
     */
    function withdrawFunds(uint256 _id) external {
        Campaign storage campaign = campaigns[_id];

        // Validate withdrawal
        require(campaign.creator == msg.sender, "Only creator can withdraw");
        require(
            campaign.status == CampaignStatus.Successful,
            "Campaign not successful"
        );

        // Calculate platform fee and creator funds
        uint256 platformFee = (campaign.amountRaised *
            campaign.platformFeePercentage) / 100;
        uint256 creatorAmount = campaign.amountRaised - platformFee;

        // Update campaign status
        campaign.status = CampaignStatus.Withdrawn;

        // Track platform fees
        platformTotalFees += platformFee;

        // Transfer funds
        (bool creatorSuccess, ) = payable(campaign.creator).call{
            value: creatorAmount
        }("");
        require(creatorSuccess, "Creator transfer failed");

        // Emit withdrawal event
        emit FundsWithdrawn(_id, campaign.creator, creatorAmount, platformFee);
    }

    /**
     * @dev Refund contributors if campaign fails
     * @param _id Campaign ID to refund
     */
    function refundContributors(uint256 _id) external {
        Campaign storage campaign = campaigns[_id];

        // Validate refund conditions
        require(block.timestamp > campaign.deadline, "Campaign not yet ended");
        require(
            campaign.amountRaised < campaign.goalAmount,
            "Campaign was successful"
        );
        require(
            campaign.status == CampaignStatus.Active,
            "Invalid campaign status"
        );

        // Update campaign status
        campaign.status = CampaignStatus.Failed;
        emit CampaignStatusChanged(_id, CampaignStatus.Failed);
    }

    /**
     * @dev Allow individual contributor to claim refund
     * @param _id Campaign ID
     */
    function claimRefund(uint256 _id) external {
        Campaign storage campaign = campaigns[_id];
        uint256 contributorAmount = contributions[_id][msg.sender];

        // Validate refund
        require(contributorAmount > 0, "No contribution");
        require(
            campaign.status == CampaignStatus.Failed,
            "Refunds not available"
        );

        // Reset contribution and transfer funds
        contributions[_id][msg.sender] = 0;

        (bool refundSuccess, ) = payable(msg.sender).call{
            value: contributorAmount
        }("");
        require(refundSuccess, "Refund transfer failed");

        // Emit refund event
        emit ContributionRefunded(_id, msg.sender, contributorAmount);
    }

    /**
     * @dev Platform owner can withdraw accumulated fees
     */
    function withdrawPlatformFees() external onlyPlatformOwner {
        uint256 fees = platformTotalFees;
        platformTotalFees = 0;

        (bool success, ) = payable(platformOwner).call{value: fees}("");
        require(success, "Fee transfer failed");
    }

    // Existing getter functions from previous implementation...
    // (getCampaign, getUserCampaigns, getCampaignsBatch, etc.)

    /**
     * @dev Get contributor's contribution to a specific campaign
     * @param _campaignId Campaign ID
     * @param _contributor Contributor address
     * @return Contribution amount
     */
    function getContribution(
        uint256 _campaignId,
        address _contributor
    ) external view returns (uint256) {
        return contributions[_campaignId][_contributor];
    }

    /**
     * @dev Get total number of campaigns created by a user
     * @param _creator User address
     * @return Number of campaigns
     */
    function getUserTotalCampaigns(
        address _creator
    ) external view returns (uint256) {
        return creatorTotalCampaigns[_creator];
    }

    /**
     * @dev Get platform owner address
     * @return Platform owner address
     */
    function getPlatformOwner() external view returns (address) {
        return platformOwner;
    }

    /**
     * @dev Get total platform fees accumulated
     * @return Total platform fees
     */
    function getPlatformTotalFees() external view returns (uint256) {
        return platformTotalFees;
    }
}
