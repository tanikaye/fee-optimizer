import { calculateFeeDoodles } from "./doodles";
// Import other NFT fee calculation functions here

const feeCalculationFunctions = {
  doodles: calculateFeeDoodles,
  // Add other NFTs here
};

export const getFeeCalculationFunction = (nftName) => feeCalculationFunctions[nftName] || null;

export default getFeeCalculationFunction;
