# FitRank backend

Java 8+ HTTP server (JDK `com.sun.net.httpserver`) that serves the REST API under `/api` and the web app from `../frontend`. The only dependency is the PostgreSQL JDBC driver, which `../start-fitrank.ps1` downloads into `lib/`.

```powershell
javac --release 8 -d out src/com/fitrank/app/*.java
java -cp "out;lib/postgresql.jar" com.fitrank.app.FitRankServer
```

| File | Role |
| --- | --- |
| `FitRankServer` | Routing, auth guard, JSON responses, static files, store selection, admin bootstrap |
| `Auth` | PBKDF2 password hashing, signed tokens, password-reset codes |
| `Json` | Minimal JSON parser and writer |
| `Store` | Persistence interface, implemented by `JdbcStore` (PostgreSQL) and `MemoryStore` (fallback) |
| `BaseEntity`, `Person`, `User`, `AdminUser` | Account model |
| `UserEntry`, `WorkoutSession`, `WorkoutSet`, `Meal`, `WeightLog` | Per-user records |

Environment variables, the API table and the test command are in the [main README](../README.md).
