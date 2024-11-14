import React, { useEffect, useState } from 'react';

// klinesData for testing
import { klinesData } from "./klinesData";

// Helper functions for moving averages

const calculateEMA = (klinesData, period) => {
  const result = [];
  if (klinesData.length === 0) return result;

  let multiplier = 2 / (period + 1);
  result.push(klinesData[0].close); // First value is just the close of the first candle
  for (let i = 1; i < klinesData.length; i++) {
    if (klinesData[i].close === undefined) continue; // Skip if close is undefined
    result.push((klinesData[i].close - result[i - 1]) * multiplier + result[i - 1]);
  }
  return result;
};

const calculateTEMA = (klinesData, period) => {
  const ema1 = calculateEMA(klinesData, period);
  const ema2 = calculateEMA(ema1, period);
  const ema3 = calculateEMA(ema2, period);
  return ema1.map((v, i) => {
    if (i < period - 1 || ema2[i] === undefined || ema3[i] === undefined) {
      return null;
    }
    return 3 * v - 3 * ema2[i] + ema3[i];
  });
};

const calculateWMA = (klinesData, period) => {
  const result = [];
  const weights = Array.from({ length: period }, (_, index) => period - index);
  for (let i = 0; i < klinesData.length; i++) {
    if (klinesData[i].close === undefined) continue; // Skip if close is undefined
    if (i + 1 < period) {
      result.push(null); // Not enough klinesData for WMA
    } else {
      const weightedSum = klinesData.slice(i + 1 - period, i + 1).reduce((acc, curr, idx) => acc + curr.close * weights[idx], 0);
      const weightSum = weights.reduce((acc, w) => acc + w, 0);
      result.push(weightedSum / weightSum);
    }
  }
  return result;
};

const calculateLSMA = (klinesData, period) => {
  const result = [];
  for (let i = 0; i < klinesData.length; i++) {
    if (i + 1 < period) {
      result.push(null); // Not enough klinesData for LSMA
    } else {
      const x = Array.from({ length: period }, (_, idx) => idx);
      const y = klinesData.slice(i + 1 - period, i + 1).map(d => d.close);
      const n = period;
      const xSum = x.reduce((acc, v) => acc + v, 0);
      const ySum = y.reduce((acc, v) => acc + v, 0);
      const xySum = x.reduce((acc, v, idx) => acc + v * y[idx], 0);
      const xSquareSum = x.reduce((acc, v) => acc + v * v, 0);
      const slope = (n * xySum - xSum * ySum) / (n * xSquareSum - xSum * xSum);
      const intercept = (ySum - slope * xSum) / n;
      const lsmaValue = slope * (period - 1) + intercept; // Last point's predicted value
      result.push(lsmaValue);
    }
  }
  return result;
};

const generateTradingLogic = (klinesData) => {
  const wma = calculateWMA(klinesData, 3); // Calculate 3-period WMA
  const tema = calculateTEMA(klinesData, 3); // Calculate 3-period TEMA
  const lsma = calculateLSMA(klinesData, 3); // Calculate 3-period LSMA

  const signals = [];
  let previousSignal = null;

  // Ensure valid klinesData before proceeding
  if (wma.length === 0 || tema.length === 0 || lsma.length === 0) {
    console.log("Invalid klinesData or insufficient klinesData for calculations.");
    return signals; // No signals if no valid klinesData
  }

  // Analyze trend changes and generate buy/sell signals
  for (let i = 1; i < klinesData.length; i++) {
    // Only proceed if all values for the moving averages are valid
    if (wma[i] === null || tema[i] === null || lsma[i] === null) continue;

    const buySignal = tema[i] > tema[i - 1] && wma[i] > wma[i - 1] && lsma[i] > lsma[i - 1];
    const sellSignal = tema[i] < tema[i - 1] && wma[i] < wma[i - 1] && lsma[i] < lsma[i - 1];

    if (buySignal && previousSignal !== 'buy') {
      signals.push({
        action: 'buy',
        price: klinesData[i].close,
        timestamp: klinesData[i].timestamp,
        explanation: 'TEMA has changed from a downward trend to an upward trend, and WMA and LSMA are both trending upward.',
      });
      previousSignal = 'buy';
    }

    if (sellSignal && previousSignal !== 'sell') {
      signals.push({
        action: 'sell',
        price: klinesData[i].close,
        timestamp: klinesData[i].timestamp,
        explanation: 'TEMA has changed from an upward trend to a downward trend, and WMA and LSMA are both trending downward.',
      });
      previousSignal = 'sell';
    }
  }
  return signals;
};

const TradingSgnals = () => {
  const [tradingLog, setTradingLog] = useState([]);

  useEffect(() => {
    const signals = generateTradingLogic(klinesData);
    setTradingLog(signals);
  }, []);

  return (
    <div>
      <h3>Trading Logic</h3>
      <table>
        <thead>
          <tr>
            <th>#</th>
            <th>Action</th>
            <th>Price</th>
            <th>Timestamp</th>
            <th>Explanation</th>
          </tr>
        </thead>
        <tbody>
          {tradingLog.map((log, index) => (
            <tr key={index}>
              <td>{index + 1}</td>
              <td>{log.action}</td>
              <td>{log.price}</td>
              <td>{new Date(log.timestamp).toLocaleString()}</td>
              <td>{log.explanation}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default TradingSgnals;
