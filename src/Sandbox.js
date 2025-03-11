import React, { useState, useEffect } from "react";
import axios from "axios";

const Sandbox = () => {
  const [nfts, setNfts] = useState([]);
  const [selectedNFT, setSelectedNFT] = useState(null);
  const [gasPrices, setGasPrices] = useState(null);

  // Fetch NFTs dynamically from OpenSea API
  useEffect(() => {
    const fetchNFTs = async () => {
      try {
        const response = await axios.get("https://api.opensea.io/api/v1/assets", {
          params: { order_direction: "desc", offset: 0, limit: 5 },
          headers: { "X-API-KEY": process.env.REACT_APP_OPENSEA_API_KEY },
        });
        setNfts(response.data.assets);
      } catch (error) {
        console.error("Error fetching NFTs:", error);
      }
    };

    fetchNFTs();
  }, []);

  // Fetch gas prices from Etherscan API
  useEffect(() => {
    const fetchGasPrices = async () => {
      try {
        const response = await axios.get("https://api.etherscan.io/api", {
          params: {
            module: "gastracker",
            action: "gasoracle",
            apikey: process.env.REACT_APP_ETHERSCAN_API_KEY,
          },
        });
        setGasPrices(response.data.result);
      } catch (error) {
        console.error("Error fetching gas prices:", error);
      }
    };

    fetchGasPrices();
  }, []);

  // Handle NFT selection
  const handleNFTSelection = (nft) => {
    setSelectedNFT(nft);
  };

  return (
    <div>
      <h2>Sandbox for NFT and Gas Price</h2>
      <div>
        <h3>Select an NFT:</h3>
        <ul>
          {nfts.map((nft) => (
            <li key={nft.token_id} onClick={() => handleNFTSelection(nft)}>
              <img src={nft.image_url} alt={nft.name} width={100} />
              <p>{nft.name || "Unnamed NFT"}</p>
            </li>
          ))}
        </ul>
      </div>
      {selectedNFT && (
        <div>
          <h3>Selected NFT</h3>
          <p>Name: {selectedNFT.name}</p>
          <p>Token ID: {selectedNFT.token_id}</p>
          <p>Contract Address: {selectedNFT.asset_contract.address}</p>
          <img src={selectedNFT.image_url} alt={selectedNFT.name} width={200} />
        </div>
      )}
      {gasPrices && (
        <div>
          <h3>Gas Prices:</h3>
          <p>Safe Gas Price: {gasPrices.SafeGasPrice} Gwei</p>
          <p>Proposed Gas Price: {gasPrices.ProposeGasPrice} Gwei</p>
          <p>Fast Gas Price: {gasPrices.FastGasPrice} Gwei</p>
        </div>
      )}
    </div>
  );
};

export default Sandbox;
