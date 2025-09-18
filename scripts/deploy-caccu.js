const { ethers } = require("ethers");
const fs = require("fs");
const path = require("path");

/**
 * Deployment script for cACCU ERC-1155 token contract
 * Compatible with ethers.js v6 and Hardhat artifacts
 */

// Load ABI from src/abi as per project structure
const contractABI = JSON.parse(fs.readFileSync(path.join(__dirname, "../src/abi/caccu.json"), "utf8"));

// Load bytecode from Hardhat artifacts
const artifactsPath = path.join(__dirname, "../artifacts/contracts/cACCU.sol/cACCU.json");
if (!fs.existsSync(artifactsPath)) {
  throw new Error("Contract artifacts not found. Please run 'npx hardhat compile' first.");
}
const artifacts = JSON.parse(fs.readFileSync(artifactsPath, "utf8"));
const contractBytecode = artifacts.bytecode;

async function deployCACCU() {
  try {
    // Connect to provider (configure based on your network)
    const provider = new ethers.JsonRpcProvider(process.env.RPC_URL || "http://127.0.0.1:8545");

    // Get signer (use private key or wallet)
    const privateKey = process.env.PRIVATE_KEY;
    if (!privateKey) {
      throw new Error("Please set PRIVATE_KEY environment variable");
    }
    const signer = new ethers.Wallet(privateKey, provider);

    console.log("Deploying cACCU contract with account:", signer.address);

    // Create contract factory with loaded bytecode
    const contractFactory = new ethers.ContractFactory(contractABI, contractBytecode, signer);

    // Constructor parameters
    const baseURI = process.env.CONTRACT_BASE_URI || "https://api.carbonxreserve.com/metadata/{id}";

    console.log("Deploying with baseURI:", baseURI);

    // Deploy contract
    const contract = await contractFactory.deploy(baseURI);

    console.log("Deployment transaction hash:", contract.deploymentTransaction().hash);

    // Wait for deployment to be mined
    await contract.waitForDeployment();

    const deployedAddress = await contract.getAddress();
    console.log("cACCU contract deployed to:", deployedAddress);

    // Get network info
    const network = await provider.getNetwork();

    // Save deployment info
    const deploymentInfo = {
      contractAddress: deployedAddress,
      deployer: signer.address,
      baseURI: baseURI,
      network: network,
      deploymentTime: new Date().toISOString(),
      transactionHash: contract.deploymentTransaction().hash,
    };

    // Save to file
    const deploymentPath = path.join(__dirname, "../deployments");
    if (!fs.existsSync(deploymentPath)) {
      fs.mkdirSync(deploymentPath);
    }

    const filename = `caccu-${Date.now()}.json`;
    fs.writeFileSync(
      path.join(deploymentPath, filename),
      JSON.stringify(deploymentInfo, null, 2)
    );

    console.log("Deployment info saved to:", path.join(deploymentPath, filename));

    // Post-deployment setup (optional)
    console.log("Performing post-deployment setup...");

    // Add additional minters/burners if specified
    if (process.env.ADDITIONAL_MINTERS) {
      const minters = process.env.ADDITIONAL_MINTERS.split(",");
      for (const minter of minters) {
        const trimmed = minter.trim();
        if (ethers.isAddress(trimmed)) {
          console.log(`Adding minter: ${trimmed}`);
          await contract.addMinter(trimmed);
        } else {
          console.warn(`Invalid address for minter: ${trimmed}`);
        }
      }
    }

    if (process.env.ADDITIONAL_BURNERS) {
      const burners = process.env.ADDITIONAL_BURNERS.split(",");
      for (const burner of burners) {
        const trimmed = burner.trim();
        if (ethers.isAddress(trimmed)) {
          console.log(`Adding burner: ${trimmed}`);
          await contract.addBurner(trimmed);
        } else {
          console.warn(`Invalid address for burner: ${trimmed}`);
        }
      }
    }

    console.log("Post-deployment setup completed");

    return {
      contractAddress: deployedAddress,
      contract: contract,
    };

  } catch (error) {
    console.error("Deployment failed:", error.message || error);
    throw error;
  }
}

// Export for use in other scripts
module.exports = { deployCACCU };

// If run directly
if (require.main === module) {
  deployCACCU()
    .then(() => {
      console.log("Deployment completed successfully");
      process.exit(0);
    })
    .catch((error) => {
      console.error("Deployment failed:", error);
      process.exit(1);
    });
}