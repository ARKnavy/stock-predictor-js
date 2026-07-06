// index.js - Stock Predictor Backend
require('dotenv').config();
const express = require('express');
const path = require('path');
const { getQuote, getCandles, searchSymbol } = require('./finnhubClient');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(express.json());
// Serve the frontend UI from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));

// Default watchlist
const DEFAULT_SYMBOLS = ['AAPL', 'MSFT', 'TSLA', 'GOOGL', 'AMZN', 'NVDA', 'META', 'NFLX'];

// ─── ROUTE: GET / ───────────────────────────────────────────────────────────
// Serves the frontend UI (public/index.html)
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// ─── ROUTE: GET /api/quote?symbol=XYZ ───────────────────────────────────────
app.get('/api/quote', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  try {
    const quote = await getQuote(symbol);
    res.json(quote);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch quote' });
  }
});

// ─── ROUTE: GET /api/quotes ──────────────────────────────────────────────────
app.get('/api/quotes', async (req, res) => {
  try {
        const quotes = await Promise.all(DEFAULT_SYMBOLS.map(s => getQuote(s)));
    const withChanges = quotes.map(q => ({...q, change_pct: q.prev_close > 0 ? ((q.current - q.prev_close) / q.prev_close) * 100 : 0 }));
    res.json(withChanges);catch (err) {
    res.status(500).json({ error: 'Failed to fetch quotes' });
  }
});

// ─── ROUTE: GET /api/search?q=apple ─────────────────────────────────────────
// Search for a stock ticker by company name or symbol
app.get('/api/search', async (req, res) => {
  const query = req.query.q || '';
  if (!query) return res.json({ results: [] });
  try {
    const results = await searchSymbol(query);
    res.json({ results });
  } catch (err) {
    res.status(500).json({ error: 'Search failed' });
  }
});

// ─── ROUTE: GET /api/candles?symbol=AAPL&period=30 ──────────────────────────
// Returns OHLC candle data for charting. period = days back (7, 30, 90, 365)
app.get('/api/candles', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  const period = parseInt(req.query.period) || 30;
  const resolution = period <= 7 ? '60' : period <= 30 ? 'D' : 'W';
  const to = Math.floor(Date.now() / 1000);
  const from = to - period * 24 * 60 * 60;
  try {
    const candles = await getCandles(symbol, resolution, from, to);
    res.json(candles);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch candle data' });
  }
});

// ─── ROUTE: GET /api/analyze?symbol=AAPL ────────────────────────────────────
// Scores a stock using momentum, volatility, and trend signals
app.get('/api/analyze', async (req, res) => {
  const symbol = (req.query.symbol || 'AAPL').toUpperCase();
  try {
    const quote = await getQuote(symbol);
    const score = scoreStock(quote);
    res.json({ ...quote, ...score });
  } catch (err) {
    res.status(500).json({ error: 'Analysis failed' });
  }
});

// ─── ROUTE: GET /api/recommend?horizon=short|medium|long ────────────────────
// Recommends the best stock from the watchlist for a given time horizon
// horizon: 'short' (1 week), 'medium' (1 month), 'long' (1 year)
// targetDate: optional ISO date string e.g. 2025-12-31
app.get('/api/recommend', async (req, res) => {
  const horizon = req.query.horizon || 'medium';
  const targetDate = req.query.targetDate || null;
  const symbols = req.query.symbols
    ? req.query.symbols.split(',').map(s => s.trim().toUpperCase())
    : DEFAULT_SYMBOLS;

  try {
    const quotes = await Promise.all(symbols.map(s => getQuote(s)));
    const scored = quotes.map(q => ({ ...q, ...scoreStock(q, horizon) }));

    // Sort by composite score descending
    scored.sort((a, b) => b.compositeScore - a.compositeScore);

    // Estimate projected return based on horizon
    const horizonDays = { short: 7, medium: 30, long: 365 };
    let days = horizonDays[horizon] || 30;
    if (targetDate) {
      const diff = Math.ceil((new Date(targetDate) - new Date()) / (1000 * 60 * 60 * 24));
      if (diff > 0) days = diff;
    }

    const recommendations = scored.map((s, i) => ({
      rank: i + 1,
      symbol: s.symbol,
      current: s.current,
      change_pct: s.change_pct,
      compositeScore: s.compositeScore,
      signals: s.signals,
      projectedReturn: estimateReturn(s, days),
      projectedPrice: parseFloat((s.current * (1 + estimateReturn(s, days) / 100)).toFixed(2)),
      targetDate: targetDate || null,
      daysToTarget: days,
    }));

    res.json({
      horizon,
      targetDate,
      daysToTarget: days,
      top: recommendations[0],
      all: recommendations,
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Recommendation failed' });
  }
});

// ─── SCORING ENGINE ──────────────────────────────────────────────────────────
// Scores a stock quote on multiple signals and returns a composite score 0-100
function scoreStock(quote, horizon = 'medium') {
  const { current, open, high, low, prev_close } = quote;

  // Momentum: how much did the price move today vs yesterday close
  const change_pct = prev_close > 0 ? ((current - prev_close) / prev_close) * 100 : 0;

  // Intraday range as % of current price (volatility proxy)
  const range_pct = current > 0 ? ((high - low) / current) * 100 : 0;

  // Position within day range: 1.0 = at high, 0 = at low (trend strength)
  const range = high - low;
  const position = range > 0 ? (current - low) / range : 0.5;

  // Gap from open: positive = gapped up (bullish)
  const gap_pct = open > 0 ? ((current - open) / open) * 100 : 0;

  // Horizon weighting: short favors momentum, long favors stability
  const weights = {
    short:  { momentum: 0.5, position: 0.3, stability: 0.2 },
    medium: { momentum: 0.35, position: 0.35, stability: 0.3 },
    long:   { momentum: 0.2, position: 0.3, stability: 0.5 },
  };
  const w = weights[horizon] || weights.medium;

  // Score each component 0-100
  const momentumScore = Math.min(100, Math.max(0, 50 + change_pct * 10));
  const positionScore = position * 100;
  // Stability: lower volatility = higher stability score
  const stabilityScore = Math.min(100, Math.max(0, 100 - range_pct * 5));

  const compositeScore = parseFloat(
    (w.momentum * momentumScore + w.position * positionScore + w.stability * stabilityScore).toFixed(1)
  );

  // Human-readable signals
  const signals = [];
  if (change_pct > 1) signals.push('Strong upward momentum');
  else if (change_pct > 0) signals.push('Positive momentum');
  else if (change_pct < -1) signals.push('Downward pressure');
  else signals.push('Neutral momentum');

  if (position > 0.7) signals.push('Trading near day high (bullish)');
  else if (position < 0.3) signals.push('Trading near day low (bearish)');

  if (gap_pct > 0.5) signals.push('Positive gap from open');
  if (range_pct < 1) signals.push('Low volatility (stable)');
  else if (range_pct > 3) signals.push('High volatility (risky)');

  const rating =
    compositeScore >= 70 ? 'Strong Buy' :
    compositeScore >= 55 ? 'Buy' :
    compositeScore >= 45 ? 'Hold' :
    compositeScore >= 30 ? 'Caution' : 'Avoid';

  return { change_pct: parseFloat(change_pct.toFixed(2)), range_pct: parseFloat(range_pct.toFixed(2)), compositeScore, signals, rating };
}

// Simple projected return estimate (not financial advice!)
function estimateReturn(stock, days) {
  const dailyMomentum = stock.change_pct / 100;
  // Decay momentum over time - short term follows momentum, long term reverts
  const decayFactor = Math.exp(-days / 90);
  const projected = dailyMomentum * days * decayFactor * 100;
  return parseFloat(Math.min(50, Math.max(-40, projected)).toFixed(2));
}

// ─── Start Server ────────────────────────────────────────────────────────────
app.listen(PORT, () => {
  console.log(`Server listening on port ${PORT}`);
  console.log(`  GET /                          -> UI dashboard`);
  console.log(`  GET /api/quote?symbol=X        -> single quote`);
  console.log(`  GET /api/quotes                -> watchlist quotes`);
  console.log(`  GET /api/search?q=apple        -> symbol search`);
  console.log(`  GET /api/candles?symbol=X      -> price history`);
  console.log(`  GET /api/analyze?symbol=X      -> stock analysis`);
  console.log(`  GET /api/recommend?horizon=X   -> AI recommendation`);
});
