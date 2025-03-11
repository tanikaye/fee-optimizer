export const nftMinting = {
  bayc: {
    name: "Bored Ape Yacht Club", // Add a name property
    contractAddress: "0xbc4ca0eda7647a8ab7c2061c2e118a18a936f13d", // BAYC contract
    abi: [
      "function mintApe(uint256 numberOfTokens)"
    ],
    functionName: "mintApe",
  },
  cryptopunks: {
    name: "CryptoPunks", // Add a name property
    contractAddress: "0xb47e3cd837dDF8e4c57F05d70Ab865de6e193BBB", // CryptoPunks contract
    abi: [
      "function mint(uint256 punkIndex)"
    ],
    functionName: "mint",
  },
  doodles: {
    name: "Doodles", // Add a name property
    contractAddress: "0x8a90CAb2b38dba80c64b7734e58Ee1dB38B8992e", // Doodles contract
    abi: [
      "function mint(uint256 numberOfTokens)"
    ],
    functionName: "mint",
  },
};
