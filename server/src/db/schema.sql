-- =====================================================================
-- Sweety - Blood Glucose Tracker
-- PostgreSQL schema
--
-- Data integrity is enforced at the database layer, not only in the API:
--   * glucose_value is INTEGER        -> decimals are rejected outright
--   * CHECK 40..600                   -> out-of-range values are rejected
--   * UNIQUE(user_id, date, slot)     -> one reading per slot per day
--   * 4-value enum + unique slot      -> a 5th reading for a day is impossible
--   * trigger                         -> future dates are rejected
-- =====================================================================

-- ---------------------------------------------------------------------
-- users
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id            SERIAL PRIMARY KEY,
  name          VARCHAR(100)  NOT NULL,
  email         VARCHAR(255)  NOT NULL,
  password_hash VARCHAR(255)  NOT NULL,
  created_at    TIMESTAMPTZ   NOT NULL DEFAULT NOW(),

  CONSTRAINT uq_users_email UNIQUE (email),
  CONSTRAINT chk_users_name_not_blank CHECK (length(btrim(name)) > 0)
);

-- Case-insensitive email uniqueness: "A@b.com" and "a@b.com" are the same account.
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email_lower ON users (lower(email));

-- ---------------------------------------------------------------------
-- readings
-- ---------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'time_slot') THEN
    CREATE TYPE time_slot AS ENUM (
      'MORNING',
      'AFTER_BREAKFAST',
      'AFTER_LUNCH',
      'AFTER_DINNER'
    );
  END IF;
END
$$;

CREATE TABLE IF NOT EXISTS readings (
  id            SERIAL PRIMARY KEY,
  user_id       INTEGER     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  reading_date  DATE        NOT NULL,
  time_slot     time_slot   NOT NULL,
  glucose_value INTEGER     NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  CONSTRAINT chk_readings_glucose_range CHECK (glucose_value BETWEEN 40 AND 600),
  CONSTRAINT uq_readings_user_date_slot UNIQUE (user_id, reading_date, time_slot)
);

CREATE INDEX IF NOT EXISTS idx_readings_user_id ON readings (user_id);
CREATE INDEX IF NOT EXISTS idx_readings_user_date ON readings (user_id, reading_date DESC);

-- ---------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------

-- Reject future reading dates. A CHECK constraint cannot express this
-- because CURRENT_DATE is not immutable; a trigger can.
CREATE OR REPLACE FUNCTION reject_future_reading_date()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.reading_date > CURRENT_DATE THEN
    RAISE EXCEPTION 'Date cannot be in the future.'
      USING ERRCODE = 'SW001';
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_readings_no_future ON readings;
CREATE TRIGGER trg_readings_no_future
  BEFORE INSERT OR UPDATE OF reading_date ON readings
  FOR EACH ROW
  EXECUTE FUNCTION reject_future_reading_date();

-- Keep updated_at accurate without trusting the application layer.
CREATE OR REPLACE FUNCTION touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_readings_touch_updated_at ON readings;
CREATE TRIGGER trg_readings_touch_updated_at
  BEFORE UPDATE ON readings
  FOR EACH ROW
  EXECUTE FUNCTION touch_updated_at();
