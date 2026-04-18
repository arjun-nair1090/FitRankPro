# FitRank Java API

FitRank's MVP backend is a Java 8 REST API with JDBC-ready PostgreSQL access and in-memory fallback data so the app can run immediately while a database is being configured.

## Run

```powershell
cd backend
javac -d out src\com\fitrank\app\*.java
java -cp out com.fitrank.app.FitRankServer
```

## PostgreSQL

1. Create a PostgreSQL database named `fitrank`.
2. Run `database/schema.sql`.
3. Put the PostgreSQL JDBC driver in `backend/lib`.
4. Run with:

```powershell
$env:FITRANK_DB_URL="jdbc:postgresql://localhost:5432/fitrank"
$env:FITRANK_DB_USER="postgres"
$env:FITRANK_DB_PASSWORD="postgres"
java -cp "out;lib\postgresql.jar" com.fitrank.app.FitRankServer
```

Endpoints include auth, separate admin login, protected admin stats/users/actions/content, workout logging, exercises, pro insights, Apple Health readiness, and Hevy import queueing.

Demo admin login:

```text
admin@fitrank.app
Admin@123
```
