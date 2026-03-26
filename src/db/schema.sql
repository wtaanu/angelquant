-- ============================================================
--  AngelQuant MySQL Schema
--  Run: mysql -u root -p < src/db/schema.sql
-- ============================================================

CREATE DATABASE IF NOT EXISTS angelquant_db;
USE angelquant_db;

CREATE TABLE IF NOT EXISTS candles (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol     VARCHAR(20)  NOT NULL,
  timeframe  ENUM('1m','5m','15m','1h','1d') NOT NULL,
  open_time  DATETIME     NOT NULL,
  open       DECIMAL(12,2),
  high       DECIMAL(12,2),
  low        DECIMAL(12,2),
  close      DECIMAL(12,2),
  volume     BIGINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY uq_candle (symbol, timeframe, open_time),
  INDEX idx_symbol_tf (symbol, timeframe, open_time)
);

CREATE TABLE IF NOT EXISTS signals (
  id         BIGINT AUTO_INCREMENT PRIMARY KEY,
  symbol     VARCHAR(20)  NOT NULL,
  signal_at  DATETIME     NOT NULL,
  rsi_val    DECIMAL(6,2),
  ema_val    DECIMAL(12,2),
  price      DECIMAL(12,2),
  executed   BOOLEAN      DEFAULT FALSE,
  trade_id   BIGINT       DEFAULT NULL,
  created_at TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_symbol_date (symbol, signal_at)
);

CREATE TABLE IF NOT EXISTS trades (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  signal_id    BIGINT       DEFAULT NULL,
  symbol       VARCHAR(20)  NOT NULL,
  order_id     VARCHAR(50)  DEFAULT NULL,
  entry_price  DECIMAL(12,2),
  exit_price   DECIMAL(12,2) DEFAULT NULL,
  qty          INT,
  pnl          DECIMAL(12,2) DEFAULT NULL,
  strategy     VARCHAR(50)  DEFAULT 'RSI_EMA',
  status       ENUM('OPEN','CLOSED','CANCELLED') DEFAULT 'OPEN',
  trade_date   DATE         NOT NULL,
  cb_blocked   BOOLEAN      DEFAULT FALSE,
  paper_trade  BOOLEAN      DEFAULT TRUE,
  created_at   TIMESTAMP    DEFAULT CURRENT_TIMESTAMP,
  closed_at    TIMESTAMP    DEFAULT NULL,
  INDEX idx_date (trade_date),
  INDEX idx_symbol (symbol),
  FOREIGN KEY (signal_id) REFERENCES signals(id)
);

CREATE TABLE IF NOT EXISTS cb_log (
  id           BIGINT AUTO_INCREMENT PRIMARY KEY,
  logged_at    DATETIME     NOT NULL,
  loss_amount  DECIMAL(12,2),
  limit_amount DECIMAL(12,2),
  pct_used     DECIMAL(5,2),
  tripped      BOOLEAN      DEFAULT FALSE,
  action       VARCHAR(100),
  INDEX idx_date (logged_at)
);
