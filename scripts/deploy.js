const { ethers } = require("hardhat");

/**
 * @title BTCX Digital Currency Deployment Script
 * @notice Deploys the BTCXDigitalCurrency token contract
 * @dev Requires RECIPIENT_ADDRESS environment variable or uses deployer as recipient
 */
async function main() {
  console.log("=".repeat(60));
  console.log("BTCX Digital Currency - Deployment Script");
  console.log("=".repeat(60));

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("\nDeployer address:", deployer.address);

  // Get deployer balance
  const balance = await ethers.provider.getBalance(deployer.address);
  console.log("Deployer balance:", ethers.formatEther(balance), "ETH");

  // Determine recipient address
  const recipientAddress = process.env.RECIPIENT_ADDRESS || deployer.address;
  console.log("Token recipient:", recipientAddress);

  // Validate recipient address
  if (!ethers.isAddress(recipientAddress)) {
    throw new Error(`Invalid recipient address: ${recipientAddress}`);
  }

  console.log("\n" + "-".repeat(60));
  console.log("Deploying BTCXDigitalCurrency...");
  console.log("-".repeat(60));

  // Deploy contract
  const BTCXDigitalCurrency = await ethers.getContractFactory("BTCXDigitalCurrency");
  const btcx = await BTCXDigitalCurrency.deploy(recipientAddress);

  // Wait for deployment
  await btcx.waitForDeployment();
  const contractAddress = await btcx.getAddress();

  console.log("\n✅ BTCXDigitalCurrency deployed successfully!");
  console.log("Contract address:", contractAddress);

  // Verify deployment
  console.log("\n" + "-".repeat(60));
  console.log("Verifying deployment...");
  console.log("-".repeat(60));

  const name = await btcx.name();
  const symbol = await btcx.symbol();
  const decimals = await btcx.decimals();
  const totalSupply = await btcx.totalSupply();
  const recipientBalance = await btcx.balanceOf(recipientAddress);

  console.log("\nToken Details:");
  console.log("  Name:", name);
  console.log("  Symbol:", symbol);
  console.log("  Decimals:", decimals.toString());
  console.log("  Total Supply:", ethers.formatUnits(totalSupply, decimals), symbol);
  console.log("  Recipient Balance:", ethers.formatUnits(recipientBalance, decimals), symbol);

  // Verify total supply matches expected
  const expectedSupply = ethers.parseUnits("1200000000", 18);
  if (totalSupply !== expectedSupply) {
    throw new Error("Total supply mismatch!");
  }

  // Verify recipient received all tokens
  if (recipientBalance !== totalSupply) {
    throw new Error("Recipient balance mismatch!");
  }

  console.log("\n✅ All verifications passed!");

  // Network info
  const network = await ethers.provider.getNetwork();
  console.log("\n" + "-".repeat(60));
  console.log("Network Information");
  console.log("-".repeat(60));
  console.log("  Network:", network.name);
  console.log("  Chain ID:", network.chainId.toString());

  // Deployment summary for verification
  console.log("\n" + "=".repeat(60));
  console.log("DEPLOYMENT SUMMARY");
  console.log("=".repeat(60));
  console.log(`
Contract: BTCXDigitalCurrency
Address: ${contractAddress}
Network: ${network.name} (Chain ID: ${network.chainId})
Recipient: ${recipientAddress}
Constructor Args: ["${recipientAddress}"]

To verify on Etherscan:
npx hardhat verify --network ${network.name} ${contractAddress} "${recipientAddress}"
`);

  return {
    address: contractAddress,
    recipient: recipientAddress,
    deployer: deployer.address,
  };
}

main()
  .then((result) => {
    console.log("Deployment completed successfully.");
    process.exit(0);
  })
  .catch((error) => {
    console.error("Deployment failed:", error);
    process.exit(1);
  });
