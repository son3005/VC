import { ethers, network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying with:", deployer.address);

  const factory = await ethers.getContractFactory("CertificateRegistry");
  const registry = await factory.deploy();
  await registry.waitForDeployment();

  const address = await registry.getAddress();
  const tx = registry.deploymentTransaction();
  const receipt = tx ? await tx.wait() : null;
  const chainId = Number((await ethers.provider.getNetwork()).chainId);

  const deployment = {
    chainId,
    address,
    blockNumber: receipt?.blockNumber ?? 0,
    txHash: receipt?.hash ?? "",
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    compiler: "0.8.24",
    optimizer: { enabled: true, runs: 200 },
  };

  const dir = path.join(__dirname, "..", "deployments");
  fs.mkdirSync(dir, { recursive: true });

  const file = path.join(dir, `${network.name}.json`);
  fs.writeFileSync(file, JSON.stringify(deployment, null, 2));

  console.log("CertificateRegistry:", address);
  console.log("Deployment saved:", file);
  console.log("Add issuer with:");
  console.log(
    `  npx hardhat run scripts/add-issuer.ts --network ${network.name}`
  );
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
