# Backtesting Module Usage Guide

## Purpose
This guide explains how to use the backtesting module APIs for:
- importing Binance data
- running backtests
- tracking run progress
- cancelling running jobs
- reading stored results

## Prerequisites
- Install dependencies:
```bash
npm install
```
- Ensure database is running and `DATABASE_URL` is valid.
- Apply migrations:
```bash
npx prisma migrate dev
```
- Start app:
```bash
npm run start:dev
```
- Swagger UI:
`http://localhost:3000/api`

## Environment Variables
Common backtesting-related vars:
- `BINANCE_DATA_DIR`
- `BINANCE_DOWNLOAD_TIMEOUT_MS`
- `BINANCE_RETRY_MAX`
- `BINANCE_IMPORT_CONCURRENCY`
- `BACKTEST_PROGRESS_LOG_EVERY`

Check `.env.example` for defaults.

## API Overview
Base path: `/backtesting`

### Health
- `GET /backtesting/health`

### Import Binance Data
- `POST /backtesting/import`
- `GET /backtesting/import/:jobId`
- `GET /backtesting/import/queue`

### Run Backtest
- `POST /backtesting/run`
- `POST /backtesting/run/:runId/cancel`

### Run Monitoring
- `GET /backtesting/runs/active`
- `GET /backtesting/run/:runId/progress`

### Run Results
- `GET /backtesting/runs`
- `GET /backtesting/run/:runId`
- `GET /backtesting/run/:runId/summary`
- `GET /backtesting/run/:runId/signals`
- `GET /backtesting/run/:runId/equity`

## Typical Workflow
1. Import market data:
```bash
curl -X POST http://localhost:3000/backtesting/import ^
  -H "Content-Type: application/json" ^
  -d "{\"symbol\":\"BTCUSDT\",\"interval\":\"1m\",\"startDate\":\"2024-01-01T00:00:00.000Z\",\"endDate\":\"2024-01-31T23:59:59.999Z\",\"overwrite\":false}"
```

2. Start backtest:
```bash
curl -X POST http://localhost:3000/backtesting/run ^
  -H "Content-Type: application/json" ^
  -d "{\"symbol\":\"BTCUSDT\",\"startDate\":\"2024-01-01T00:00:00.000Z\",\"endDate\":\"2024-01-31T23:59:59.999Z\",\"fromInterval\":\"1m\",\"toInterval\":\"15m\",\"initialBalance\":10000,\"riskPercent\":2,\"rewardRatio\":2}"
```

3. Poll progress:
```bash
curl http://localhost:3000/backtesting/run/<runId>/progress
```

4. (Optional) cancel running backtest:
```bash
curl -X POST http://localhost:3000/backtesting/run/<runId>/cancel
```

5. Read results:
```bash
curl http://localhost:3000/backtesting/run/<runId>/summary
curl http://localhost:3000/backtesting/run/<runId>/signals?limit=200
curl http://localhost:3000/backtesting/run/<runId>/equity?limit=200
```

## Run Status Semantics
`BacktestRun.status` can be:
- `pending`: created but not started yet
- `running`: currently processing candles
- `completed`: finished successfully
- `failed`: terminated with error (`errorMessage` is set)
- `cancelled`: cancellation requested and acknowledged

Progress fields:
- `processedCandles`
- `generatedSignals`
- `cancelRequestedAt`
- `updatedAt`

Use `/backtesting/runs/active` for global monitoring and `/backtesting/run/:runId/progress` for per-run polling.

## Notes
- Signal/equity endpoints use cursor pagination (`limit` + `cursor`).
- Cancellation is best-effort and checked periodically during stream processing.
- For validation details and payload schemas, use Swagger (`/api`).
