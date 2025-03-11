import { ethers } from "ethers";

export const calculateFeeDoodles = async (contract, amount) => {
  console.log("Contract object:", contract);

  const isSaleActive = contract.saleIsActive
  ? await contract.saleIsActive()
  : false;

  console.log("isSaleActive: ", isSaleActive)


if (!isSaleActive) {
  alert("The Doodles NFT can no longer be minted");
}

  const pricePerToken = contract.PRICE_PER_TOKEN
    ? ethers.toBigInt(await contract.PRICE_PER_TOKEN())
    : BigInt(0);

  const totalCost = pricePerToken * BigInt(amount);
  return totalCost;
};
