// finnhubClient.js - Finnhub API helper functions
require('dotenv').config();
const finnhub = require('finnhub');

// Configure the Finnhub SDK with our API key
const apiClient = finnhub.ApiClient.instance;
const auth = apiClient.authentications['api_key'];
auth.apiKey = process.env.FINNHUB_API_KEY;

const client = new finnhub.DefaultApi();

// ─── getQuote(symbol) ─────────────────────────────────────────────────────────────
// Fetches real-time quote: current, high, low, open, prev_close
function getQuote(symbol) {
  return new Promise((resolve, reject) => {
    client.quote(symbol, (error, data) => {
      if (error) {
        console.error(`[Finnhub] Quote error for ${symbol}:`, error.message);
        return reject(error);
      }
      resolve({
        symbol: symbol.toUpperCase(),
        current:    data.c,
        high:       data.h,
        low:        data.l,
        open:       data.o,
        prev_close: data.pc,
      });
    });
  });
}

// ─── getCandles(symbol, resolution, from, to) ─────────────────────────────────────
// Fetches OHLC candlestick data for price charting
// resolution: '1','5','15','30','60','D','W','M'
// from/to: Unix timestamps
function getCandles(symbol, resolution, from, to) {
  return new Promise((resolve, reject) => {
    client.stockCandles(symbol, resolution, from, to, {}, (error, data) => {
      if (error) {
        console.error(`[Finnhub] Candle error for ${symbol}:`, error.message);
        return reject(error);
      }
      if (data.s !== 'ok') {
        // Finnhub returns s:'no_data' if no data is available
        return resolve({ symbol, timestamps: [], close: [], open: [], high: [], low: [], volume: [] });
      }
      resolve({
        symbol: symbol.toUpperCase(),
        timestamps: data.t,  // Unix timestamps
        close:      data.c,  // Close prices
        open:       data.o,  // Open prices
        high:       data.h,  // Highs
        low:        data.l,  // Lows
        volume:     data.v,  // Volume
      });
    });
  });
}

// ─── searchSymbol(query) ────────────────────────────────────────────────────────────
// Searches for stocks by company name or symbol
// Returns top 10 US stock matches
function searchSymbol(query) {
  return new Promise((resolve, reject) => {
    client.symbolSearch(query, (error, data) => {
      if (error) {
        console.error(`[Finnhub] Search error for "${query}":`, error.message);
        return reject(error);
      }
      // Filter to US common stocks only, return top 10
      const results = (data.result || [])
        .filter(r => r.type === 'Common Stock' && !r.symbol.includes('.'))
        .slice(0, 10)
        .map(r => ({ symbol: r.symbol, name: r.description }));
      resolve(results);
    });
  });
}

module.exports = { getQuote, getCandles, searchSymbol };
