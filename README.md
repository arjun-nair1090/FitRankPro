# FitRank

FitRank is a full-stack MVP fitness tracking product with original branding, a Java backend, JDBC/PostgreSQL schema, installable iPhone-friendly PWA frontend, offline-first workout logging, premium features, and a complete admin panel.

## Product

FitRank's identity is built around ranking every rep: premium logging, progress analytics, recovery intelligence, social motivation, and coach-ready workflows.

Included MVP areas:

- Email/password signup/login, Google and Apple OAuth handoff stubs, forgot password response, session token response.
- Onboarding goals for muscle gain, fat loss, strength, and endurance.
- Dashboard with daily workout, weekly streak, calories, upcoming plan, PRs, recovery, music, and mood mode.
- Advanced workout logger with timer, exercise search, custom exercise creation API, set fields, RPE, tags, notes, autosave, duplicate previous workout, and finish summary.
- Exercise library with categories, substitutes, muscle highlights, and media-backed detail page.
- Templates, scheduler, progress tracking, social feed, leaderboards, QR friend flow, coach mode, challenges, export, offline sync queue, push notification prompt.
- Pro features for AI progress insights, plateau detection, overload recommendations, recovery score, muscle balance, deload planning, unlimited templates/photos, reports, wearable sync, and voice logging.
- Admin dashboard, users page, analytics page, CMS placeholder, notification manager path, role-based admin concepts.

Demo admin credentials are separate from member credentials:

- Email: `admin@fitrank.app`
- Password: `Admin@123`

## Run the Java API

```powershell
cd C:\Users\arjun\Downloads\FitRank\fitrank-pro\backend
javac -d out src\com\fitrank\app\*.java
java -cp out com.fitrank.app.FitRankServer
```

The API runs on `http://localhost:8080/api`.

## Open the PWA

Open:

```text
C:\Users\arjun\Downloads\FitRank\fitrank-pro\frontend\index.html
```

For iPhone testing on the same network, serve the frontend over HTTPS or a trusted local tunnel, then use Safari's Add to Home Screen. Apple Health and Apple Watch access require a HealthKit permission bridge, usually a small native iOS wrapper such as Capacitor, because browser PWAs cannot directly read HealthKit.

## Database

Run `database/schema.sql` in PostgreSQL. Add the PostgreSQL JDBC driver to `backend/lib/postgresql.jar`, then run the API with `FITRANK_DB_URL`, `FITRANK_DB_USER`, and `FITRANK_DB_PASSWORD`.

## Java OOP Requirements

- Classes and objects: `User`, `AdminUser`, `Exercise`, `WorkoutSession`, `WorkoutSet`, repositories, and server classes.
- Encapsulation: private fields with getters/setters.
- Inheritance: `BaseEntity -> Person -> User -> AdminUser`.
- Polymorphism: overridden `toJson()` and `canAccessAdmin()`.
- Abstraction: abstract `BaseEntity` and `CrudRepository` interface.
- Method overloading: `WorkoutSession.addSet(WorkoutSet)` and `WorkoutSession.addSet(int,double,int)`.
- JDBC: `JdbcFitRankRepository` uses `DriverManager`, `Connection`, `PreparedStatement`, and `ResultSet`.
