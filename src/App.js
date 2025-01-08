import React, { useState, useEffect } from "react";
import { getGasFees } from "./utils/etherscanApi";
import { fetchEthPrice } from "./utils/coinGeckoApi";
import "./App.css";
import { db } from "./firebaseConfig";
import { collection, addDoc, Timestamp } from "firebase/firestore";
import { messaging } from "./firebaseConfig"; // Import messaging
import { getToken, onMessage } from "firebase/messaging";
import { ethers } from "ethers";

const requestNotificationPermission = async () => {
  try {
    const permission = await Notification.requestPermission();
    console.log("Notification permission:", Notification.permission); // Log the permission status
    if (permission === "granted") {
      const token = await getToken(messaging, {
        vapidKey: "BNfSZB0krbJ0csxW8C2cxdP1BGqV1kT7ltxqK_VYcD3sYnGQniXDGI6RqtLBph-Qm4IdMQaG1KYdVEKM9ZAuHVE", // Replace with your actual VAPID key
      });
      console.log("Notification permission granted.");
      console.log("FCM Token:", token);
      alert("Notification permission granted. Token received!");
      // Save this token to Firestore or send it to your server for later use
    } else {
      console.error("Notification permission denied");
    }
  } catch (error) {
    console.error("Error requesting notification permission:", error);
  }
};

function App() {
  const [fees, setFees] = useState(null);
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState("average");
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState("");
  const [activeAlertThreshold, setActiveAlertThreshold] = useState("");
  const [alertType, setAlertType] = useState("low");
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [alertUnit, setAlertUnit] = useState("gwei");
  const [alertSet, setAlertSet] = useState(false);
  const [recipientAddress, setRecipientAddress] = useState("");
  const [transactionType, setTransactionType] = useState("send_eth"); // Default to ETH transfer
  const [showRecipientInput, setShowRecipientInput] = useState(false); // For "I don't know" option


  // **Add the provider instance here**
  const provider = new ethers.JsonRpcProvider(
    `https://mainnet.infura.io/v3/${process.env.REACT_APP_INFURA_API_KEY}`
  );


  // Fetch and update ETH price
  useEffect(() => {
    const updateEthPrice = async () => {
      const price = await fetchEthPrice(); // Fetch ETH price
      setEthPrice(price); // Set ETH price in state
      console.log("checking real ethereum price: ", price, ethPrice);

    };

    updateEthPrice();

    // Refresh ETH price periodically
    const interval = setInterval(updateEthPrice, 30000); // Update every 30 seconds
    return () => clearInterval(interval); // Cleanup
  }, []);

  console.log("checking ethPrice: ", ethPrice);


  // Fetch gas fees and monitor alerts
  useEffect(() => {
    const fetchFees = async () => {
      const data = await getGasFees();
      setFees(data);

      if (alertSet && activeAlertThreshold && alertType) {
        const currentFee =
          alertType === "low"
            ? data.SafeGasPrice
            : alertType === "average"
            ? data.ProposeGasPrice
            : data.FastGasPrice;

        const feeInUsd = (currentFee / 1e9) * ethPrice;

        const thresholdMet =
          alertUnit === "gwei"
            ? Number(currentFee) < Number(activeAlertThreshold)
            : Number(feeInUsd) < Number(activeAlertThreshold);

        if (thresholdMet && !alertTriggered) {
          alert(
            `Gas fee for ${alertType.toUpperCase()} is now below ${
              alertUnit === "gwei" ? `${activeAlertThreshold} Gwei` : `$${activeAlertThreshold}`
            }!`
          );
          setAlertTriggered(true); // Prevent repeated alerts
        }
      }
    };

    fetchFees();
    const interval = setInterval(fetchFees, 7000); // Refresh every 7 seconds
    return () => clearInterval(interval);
  }, [activeAlertThreshold, alertType, alertTriggered, alertUnit, ethPrice, alertSet]);



  useEffect(() => {
    const unsubscribe = onMessage(messaging, (payload) => {
      console.log("Message received in foreground: ", payload);
    });
    return unsubscribe; // Cleanup the listener on unmount
  }, []);



  const calculateFee = async () => {
    if (
      !fees ||
      (
        (transactionType === "transfer_erc20" || transactionType === "swap_tokens" || transactionType === "mint_nft") &&
        !amount
      )
    ) {
      alert("Please fill in all required fields.");
      return;
    }

    try {
      let gasEstimate;

      // Handle transaction types
      if (transactionType === "send_eth") {
        gasEstimate = 21000; // Simple ETH transfer
      } else if (transactionType === "transfer_erc20") {
        // Add logic for ERC-20 transfer
        alert("ERC-20 transfer gas estimation is not yet available. Coming soon!");
        return;
      } else if (transactionType === "swap_tokens") {
        alert("Token swap gas estimation is not yet available. Coming soon!");
        return;
      } else if (transactionType === "mint_nft") {
        alert("NFT minting gas estimation is not yet available. Coming soon!");
        return;
      } else if (transactionType === "unknown") {
        // Use recipient address to detect type
        if (!recipientAddress) {
          alert("Please enter a recipient address.");
          return;
        }
        const code = await provider.getCode(recipientAddress);
          if (code === "0x") {
            // Wallet (EOA) detected
            gasEstimate = 21000;
          } else {
            // Smart contract detected
            alert(
              "Recipient address is a smart contract. Smart contract fee estimation is not yet available. Coming soon!"
            );
            return;
          }
      }

      const gasPriceGwei =
        feeType === "low"
          ? fees.SafeGasPrice
          : feeType === "average"
          ? fees.ProposeGasPrice
          : fees.FastGasPrice;

      const gasPriceEth = gasPriceGwei / 1e9; // Convert Gwei to ETH
      const estimatedGasFeeEth = gasPriceEth * gasEstimate;
      const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice;

      setCalculatedFee({
        eth: estimatedGasFeeEth.toFixed(8),
        gwei: gasEstimate.toLocaleString(),
        usd: estimatedGasFeeUsd.toFixed(2),
      });
    } catch (error) {
      console.error("Error estimating gas:", error);
      alert("Failed to estimate gas. Please check your input.");
    }
  };



  const saveAlertToFirestore = async () => {
    if (!alertThreshold || !alertType) {
      alert("Please set a valid fee threshold.");
      return;
    }

    try {
      const currentFee =
        alertType === "low"
          ? fees?.SafeGasPrice
          : alertType === "average"
          ? fees?.ProposeGasPrice
          : fees?.FastGasPrice;

      const feeInUsd = (currentFee / 1e9) * ethPrice;

      const thresholdMet =
        alertUnit === "gwei"
          ? Number(currentFee) < Number(alertThreshold)
          : Number(feeInUsd) < Number(alertThreshold);

      // Notify if the threshold is already met
      if (thresholdMet) {
        alert(
          `Gas fee for ${alertType.toUpperCase()} is already below ${
            alertUnit === "gwei" ? `${alertThreshold} Gwei` : `$${alertThreshold}`
          }. No alert was set.`
        );
        return; // Do not save the alert
      }

      // Save the alert to Firestore
      await addDoc(collection(db, "alerts"), {
        createdAt: Timestamp.now(),
        feeType: alertType,
        threshold: parseFloat(alertThreshold),
        thresholdType: alertUnit === "gwei" ? "Gwei" : "USD",
        userId: "testUser123",
      });

      alert("Alert successfully saved!");
      setActiveAlertThreshold(alertThreshold); // Update active threshold here
      setAlertSet(true); // Activate alert monitoring
      setAlertTriggered(false); // Reset alert trigger
    } catch (error) {
      console.error("Error saving alert:", error);
      alert("Failed to save the alert.");
    }
  };






  return (
    <div>
      <header>
        <h1>Nivio</h1>
        <nav>
          <div className="about-container">
            <a href="#" className="about-link">About</a>
            <div className="about-tooltip">
              <p>
                Nivio helps users track Ethereum gas fees in real time, calculate transaction costs,
                and set alerts for when fees drop below a desired threshold.
                Stay ahead of the market and optimize your transactions effortlessly.
              </p>
            </div>
          </div>
        </nav>
      </header>
      <main>
        <h2>Optimize Your Transaction Fees</h2>
        <div>
          <h3>Enable Notifications</h3>
          <button onClick={requestNotificationPermission}>Enable Notifications</button>
        </div>
        {fees && ethPrice ? (
          <div>
            <p>
              Low Fee: {fees.SafeGasPrice} Gwei (
              {(fees.SafeGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.SafeGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <p>
              Average Fee: {fees.ProposeGasPrice} Gwei (
              {(fees.ProposeGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.ProposeGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <p>
              High Fee: {fees.FastGasPrice} Gwei (
              {(fees.FastGasPrice / 1e9).toFixed(8)} ETH, $
              {((fees.FastGasPrice / 1e9) * ethPrice).toFixed(2)})
            </p>
            <div>
            <div className="tooltip-container">
              <h3>Calculate Gas Fee</h3>
              <div className="tooltip">
                This functionality allows you to estimate the gas fee required for an Ethereum transaction.
                Enter the recipient's address, the transaction amount in ETH, and select the gas fee type (low, average, or high).
                Click "Calculate Fee" to view the estimated transaction cost in ETH, Gwei, and USD.
              </div>
            </div>


            <div>
              <h3>Select Transaction Type</h3>
              <select
                value={transactionType}
                onChange={(e) => {
                  setTransactionType(e.target.value);
                  setShowRecipientInput(e.target.value === "unknown");
                }}
              >
                <option value="send_eth">Send ETH</option>
                <option value="transfer_erc20">Transfer ERC-20 Token</option>
                <option value="swap_tokens">Swap Tokens on Uniswap</option>
                <option value="mint_nft">Mint NFT</option>
                <option value="unknown">I don’t know the transaction type</option>
              </select>

              {/* Show recipient address input only if "I don’t know" is selected */}
              {showRecipientInput && (
                <input
                  type="text"
                  placeholder="Enter Recipient Address"
                  value={recipientAddress}
                  onChange={(e) => setRecipientAddress(e.target.value)}
                  style={{ width: "300px", marginBottom: "10px" }}
                />
              )}

              {/* Other inputs based on transaction type */}
              {(transactionType === "transfer_erc20" || transactionType === "swap_tokens" || transactionType === "mint_nft") && (
                <input
                  type="number"
                  placeholder="Transaction Amount (ETH)"
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  style={{ width: "200px" }}
                />
              )}
              {/* Gas fee level selection */}
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                  <option value="low">Low</option>
                  <option value="average">Average</option>
                  <option value="high">High</option>
                </select>

                <button onClick={calculateFee}>Calculate Fee</button>

            </div>

              {calculatedFee && (
                <div>
                  <p>Estimated Gas Fee:</p>
                  <p><strong>{calculatedFee.eth} ETH</strong></p>
                  <p><strong>{calculatedFee.gwei} Gwei</strong></p>
                  <p><strong>${calculatedFee.usd} USD</strong></p>
                </div>
              )}
            </div>
            <div>
              <h3>Set Fee Alert</h3>
              <input
                type="number"
                placeholder={`Set Fee Threshold (${alertUnit.toUpperCase()})`}
                value={alertThreshold}
                onChange={(e) => setAlertThreshold(e.target.value)}
                style={{ width: "200px" }}
              />
              <select value={alertUnit} onChange={(e) => setAlertUnit(e.target.value)}>
                <option value="gwei">Gwei</option>
                <option value="usd">USD</option>
              </select>
              <select value={alertType} onChange={(e) => setAlertType(e.target.value)}>
                <option value="low">Low</option>
                <option value="average">Average</option>
                <option value="high">High</option>
              </select>
              <button onClick={saveAlertToFirestore}>Set Alert</button>
            </div>
          </div>
        ) : (
          <p>Loading fee data...</p>
        )}
      </main>
      <footer>
        <p>© 2024 Nivio. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;
