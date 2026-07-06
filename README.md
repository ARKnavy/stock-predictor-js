# stock-predictor-js

Node.js backend for a stock market predictor using the [Finnhub](https://finnhub.io) API.

This server fetches real-time stock quotes and exposes them through a simple REST API. It's designed as the data-fetching foundation for a future stock scoring/ranking/prediction system.

---

## Project Structure

```
stock-predictor-js/
├── index.js           # Main server file - Express app + all routes
├── finnhubClient.js   # Finnhub API setup + getQuote() helper function
├── package.json       # Project metadata + npm dependencies
├── .env.example       # Template showing required environment variables
├── .env               # YOUR real secrets (NOT committed - in .gitignore)
├── .gitignore         # Tells Git what to ignore (node_modules, .env, etc.)
└── README.md          # This file
```

> **Note:** `node_modules/` and `.env` are excluded from Git by `.gitignore`.
> You need to run `npm install` locally after cloning.

---

## Prerequisites

- [Node.js](https://nodejs.org/) v16 or higher
- A free Finnhub API key from [https://finnhub.io/register](https://finnhub.io/register)

---

## Setup

### 1. Clone the repo

```bash
git clone https://github.com/ARKnavy/stock-predictor-js.git
cd stock-predictor-js
```

### 2. Install dependencies

```bash
npm install
```

This installs `express`, `dotenv`, and `finnhub` into a local `node_modules/` folder.

### 3. Set your Finnhub API key

Copy the example env file:

```bash
cp .env.example .env
```

Then open `.env` in any text editor and replace the placeholder with your real key:

```
FINNHUB_API_KEY=your_real_api_key_here
PORT=3000
```

> **Security tip:** Never commit your `.env` file. It's already in `.gitignore` so Git will ignore it automatically.

### 4. Run the server

```bash
node index.js
```

You should see:
```
Server listening on port 3000
  GET /                    -> health check
  GET /api/quote?symbol=X  -> single stock quote
  GET /api/quotes          -> quotes for AAPL, MSFT, TSLA, GOOGL, AMZN
```

---

## API Endpoints

### `GET /`
Health check. Confirms the server is running.

**Example:**
```
GET http://localhost:3000/
```
**Response:**
```
Stock predictor backend is running
```

---

### `GET /api/quote?symbol=AAPL`
Returns a real-time quote for a single stock symbol.
- `symbol` query parameter is optional; defaults to `AAPL` if not provided.

**Example:**
```
GET http://localhost:3000/api/quote?symbol=AAPL
```
**Response:**
```json
{
  "symbol": "AAPL",
  "current": 189.30,
  "high": 191.05,
  "low": 188.10,
  "open": 189.50,
  "prev_close": 188.85
}
```

---

### `GET /api/quotes`
Returns quotes for the default watchlist: `AAPL`, `MSFT`, `TSLA`, `GOOGL`, `AMZN`.

**Example:**
```
GET http://localhost:3000/api/quotes
```
**Response:**
```json
[
  { "symbol": "AAPL", "current": 189.30, ... },
  { "symbol": "MSFT", "current": 415.20, ... },
  { "symbol": "TSLA", "current": 248.50, ... },
  { "symbol": "GOOGL", "current": 175.90, ... },
  { "symbol": "AMZN", "current": 192.10, ... }
]
```

---

## Dependencies

| Package | Purpose |
|---|---|
| `express` | Web framework for building the REST API |
| `dotenv` | Loads environment variables from `.env` into `process.env` |
| `finnhub` | Official Finnhub JS client for fetching stock market data |

---

## Future Ideas

- Add a scoring/ranking algorithm to rate stocks
- Add historical data endpoint using Finnhub's candle API
- Deploy to a cloud platform (e.g., Railway, Render, or AWS)
- Add caching to avoid hitting Finnhub rate limits
