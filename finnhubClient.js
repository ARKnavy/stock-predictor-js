// finnhubClient.js
// This file sets up the Finnhub API client and exports helper functions
// to fetch stock data. Other files (like index.js) import from here.

// Load environment variables from .env so we can read FINNHUB_API_KEY
require('dotenv').config();

// Import the official Finnhub JavaScript SDK
const finnhub = require('finnhub');

// --- Configure the Finnhub client with our API key ---
// The SDK uses a global ApiClient with an auth object.
const apiClient = finnhub.ApiClient.instance;
const auth = apiClient.authentications['api_key'];
auth.apiKey = process.env.FINNHUB_API_KEY; // read from .env

// Create one reusable instance of the DefaultApi
const finnhubClient = new finnhub.DefaultApi();

/**
 * getQuote(symbol)
 * Fetches real-time quote data for a stock symbol from Finnhub.
 *
 * @param {string} symbol - Stock ticker, e.g. "AAPL", "TSLA"
 * @returns {Promise<Object>} - Resolves with a clean quote object:
 *   { symbol, current, high, low, open, prev_close }
 */
function getQuote(symbol) {
  return new Promise((resolve, reject) => {
    // Call the Finnhub /quote endpoint
    finnhubClient.quote(symbol, (error, data, response) => {
      if (error) {
        // Log the error and reject the Promise so the caller can handle it
        console.error(`[Finnhub] Error fetching quote for ${symbol}:`, error.message);
        return reject(error);
      }

      // Finnhub returns: c=current, h=high, l=low, o=open, pc=prev_close
      // We rename them to friendlier keys before returning
      const quote = {
        symbol:     symbol.toUpperCase(),
        current:    data.c,   // current price
        high:       data.h,   // day high
        low:        data.l,   // day low
        open:       data.o,   // opening price
        prev_close: data.pc,  // previous close
      };

      console.log(`[Finnhub] Got quote for ${symbol}: $${data.c}`);
      resolve(quote);
    });
  });
}

// Export the function so index.js (and any future files) can use it
module.exports = { getQuote };
