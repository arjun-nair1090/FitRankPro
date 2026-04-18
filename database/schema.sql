CREATE TABLE IF NOT EXISTS users (
  id SERIAL PRIMARY KEY,
  name VARCHAR(120) NOT NULL,
  email VARCHAR(180) UNIQUE NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  goal VARCHAR(80) DEFAULT 'Strength',
  role VARCHAR(40) DEFAULT 'USER',
  plan VARCHAR(40) DEFAULT 'FREE',
  status VARCHAR(40) DEFAULT 'ACTIVE',
  streak_days INTEGER DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS exercises (
  id SERIAL PRIMARY KEY,
  name VARCHAR(160) NOT NULL,
  category VARCHAR(80) NOT NULL,
  primary_muscle VARCHAR(80) NOT NULL,
  equipment VARCHAR(80) DEFAULT 'Any',
  substitute VARCHAR(160),
  instructions TEXT
);

CREATE TABLE IF NOT EXISTS workout_sessions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  title VARCHAR(160) NOT NULL,
  notes TEXT,
  started_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  finished_at TIMESTAMP,
  calories INTEGER DEFAULT 0,
  duration_minutes INTEGER DEFAULT 0,
  visibility VARCHAR(40) DEFAULT 'PRIVATE'
);

CREATE TABLE IF NOT EXISTS workout_sets (
  id SERIAL PRIMARY KEY,
  session_id INTEGER REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id INTEGER REFERENCES exercises(id),
  set_order INTEGER NOT NULL,
  weight NUMERIC(8,2) DEFAULT 0,
  reps INTEGER DEFAULT 0,
  duration_seconds INTEGER DEFAULT 0,
  distance_km NUMERIC(8,2) DEFAULT 0,
  rpe NUMERIC(3,1) DEFAULT 0,
  tag VARCHAR(40) DEFAULT 'WORKING',
  notes TEXT
);

CREATE TABLE IF NOT EXISTS subscriptions (
  id SERIAL PRIMARY KEY,
  user_id INTEGER REFERENCES users(id),
  provider VARCHAR(40) NOT NULL,
  plan VARCHAR(40) NOT NULL,
  status VARCHAR(40) NOT NULL,
  renews_at TIMESTAMP
);

CREATE TABLE IF NOT EXISTS social_events (
  id SERIAL PRIMARY KEY,
  actor_user_id INTEGER REFERENCES users(id),
  target_user_id INTEGER REFERENCES users(id),
  session_id INTEGER REFERENCES workout_sessions(id),
  event_type VARCHAR(40) NOT NULL,
  body TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO exercises (name, category, primary_muscle, equipment, substitute, instructions)
VALUES
('Barbell Bench Press', 'Chest', 'Pectorals', 'Barbell', 'Dumbbell Press', 'Keep shoulder blades pinned and stop if shoulder pain appears.'),
('Incline Dumbbell Press', 'Chest', 'Upper Chest', 'Dumbbells', 'Incline Machine Press', 'Control the eccentric and keep elbows below shoulder line.'),
('Pull Up', 'Back', 'Lats', 'Bodyweight', 'Lat Pulldown', 'Use assisted variations when reps break down.'),
('Barbell Row', 'Back', 'Mid Back', 'Barbell', 'Chest Supported Row', 'Brace hard and avoid jerking from the low back.'),
('Back Squat', 'Legs', 'Quads', 'Barbell', 'Goblet Squat', 'Use a depth that stays pain-free and stable.'),
('Romanian Deadlift', 'Legs', 'Hamstrings', 'Barbell', 'Cable Pull Through', 'Hinge at the hips and keep the bar close.'),
('Overhead Press', 'Shoulders', 'Delts', 'Barbell', 'Landmine Press', 'Squeeze glutes and avoid painful shoulder ranges.'),
('Lateral Raise', 'Shoulders', 'Side Delts', 'Dumbbells', 'Cable Lateral Raise', 'Lead with elbows and pause at the top.'),
('Cable Curl', 'Arms', 'Biceps', 'Cable', 'Dumbbell Curl', 'Keep elbows quiet and avoid swinging.'),
('Triceps Pushdown', 'Arms', 'Triceps', 'Cable', 'Close Grip Pushup', 'Lock out smoothly without elbow pain.'),
('Plank', 'Core', 'Abs', 'Bodyweight', 'Dead Bug', 'Keep ribs down and stop before the low back sags.'),
('Treadmill Run', 'Cardio', 'Heart', 'Machine', 'Bike Erg', 'Use conversational pace for base endurance days.')
ON CONFLICT DO NOTHING;
