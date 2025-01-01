import React, { useState, useEffect } from "react";
import { getGasFees } from "./utils/etherscanApi";
import "./App.css";
import { db } from "./firebaseConfig"; // Your Firebase config
import { collection, addDoc, Timestamp } from "firebase/firestore";

function App() {
  const [fees, setFees] = useState(null);
  const [amount, setAmount] = useState("");
  const [feeType, setFeeType] = useState("average");
  const [calculatedFee, setCalculatedFee] = useState(null);
  const [ethPrice, setEthPrice] = useState(null);
  const [alertThreshold, setAlertThreshold] = useState("");
  const [alertType, setAlertType] = useState("low");
  const [alertTriggered, setAlertTriggered] = useState(false);
  const [alertUnit, setAlertUnit] = useState("gwei"); // Gwei or USD

  useEffect(() => {
    const fetchFees = async () => {
      const data = await getGasFees();
      setFees(data);
      setEthPrice(2000); // Simulating ETH price; replace with live fetching

      // Check if the alert should be triggered
      if (alertThreshold && alertType) {
        const currentFee =
          alertType === "low"
            ? data.SafeGasPrice
            : alertType === "average"
            ? data.ProposeGasPrice
            : data.FastGasPrice;

        const feeInUsd = (currentFee / 1e9) * ethPrice;

        const thresholdMet =
          alertUnit === "gwei"
            ? currentFee < alertThreshold
            : feeInUsd < alertThreshold;

        if (thresholdMet && !alertTriggered) {
          alert(
            `Gas fee for ${alertType.toUpperCase()} is now below ${
              alertUnit === "gwei" ? `${alertThreshold} Gwei` : `$${alertThreshold}`
            }!`
          );
          setAlertTriggered(true); // Prevent multiple alerts
        }
      }
    };

    fetchFees();
    const interval = setInterval(fetchFees, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, [alertThreshold, alertType, alertTriggered, alertUnit, ethPrice]);

  const calculateFee = () => {
    if (!fees || !amount) {
      alert("Please enter a valid transaction amount.");
      return;
    }

    const gasPriceGwei =
      feeType === "low"
        ? fees.SafeGasPrice
        : feeType === "average"
        ? fees.ProposeGasPrice
        : fees.FastGasPrice;

    const gasPriceEth = gasPriceGwei / 1e9; // Convert Gwei to ETH
    const estimatedGasLimit = 200000; // Estimated gas limit for token swaps
    const estimatedGasFeeEth = gasPriceEth * estimatedGasLimit; // Gas fee in ETH
    const estimatedGasFeeUsd = estimatedGasFeeEth * ethPrice; // Gas fee in USD

    setCalculatedFee({
      eth: estimatedGasFeeEth.toFixed(8),
      gwei: (gasPriceGwei * estimatedGasLimit).toLocaleString(),
      usd: estimatedGasFeeUsd.toFixed(2),
    });
  };

  const saveAlertToFirestore = async () => {
    if (!alertThreshold || !alertType) {
      alert("Please set a valid fee threshold.");
      return;
    }

    try {
      await addDoc(collection(db, "alerts"), {
        createdAt: Timestamp.now(),
        feeType: alertType, // 'low', 'average', or 'high'
        threshold: parseFloat(alertThreshold),
        thresholdType: alertUnit === "gwei" ? "Gwei" : "USD", // 'Gwei' or 'USD'
        userId: "testUser123", // Replace with a dynamic user ID if needed
      });
      alert("Alert successfully saved to Firestore!");
    } catch (error) {
      console.error("Error saving alert:", error);
      alert("Failed to save the alert.");
    }
  };

  return (
    <div>
      <header>
        <h1>Fee Optimizer</h1>
        <nav>
          <a href="#">Track Fees</a> | <a href="#">Optimize</a> | <a href="#">About</a>
        </nav>
      </header>
      <main>
        <h2>Optimize Your Transaction Fees</h2>
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
              <h3>Calculate Gas Fee</h3>
              <input
                type="number"
                placeholder="Transaction Amount (ETH)"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                style={{ width: "200px" }}
              />
              <select value={feeType} onChange={(e) => setFeeType(e.target.value)}>
                <option value="low">Low</option>
                <option value="average">Average</option>
                <option value="high">High</option>
              </select>
              <button onClick={calculateFee}>Calculate Fee</button>
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
        <p>© 2024 Fee Optimizer. All Rights Reserved.</p>
      </footer>
    </div>
  );
}

export default App;
