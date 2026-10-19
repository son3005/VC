import { ethers, network } from "hardhat";
import * as fs from "node:fs";
import * as path from "node:path";

async function main() {
  const deploymentPath = path.join(
    __dirname,
    "..",
    "deployments",
    `${network.name}.json`
  );

  if (!fs.existsSync(deploymentPath)) {
    throw new Error(`Deployment not found: ${deploymentPath}. Run deploy first.`);
  }

  const deployment = JSON.parse(fs.readFileSync(deploymentPath, "utf8")) as {
    address: string;
  };

  const issuer = process.env.INITIAL_ISSUER_ADDRESS;
  if (!issuer) {
    throw new Error("INITIAL_ISSUER_ADDRESS is not set");
  }

  const registry = await ethers.getContractAt(
    "CertificateRegistry",
    deployment.address
  );

  const name = "Khoa Công nghệ Thông tin";
  const tx = await registry.addIssuer(issuer, name);
  const receipt = await tx.wait();

  console.log("Contract:", deployment.address);
  console.log("Issuer:", issuer);
  console.log("Name:", name);
  console.log("Tx:", receipt?.hash);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
