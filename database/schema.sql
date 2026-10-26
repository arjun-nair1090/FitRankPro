-- FitRank schema. The API runs this on startup, so every statement is idempotent.
-- Statements are split on semicolons: keep them out of comments and strings.

CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  goal VARCHAR(80) NOT NULL DEFAULT 'Strength',
  role VARCHAR(20) NOT NULL DEFAULT 'USER' CHECK (role IN ('USER', 'ADMIN')),
  plan VARCHAR(20) NOT NULL DEFAULT 'FREE' CHECK (plan IN ('FREE', 'PREMIUM')),
  settings TEXT NOT NULL DEFAULT '{}',
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP NOT NULL,
  title VARCHAR(160) NOT NULL,
  notes TEXT NOT NULL DEFAULT '',
  duration_minutes INTEGER NOT NULL DEFAULT 0,
  calories INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER NOT NULL REFERENCES workout_sessions(id) ON DELETE CASCADE,
  set_order INTEGER NOT NULL,
  exercise VARCHAR(120) NOT NULL,
  weight DOUBLE PRECISION NOT NULL DEFAULT 0,
  reps INTEGER NOT NULL DEFAULT 0,
  rpe DOUBLE PRECISION NOT NULL DEFAULT 0,
  tag VARCHAR(20) NOT NULL DEFAULT 'normal'
);

CREATE TABLE IF NOT EXISTS meals (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP NOT NULL,
  name VARCHAR(160) NOT NULL,
  calories INTEGER NOT NULL DEFAULT 0,
  protein DOUBLE PRECISION NOT NULL DEFAULT 0,
  water DOUBLE PRECISION NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS weight_logs (
  id SERIAL PRIMARY KEY,
  user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  logged_at TIMESTAMP NOT NULL,
  kg DOUBLE PRECISION NOT NULL
);

CREATE INDEX IF NOT EXISTS workout_sessions_user ON workout_sessions(user_id, logged_at);
CREATE INDEX IF NOT EXISTS workout_sets_session ON workout_sets(session_id);
CREATE INDEX IF NOT EXISTS meals_user ON meals(user_id, logged_at);
CREATE INDEX IF NOT EXISTS weight_logs_user ON weight_logs(user_id, logged_at)
