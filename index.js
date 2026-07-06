// index.js
// Main entry point for the stock predictor backend.
// Run this file with: node index.js

// Step 1: Load environment variables from the .env file
// This must be called before anything else so process.env is populated
require('dotenv').config();

// Step 2: Import Express (our web framework) and the Finnhub helper
const express = require('express');
const { getQuote } = require('./finnhubClient');

// Step 3: Create the Express app and set the port
const app = express();
const PORT = process.env.PORT || 3000;

// Tell Express to automatically parse JSON request bodies
app.use(express.json());

// ─────────────────────────────────────────────
// ROUTE 1: GET /
// Health check - just confirms the server is running
// ─────────────────────────────────────────────
app.get('/', (req, res) => {
  res.send('Stock predictor backend is running');
});

// ─────────────────────────────────────────────
// ROUTE 2: GET /api/quote?symbol=XYZ
// Returns a real-time quote for a single stock symbol.
// If no symbol is provided, defaults to AAPL.
//
// Example: GET /api/quote?symbol=TSLA
// ─────────────────────────────────────────────
app.get('/api/quote', async (req, res) => {
  // Read the ?symbol= query param; fall back to AAPL if missing
  const symbol = req.query.symbol || 'AAPL';

  try {
    const quote = await getQuote(symbol);
    res.json(quote);
  } catch (error) {
    console.error('[Route /api/quote] Failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// ─────────────────────────────────────────────
// ROUTE 3: GET /api/quotes
// Returns quotes for a default list of popular stocks.
// This is the base for future scoring and ranking logic.
//
// Example: GET /api/quotes
// ─────────────────────────────────────────────

// Default list of stock symbols to track
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN'];

app.get('/api/quotes', async (req, res) => {
  try {
    // Fetch all quotes in parallel using Promise.all
    // This is faster than fetching them one-by-one in a loop
    const quotes = await Promise.all(
      DEFAULT_SYMBOLS.map(symbol => getQuote(symbol))
    );
    res.json(quotes);
  } catch (error) {
    console.error('[Route /api/quotes] Failed:', error.message);
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// ─────────────────────────────────────────────
// Start the server
// ─────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`  GET /                    -> health check`);
  console.log(`  GET /api/quote?symbol=X  -> single stock quote`);
  console.log(`  GET /api/quotes          -> quotes for ${DEFAULT_SYMBOLS.join(', ')}`);
});
