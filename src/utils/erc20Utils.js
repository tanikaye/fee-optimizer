import { ethers } from "ethers";

// Standard ERC-20 ABI with only the functions we need
const ERC20_ABI = [
  "function transfer(address to, uint256 amount) returns (bool)",
  "function balanceOf(address owner) view returns (uint256)",
  "function decimals() view returns (uint8)",
  "function symbol() view returns (string)"
];

export const estimateERC20TransferGas = async (
  provider,
  tokenAddress,
  recipientAddress,
  amount
) => {
  try {
    // Create contract instance
    const contract = new ethers.Contract(tokenAddress, ERC20_ABI, provider);

    // Get token decimals
    const decimals = await contract.decimals();

    // Convert amount to proper decimal places
    const amountInWei = ethers.parseUnits(amount.toString(), decimals);

    // Use a dummy sender address for estimation (Vitalik's address as an example with funds)
    const fromAddress = "0xd8dA6BF26964aF9D7eEd9e03E53415D37aA96045";

    // Prepare the transaction data
    const data = contract.interface.encodeFunctionData("transfer", [recipientAddress, amountInWei]);

    // Estimate gas with full transaction parameters
    const gasEstimate = await provider.estimateGas({
      from: fromAddress,
      to: tokenAddress,
      data: data,
      value: 0
    });

    return gasEstimate;
  } catch (error) {
    console.error("Error estimating ERC-20 transfer gas:", error);
    throw error;
  }
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