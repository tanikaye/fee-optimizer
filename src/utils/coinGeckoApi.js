import axios from "axios";

export const fetchEthPrice = async () => {
  try {
    const response = await axios.get(
      "https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd"
    );
    const ethPrice = response.data.ethereum.usd; // ETH price in USD
    console.log("Fetched ETH Price:", ethPrice);
    return ethPrice;
  } catch (error) {
    console.error("Error fetching ETH price:", error);
    return 2000; // Default fallback price if the API fails
  }
};
