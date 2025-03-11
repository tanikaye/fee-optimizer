// // Importing Axios
// import axios from 'axios';

// const apiKey = process.env.REACT_APP_OPENSEA_API_KEY;
// console.log("api key is: ", apiKey)

// // Function to fetch NFT data from OpenSea
// const fetchNFTData = async (contractAddress, tokenId) => {
//   console.log("testing fetchNFTData ")
// console.log("api key is rigoht before the try: ", apiKey)


//   try {
//     const response = await axios.get(
//       `https://api.opensea.io/api/v1/assets`, {
//         params: {
//           order_direction: 'desc',
//           offset: '0',
//           limit: '1',
//           asset_contract_address: contractAddress,
//           token_ids: tokenId
//         },
//         headers: {
//           'X-API-KEY': apiKey  // Optional if you have an API key
//         }
//       }
//     );
//   console.log("testing rngjernogdre ")


//     const nftData = response.data.assets[0];
//     console.log('NFT Data:', nftData);
//     return nftData;
//   } catch (error) {
//     console.error('Error fetching NFT data:', error);
//   }
// };

// // Function to fetch current gas price from Etherscan
// const fetchGasPrice = async () => {
//   console.log("testing fetchGasPrice ")

//   try {
//     const response = await axios.get(
//       'https://api.etherscan.io/api', {
//         params: {
//           module: 'gastracker',
//           action: 'gasoracle',
//           apikey: 'YOUR_ETHERSCAN_API_KEY'  // Replace with your API key
//         }
//       }
//     );

//     const gasPrice = response.data.result.ProposeGasPrice; // Example: ProposeGasPrice
//     console.log('Current Gas Price:', gasPrice);
//     return gasPrice;
//   } catch (error) {
//     console.error('Error fetching gas price:', error);
//   }
// };

// // Function to calculate total cost of NFT (price + gas)
// const calculateTotalCost = (nftPrice, gasPrice) => {
//   const totalCostInEth = parseFloat(nftPrice) + parseFloat(gasPrice);
//   console.log('Total Cost (ETH):', totalCostInEth);
//   return totalCostInEth;
// };

// // Example usage:
// const fetchAndCalculate = async (contractAddress, tokenId) => {
//   console.log("testing fetchAndCalculate ")
//   try {
//     const nftData = await fetchNFTData(contractAddress, tokenId);
//     const nftPrice = nftData.sell_orders[0].current_price;  // Example: price from OpenSea
//     const gasPrice = await fetchGasPrice();
//     calculateTotalCost(nftPrice, gasPrice);
//   } catch (error) {
//     console.error('Error in fetching or calculating data:', error);
//   }
// };

// // Call example usage with specific contract address and token ID
// fetchAndCalculate('0x...', '1');  // Replace with actual contract address and token ID