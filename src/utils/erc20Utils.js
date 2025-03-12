import { ethers } from "ethers";

// Standard ERC-20 ABI with only the functions we need
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export const estimateERC20TransferGas = () => {
  // Standard ERC-20 transfer gas cost
  return 65000;
};

// Function to validate token address and get its symbol
export const validateAndGetTokenInfo = async (provider, tokenAddress) => {
  try {
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    // Try to call symbol() to verify it's an ERC-20 token
    const symbol = await contract.symbol();
    const decimals = await contract.decimals();

    return {
      isValid: true,
      symbol,
      decimals
    };
  } catch (error) {
    console.error("Error validating ERC-20 token:", error);
    return {
      isValid: false,
      error: "Invalid ERC-20 token address"
    };
  }
};