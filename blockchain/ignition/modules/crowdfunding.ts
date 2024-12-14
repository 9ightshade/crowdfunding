import { buildModule } from "@nomicfoundation/hardhat-ignition/modules";

const CrowdfundingModule = buildModule("CrowdfundingDeployment", (m) => {
  // Get the first account as the initial owner
  // const owner = m.getAccount(0);

  // Deploy the contract
  const crowdfunding = m.contract("Crowdfunding", [], {
    // Optional: Additional deployment parameters
  });

  // Return the deployed contract for potential further use
  return { crowdfunding };
});

export default CrowdfundingModule;
