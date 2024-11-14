import React, { useEffect, useState } from 'react';
import { wma, ema, sma } from 'technicalindicators';
import axios from 'axios';

import FCChart from './FCChart'
import './ToolHeader.css';

import { symbolData } from "./symbolData";
import { klinesData } from "./klinesData";

const defaultSymbol = symbolData;
const defaultKlines = klinesData;
const defaultStart = { 
    minitus : ['1m', '3m', '5m', '15m', '30m'],
    hour : ['1h', '3d', '4h', '6h', '8h', '12h'],
    day : ['1d', '1w', '1M']
}
const defaultTime = ['1m', '30m', '1h'];
const defaultAverage = ['WMA', 'EMA', 'SMA', 'TMA', 'CandlestickSeries'];

const annotations = [
    { type: "buy", price: 67.798, timestamp: "2024-11-10T17:00:00.000Z" },
    { type: "sell", price: 68.293, timestamp: "2024-11-10T17:00:00.000Z" },
    // Add more buy/sell points as needed
];

const calculateEMA = (data, period) => {
    return ema({ period, values: data });
};

const calculateTEMA = (data, period) => {
    const ema1 = calculateEMA(data, period);
    const ema2 = calculateEMA(ema1, period);
    const ema3 = calculateEMA(ema2, period);
    
    const tema = ema1.map((value, index) => {
      if (index >= 2) {
        return 3 * value - 3 * ema2[index] + ema3[index];
      }
      return null;
    });
    return tema;
};

const calculateIndicators = (data, period) => {
    const prices = data.map(item => item.close);
  
    const wmaValues = wma({ period, values: prices });
    const emaValues = calculateEMA(prices, period);
    const smaValues = sma({ period, values: prices });
    const temaValues = calculateTEMA(prices, period);
  
    return {
      wma: wmaValues,
      ema: emaValues,
      sma: smaValues,
      tema: temaValues
    };
};

const expertAnalyzeData = (data) => {
    let analysisResult = [];
    const period = 9; // Example period for moving averages
    const { wma, ema, sma, tema } = calculateIndicators(data, period);
  
    let buySellCount = 0;
  
    for (let i = 1; i < data.length; i++) {
      let buySellAction = '';
      let explanation = '';
      let closePrice = data[i].close;
  
      let prevWMA = wma[i - 1], currWMA = wma[i];
      let prevTEMA = tema[i - 1], currTEMA = tema[i];
      let prevEMA = ema[i - 1], currEMA = ema[i];
  
      // Expert Analysis Logic: Trend Analysis with psychological context
      if (currTEMA > prevTEMA && currWMA > prevWMA) {
        buySellAction = 'buy';
        explanation = `
          **Bullish Momentum Acceleration**: The market has shown a clear acceleration in bullish momentum, with TEMA's upward curve reinforcing the strength of the trend. 
          WMA's confirmation of an uptrend supports this, suggesting that momentum is not only continuing but gaining steam. 
          The market is entering a phase of **price discovery**, where buying pressure could force prices to break through resistance levels. This aligns with institutional buy-side activity, indicating **confidence** in further upside potential.
        `;
      } else if (currTEMA < prevTEMA && currWMA < prevWMA) {
        buySellAction = 'sell';
        explanation = `
          **Bearish Reversal in Progress**: TEMA and WMA have both indicated a **strong bearish reversal**, signaling that the market’s earlier uptrend is losing steam. 
          As price action shifts downward, this suggests that the prevailing trend is exhausting itself. 
          **Sell orders** are likely to flood the market as traders lock in profits, fearing further downside. 
          This could mark the beginning of a **correction phase** or even a **trend shift** into a sustained downtrend.
        `;
      }
  
      // Golden Cross: TEMA crosses above WMA
      if (currTEMA > prevTEMA && currWMA > prevWMA && prevWMA < prevEMA) {
        buySellAction = 'buy';
        explanation = `
          **Golden Cross - Bullish Breakout Signal**: The market has encountered a classic Golden Cross, with TEMA (a faster, more sensitive indicator) decisively crossing above the slower WMA. 
          This technical pattern signals that a bullish trend is not just forming but is likely to **gain momentum**. 
          The convergence of both TEMA and WMA suggests the market is transitioning into a **sustained rally**, driven by **institutional demand** and **bullish sentiment**.
          Expect **higher volatility** as the market moves to test new highs.
        `;
      }
  
      // Dead Cross: TEMA crosses below WMA
      if (currTEMA < prevTEMA && currWMA < prevWMA && prevWMA > prevEMA) {
        buySellAction = 'sell';
        explanation = `
          **Dead Cross - Bearish Exhaustion**: A classic Dead Cross has appeared, indicating a severe shift in sentiment from bullish to bearish. 
          TEMA crossing below WMA marks the beginning of a **bearish price discovery phase**, where sellers dominate.
          This suggests that **market participants** are exiting their long positions, and **institutional traders** are likely hedging. 
          The increasing **sell-off pressure** could lead to a **downtrend continuation** or even a **price collapse** if momentum remains strong.
        `;
      }
  
      // Trend Exhaustion: Indicators flattening
      if (Math.abs(currTEMA - prevTEMA) < 0.00005 && Math.abs(currWMA - prevWMA) < 0.00005) {
        buySellAction = 'neutral';
        explanation = `
          **Trend Exhaustion - Market Consolidation**: The flattening of both TEMA and WMA signals the **exhaustion of the current trend**. The market has entered a phase of consolidation, where price action is less directional. 
          **Market participants** may be waiting for a **catalyst** to drive the next move. The low volatility suggests that traders are hesitant, and **volume** may decline as price action becomes range-bound. 
          This is a period of uncertainty where a breakout in either direction could set the stage for the next major trend.
        `;
      }
  
      // Increment sequence
      if (buySellAction) {
        buySellCount++;
  
        analysisResult.push({
          sequence: buySellCount,
          action: buySellAction,
          price: closePrice,
          explanation: explanation,
        });
      }
    }
  
    return analysisResult;
};

const Pagination = ({ currentPage, totalPages, onPageChange }) => (
  <div className="pagination">
      <button 
          className='previous'
          onClick={() => onPageChange(currentPage - 1)} 
          disabled={currentPage === 1}
      >
          Previous
      </button>
      <span className='info'>Page {currentPage} of {totalPages}</span>
      <button 
          className='next'
          onClick={() => onPageChange(currentPage + 1)} 
          disabled={currentPage === totalPages}
      >
          Next
      </button>
  </div>
);

const Backtesting = () => {

    const [tradeAnalysis, setTradeAnalysis] = useState([]);
    const [currentPage, setCurrentPage] = useState(1);
    const rowsPerPage = 5;

    const indexOfLastRow = currentPage * rowsPerPage;
    const indexOfFirstRow = indexOfLastRow - rowsPerPage;
    const currentData = tradeAnalysis.slice(indexOfFirstRow, indexOfLastRow);
    const totalPages = Math.ceil(tradeAnalysis.length / rowsPerPage);

    const [symbol, setSymbol] = useState(defaultSymbol)
    const [klines, setKlines] = useState(defaultKlines)
    const [state, setState] = useState({
        symbol : 'BNBUSDT',
        time   : '1m',
    });
    const [moveAverages, setMoveAverages] = useState({
        WMA                 :    true,
        EMA                 :    true,
        SMA                 :    true,
        TMA                 :    true,
        CandlestickSeries   :    true
    });
    const [loading, setLoading] = useState(true);

    const handlePageChange = (newPage) => {
        setCurrentPage(newPage);
    };

    const handleButtonClick = (e) => {
        const { name, innerText } = e.target;
        handleChange(name, innerText);
    };

    const handleSelectChange = (e) => {
        const { name, value } = e.target;
        handleChange(name, value);
    };

    const handleChange  = (key, val) => {
        setState((prevState) => ({
            ...prevState,
            [key]: val, // Dynamically set the property
        }));
    };

    const handleCheckChange = (e) => {
        const { name, checked } = e.target;
        setMoveAverages((prevState) => ({
            ...prevState,
            [name]: checked,
        }));
    };

    const fetchSymbol = async () => {
        // try {
        //   const response = await axios.get('https://api.binance.us/api/v3/ticker/price');
        //   setSymbol(response.data);
        // } catch (err) {
        //   console.error(err);
        // } finally {
        //   setLoading(false);
        // }
    };

    const fetchKlines = async () => {
        // try {
        //   const response = await axios.get(`https://api.binance.us/api/v3/klines?symbol=${state.symbol}&interval=${state.time}`);
        //   setKlines(response.data);
        // } catch (err) {
        //   console.error(err);
        // } finally {
        //   setLoading(false);
        // }
    };

    useEffect(() => {
        fetchSymbol();
    }, [])

    useEffect(() => {
        fetchKlines();
        // setKlines(changeData)
        // console.log("This is a Parent.");
    }, [state]);

    // Analyzing the trade data
    useEffect(() => {
      if (klines.length > 0) {
        const analysis = expertAnalyzeData(klines);
        setTradeAnalysis(analysis);
      }
    }, [klines]);

    return(
        <>
            <div className='chart-header'>
                <div className='btn-group-symbol'>
                    <select 
                        className='tool-form' 
                        name="symbol"
                        onChange={handleSelectChange}
                    >
                    {symbol.map((cureency, idx) => (
                        <option 
                            key={idx} 
                            value={cureency.symbol}
                        >   {`${cureency.symbol} ${cureency.price}`}
                        </option>
                    ))}
                    </select>
                </div>
                <div className='btn-group-time'>
                    {defaultTime.map((time, idx) => (
                        <button 
                            className='tool-bar-time'
                            id={`tool_time_bar_${time}`}
                            key={idx}
                            name={`time`}
                            onClick={handleButtonClick}
                        >
                            {time}
                        </button>
                    ))}
                </div>
                <div className='btn-group-start'>
                    <select 
                        className='tool-form'
                        name="time"
                        onChange={handleSelectChange}
                    >
                    {defaultStart.minitus.map((minitus, idx) => (
                        <option key={idx} id={`tool-start_m_${minitus}`}>{minitus}</option>
                    ))}
                    {defaultStart.hour.map((hour, idx) => (
                        <option key={idx} id={`tool-start_h_${hour}`}>{hour}</option>
                    ))}
                    {defaultStart.day.map((day, idx) => (
                        <option key={idx} id={`tool-start_d_${day}`}>{day}</option>
                    ))}
                    </select>
                </div>
                <div className='check-average-group'>
                    {defaultAverage.map((aver, idx) => (
                        <div key={idx} className='tool-check-group'>
                            <input 
                                type='checkbox' 
                                className='tool-form'
                                name={aver}
                                checked={moveAverages[aver]}
                                onChange={handleCheckChange}
                            />
                            <span>{aver}</span>
                        </div>
                    ))}
                </div>
            </div>
            <FCChart prKlines={klines} prMoveAverages={moveAverages} />
            <div className='trade-analyze'>
              <h2>Trade Analysis</h2>
              <div className='trade-analyze-pagination'>
                <Pagination 
                  currentPage={currentPage} 
                  totalPages={totalPages} 
                  onPageChange={handlePageChange} 
                />
              </div>
                <table className="trade-table">
                    <thead>
                        <tr>
                            <th>Timestamp</th>
                            <th>Action</th>
                            <th>Price</th>
                            <th>Explanation</th>
                        </tr>
                    </thead>
                    <tbody>
                    {currentData.map((entry, idx) => (
                        <tr key={idx}>
                        <td>{entry.sequence}</td>
                        <td>{entry.action}</td>
                        <td>{entry.price}</td>
                        <td>{entry.explanation}</td>
                        </tr>
                    ))}
                    </tbody>
                </table>
            </div>
        </>
    );
}

export default Backtesting