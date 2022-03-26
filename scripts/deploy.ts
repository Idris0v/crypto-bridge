import { ethers, network } from "hardhat";

async function main() {
  if (!network.config.chainId) {
    throw new Error('no network.config.chainId'); 
  }

  const [validator] = await ethers.getSigners();

  const AirFactory = await ethers.getContractFactory("Air");
  const air = await AirFactory.deploy(1000000, "AIR Token", "AIR");

  await air.deployed();
  console.log("Air deployed to:", air.address);

  const BridgeFactory = await ethers.getContractFactory("Bridge");
  const bridge = await BridgeFactory.deploy(validator.address, network.config.chainId);

  await bridge.deployed();

  console.log("bridge deployed to:", bridge.address);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
