package com.fitrank.app;

import com.sun.net.httpserver.Headers;
import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpHandler;
import com.sun.net.httpserver.HttpServer;

import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;
import java.util.Map;

public class FitRankServer {
    private final JdbcFitRankRepository jdbc = new JdbcFitRankRepository();
    private final MemoryRepository fallback = new MemoryRepository();

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(System.getenv().containsKey("PORT") ? System.getenv("PORT") : "8080");
        FitRankServer app = new FitRankServer();
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api", app.new ApiHandler());
        server.setExecutor(null);
        server.start();
        System.out.println("FitRank API running on http://localhost:" + port);
    }

    private class ApiHandler implements HttpHandler {
        @Override
        public void handle(HttpExchange exchange) throws IOException {
            cors(exchange);
            if ("OPTIONS".equals(exchange.getRequestMethod())) {
                send(exchange, 204, "");
                return;
            }
            String path = exchange.getRequestURI().getPath();
            String method = exchange.getRequestMethod();
            try {
                if (path.equals("/api/health")) {
                    send(exchange, 200, "{\"status\":\"ok\",\"product\":\"FitRank\"}");
                } else if (path.equals("/api/auth/signup") && method.equals("POST")) {
                    signup(exchange);
                } else if (path.equals("/api/auth/login") && method.equals("POST")) {
                    login(exchange);
                } else if (path.equals("/api/admin/login") && method.equals("POST")) {
                    adminLogin(exchange);
                } else if (path.equals("/api/auth/forgot") && method.equals("POST")) {
                    handleForgot(exchange);
                } else if (path.equals("/api/auth/oauth") && method.equals("POST")) {
                    send(exchange, 200, "{\"message\":\"OAuth handoff ready for Google and Apple\",\"token\":\"demo-oauth-token\"}");
                } else if (path.equals("/api/dashboard")) {
                    dashboard(exchange);
                } else if (path.equals("/api/exercises") && method.equals("GET")) {
                    exercises(exchange);
                } else if (path.equals("/api/exercises") && method.equals("POST")) {
                    createExercise(exchange);
                } else if (path.equals("/api/workouts") && method.equals("POST")) {
                    createWorkout(exchange);
                } else if (path.equals("/api/admin/stats")) {
                    if (!requireAdmin(exchange)) return;
                    adminStats(exchange);
                } else if (path.equals("/api/admin/users")) {
                    if (!requireAdmin(exchange)) return;
                    users(exchange);
                } else if (path.equals("/api/admin/users/action") && method.equals("POST")) {
                    if (!requireAdmin(exchange)) return;
                    adminUserAction(exchange);
                } else if (path.equals("/api/admin/analytics")) {
                    if (!requireAdmin(exchange)) return;
                    analytics(exchange);
                } else if (path.equals("/api/admin/content") && method.equals("POST")) {
                    if (!requireAdmin(exchange)) return;
                    adminContent(exchange);
                } else if (path.equals("/api/integrations/hevy/import") && method.equals("POST")) {
                    send(exchange, 200, "{\"message\":\"Hevy CSV/API import accepted\",\"status\":\"queued\"}");
                } else if (path.equals("/api/integrations/apple-health")) {
                    send(exchange, 200, "{\"message\":\"Apple Health requires iPhone PWA permission bridge or native wrapper\",\"status\":\"ready\"}");
                } else if (path.equals("/api/pro/insights")) {
                    proInsights(exchange);
                } else {
                    send(exchange, 404, "{\"error\":\"Route not found\"}");
                }
            } catch (Exception ex) {
                send(exchange, 500, "{\"error\":\"" + JsonUtil.escape(ex.getMessage()) + "\"}");
            }
        }
    }

    private void signup(HttpExchange exchange) throws IOException, SQLException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        User user = new User(0, value(body, "name", "FitRank Athlete"), value(body, "email", "athlete@fitrank.app"),
                value(body, "goal", "Strength"));
        user.setPasswordHash(JsonUtil.hash(value(body, "password", "password")));
        try {
            user = jdbc.createUser(user);
        } catch (SQLException ex) {
            fallback.create(user);
        }
        send(exchange, 201, "{\"token\":\"demo-session-" + user.getId() + "\",\"user\":" + user.toJson() + "}");
    }

    private void login(HttpExchange exchange) throws IOException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        String email = value(body, "email", "athlete@fitrank.app");
        User user = new User(1, "FitRank Athlete", email, "Strength", "PRO", 8);
        send(exchange, 200, "{\"token\":\"demo-session-1\",\"user\":" + user.toJson() + "}");
    }

    private void handleForgot(HttpExchange exchange) throws IOException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        String email = value(body, "email", "");
        String token = value(body, "token", "FR-" + Long.toHexString(System.currentTimeMillis()).toUpperCase());
        String baseUrl = value(body, "resetBaseUrl", "http://localhost:8080/");
        String resetUrl = baseUrl + "?resetToken=" + token + "&email=" + email;
        System.out.println("\n====== FitRank Password Reset (Simulated Email) ======");
        System.out.println("To: " + email);
        System.out.println("Subject: Reset your FitRank password");
        System.out.println("Reset URL: " + resetUrl);
        System.out.println("Token: " + token);
        System.out.println("======================================================\n");
        send(exchange, 200, "{\"message\":\"Password reset link generated. Check the server console for the reset URL.\",\"devResetUrl\":\"" + JsonUtil.escape(resetUrl) + "\",\"token\":\"" + JsonUtil.escape(token) + "\"}");
    }

    private void adminLogin(HttpExchange exchange) throws IOException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        String email = value(body, "email", "");
        String password = value(body, "password", "");
        if ("admin@fitrank.app".equalsIgnoreCase(email) && "Admin@123".equals(password)) {
            AdminUser admin = new AdminUser(100, "FitRank Super Admin", email, "Super Admin");
            send(exchange, 200, "{\"token\":\"admin-demo-token\",\"privileges\":[\"USER_MANAGE\",\"CONTENT_MANAGE\",\"ANALYTICS_VIEW\",\"SUBSCRIPTION_MANAGE\",\"NOTIFICATION_SEND\"],\"user\":" + admin.toJson() + "}");
            return;
        }
        send(exchange, 401, "{\"error\":\"Invalid admin credentials\"}");
    }

    private void dashboard(HttpExchange exchange) throws IOException {
        String json = "{\"today\":{\"title\":\"Push Power\",\"sets\":18,\"calories\":462,\"duration\":64},"
                + "\"streak\":8,\"upcoming\":\"Pull Hypertrophy\",\"records\":[\"Bench Press 82.5kg x 8\",\"5K Run 24:10\"],"
                + "\"recoveryScore\":82,\"music\":\"High-tempo strength mix\",\"moodMode\":\"Locked In\"}";
        send(exchange, 200, json);
    }

    private void exercises(HttpExchange exchange) throws IOException {
        String q = JsonUtil.parseQuery(exchange.getRequestURI().getQuery()).get("q");
        try {
            send(exchange, 200, listToJson(jdbc.findExercises(q)));
        } catch (SQLException ex) {
            send(exchange, 200, listToJson(seedExercises()));
        }
    }

    private void createExercise(HttpExchange exchange) throws IOException, SQLException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        Exercise exercise = new Exercise(0, value(body, "name", "Custom Lift"), value(body, "category", "Custom"),
                value(body, "primaryMuscle", "Full Body"), value(body, "equipment", "Any"), value(body, "substitute", "Machine variation"));
        exercise.setInstructions(value(body, "instructions", "Keep movement pain-free and controlled."));
        try {
            exercise = jdbc.createExercise(exercise);
        } catch (SQLException ex) {
            fallback.create(exercise);
        }
        send(exchange, 201, exercise.toJson());
    }

    private void createWorkout(HttpExchange exchange) throws IOException, SQLException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        WorkoutSession session = new WorkoutSession(0, intValue(body, "userId", 1), value(body, "title", "Live Workout"));
        session.setNotes(value(body, "notes", "Auto-saved from FitRank logger"));
        session.setCalories(intValue(body, "calories", 380));
        session.setDurationMinutes(intValue(body, "durationMinutes", 45));
        session.setVisibility(value(body, "visibility", "PRIVATE"));
        session.addSet(1, doubleValue(body, "weight", 80), intValue(body, "reps", 8));
        session.getSets().get(0).setRpe(doubleValue(body, "rpe", 8));
        session.getSets().get(0).setTag(value(body, "tag", "WORKING"));
        try {
            session = jdbc.createWorkout(session);
        } catch (SQLException ex) {
            fallback.create(session);
        }
        send(exchange, 201, session.toJson());
    }

    private void adminStats(HttpExchange exchange) throws IOException {
        try {
            send(exchange, 200, jdbc.dashboardStats());
        } catch (SQLException ex) {
            send(exchange, 200, "{\"users\":12840,\"activeToday\":3182,\"paidSubscribers\":1240,\"revenue\":48620,\"churnRate\":3.8,\"workoutsPerDay\":9021,\"retention\":71}");
        }
    }

    private void users(HttpExchange exchange) throws IOException {
        String q = JsonUtil.parseQuery(exchange.getRequestURI().getQuery()).get("q");
        try {
            send(exchange, 200, listToJsonUsers(jdbc.findUsers(q)));
        } catch (SQLException ex) {
            List<User> users = new ArrayList<User>();
            users.add(new User(1, "Arjun Nair", "arjun@example.com", "Muscle gain", "PRO", 12));
            users.add(new AdminUser(2, "FitRank Support", "support@fitrank.app", "Support Admin"));
            send(exchange, 200, listToJsonUsers(users));
        }
    }

    private void analytics(HttpExchange exchange) throws IOException {
        send(exchange, 200, "{\"mostUsedExercises\":[\"Bench Press\",\"Back Squat\",\"Pull Up\"],\"topCountries\":[\"India\",\"United States\",\"United Kingdom\"],\"avgSessionDuration\":52,\"conversionFunnel\":{\"visit\":100,\"signup\":31,\"trial\":12,\"paid\":7}}");
    }

    private void adminUserAction(HttpExchange exchange) throws IOException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        String action = value(body, "action", "review");
        String userId = value(body, "userId", "1");
        send(exchange, 200, "{\"status\":\"complete\",\"userId\":\"" + JsonUtil.escape(userId) + "\",\"action\":\"" + JsonUtil.escape(action) + "\"}");
    }

    private void adminContent(HttpExchange exchange) throws IOException {
        Map<String, String> body = JsonUtil.parseObject(read(exchange));
        String type = value(body, "type", "exercise");
        send(exchange, 200, "{\"status\":\"published\",\"type\":\"" + JsonUtil.escape(type) + "\",\"auditLog\":\"Content Admin change recorded\"}");
    }

    private void proInsights(HttpExchange exchange) throws IOException {
        send(exchange, 200, "{\"plateau\":\"Bench press volume has stalled for 3 weeks\",\"overload\":\"Add 2.5kg or 1 rep next push day\",\"recoveryScore\":82,\"muscleBalance\":\"Posterior chain needs 14% more weekly volume\",\"deload\":\"Plan deload after 2 more hard weeks\"}");
    }

    private List<Exercise> seedExercises() {
        List<Exercise> exercises = new ArrayList<Exercise>();
        exercises.add(new Exercise(1, "Barbell Bench Press", "Chest", "Pectorals", "Barbell", "Dumbbell Press"));
        exercises.add(new Exercise(2, "Pull Up", "Back", "Lats", "Bodyweight", "Lat Pulldown"));
        exercises.add(new Exercise(3, "Back Squat", "Legs", "Quads", "Barbell", "Goblet Squat"));
        exercises.add(new Exercise(4, "Treadmill Run", "Cardio", "Heart", "Machine", "Bike Erg"));
        return exercises;
    }

    private String listToJson(List<Exercise> exercises) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < exercises.size(); i++) {
            if (i > 0) {
                builder.append(",");
            }
            builder.append(exercises.get(i).toJson());
        }
        return builder.append("]").toString();
    }

    private String listToJsonUsers(List<User> users) {
        StringBuilder builder = new StringBuilder("[");
        for (int i = 0; i < users.size(); i++) {
            if (i > 0) {
                builder.append(",");
            }
            builder.append(users.get(i).toJson());
        }
        return builder.append("]").toString();
    }

    private void cors(HttpExchange exchange) {
        Headers headers = exchange.getResponseHeaders();
        headers.add("Access-Control-Allow-Origin", "*");
        headers.add("Access-Control-Allow-Headers", "Content-Type, Authorization");
        headers.add("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
        headers.add("Content-Type", "application/json; charset=utf-8");
    }

    private boolean requireAdmin(HttpExchange exchange) throws IOException {
        String auth = exchange.getRequestHeaders().getFirst("Authorization");
        if (auth != null && auth.contains("admin-demo-token")) {
            return true;
        }
        send(exchange, 403, "{\"error\":\"Admin login required\",\"login\":\"admin@fitrank.app\"}");
        return false;
    }

    private String read(HttpExchange exchange) throws IOException {
        BufferedReader reader = new BufferedReader(new InputStreamReader(exchange.getRequestBody(), "UTF-8"));
        StringBuilder builder = new StringBuilder();
        String line;
        while ((line = reader.readLine()) != null) {
            builder.append(line);
        }
        return builder.toString();
    }

    private void send(HttpExchange exchange, int status, String body) throws IOException {
        byte[] bytes = body.getBytes("UTF-8");
        exchange.sendResponseHeaders(status, bytes.length);
        OutputStream os = exchange.getResponseBody();
        os.write(bytes);
        os.close();
    }

    private String value(Map<String, String> map, String key, String fallbackValue) {
        String value = map.get(key);
        return value == null || value.trim().length() == 0 ? fallbackValue : value;
    }

    private int intValue(Map<String, String> map, String key, int fallbackValue) {
        try {
            return Integer.parseInt(value(map, key, String.valueOf(fallbackValue)));
        } catch (NumberFormatException ex) {
            return fallbackValue;
        }
    }

    private double doubleValue(Map<String, String> map, String key, double fallbackValue) {
        try {
            return Double.parseDouble(value(map, key, String.valueOf(fallbackValue)));
        } catch (NumberFormatException ex) {
            return fallbackValue;
        }
    }
}
