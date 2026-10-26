package com.fitrank.app;

import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.nio.file.Paths;
import java.util.List;
import java.util.Map;

/**
 * End-to-end check of the API against a running server on a random port.
 * Uses the in-memory store, or PostgreSQL when FITRANK_DB_URL is set.
 * Run: java -cp out;test-out[;lib/postgresql.jar] com.fitrank.app.ApiCheck
 */
public class ApiCheck {
    private static String base;
    private static int status;

    public static void main(String[] args) throws Exception {
        String db = System.getenv("FITRANK_DB_URL");
        Store store = db == null ? new MemoryStore()
                : new JdbcStore(db, System.getenv("FITRANK_DB_USER"), System.getenv("FITRANK_DB_PASSWORD"), Paths.get("../database/schema.sql"));
        FitRankServer app = new FitRankServer(store, new Auth("test-secret"), Paths.get("../frontend").toAbsolutePath().normalize());
        HttpServer server = app.start(0);
        base = "http://localhost:" + server.getAddress().getPort();
        try {
            run();
            System.out.println("ApiCheck passed (" + store.kind() + ")");
        } finally {
            server.stop(0);
        }
    }

    @SuppressWarnings("unchecked")
    private static void run() throws Exception {
        String email = "lifter" + System.nanoTime() + "@example.com";
        expect(call("GET", "/api/health", null, null), 200);

        // signup validation, signup, duplicate, login
        call("POST", "/api/auth/signup", "{\"email\":\"" + email + "\",\"password\":\"short\"}", null);
        expect(status, 400);
        Map<String, Object> s = obj(call("POST", "/api/auth/signup", "{\"name\":\"Ari\",\"email\":\"" + email + "\",\"password\":\"correct horse\"}", null));
        expect(status, 200);
        String token = (String) s.get("token");
        check(((Map<String, Object>) s.get("user")).get("passwordHash") == null, "password hash must never be returned");
        call("POST", "/api/auth/signup", "{\"email\":\"" + email + "\",\"password\":\"correct horse\"}", null);
        expect(status, 409);
        call("POST", "/api/auth/login", "{\"email\":\"" + email + "\",\"password\":\"wrong password\"}", null);
        expect(status, 401);
        call("POST", "/api/auth/login", "{\"email\":\"" + email.toUpperCase() + "\",\"password\":\"correct horse\"}", null);
        expect(status, 200);

        // auth required, forged tokens rejected
        call("GET", "/api/me", null, null);
        expect(status, 401);
        call("GET", "/api/me", null, token.replaceFirst("^\\d+", "999"));
        expect(status, 401);

        // workout CRUD with nested sets and a comma inside a name
        String workout = "{\"title\":\"Push, heavy\",\"loggedAt\":\"2026-10-20T17:00:00Z\",\"durationMinutes\":55,"
                + "\"sets\":[{\"exercise\":\"Bench Press\",\"weight\":100,\"reps\":5},{\"exercise\":\"Bench Press\",\"weight\":102.5,\"reps\":3}]}";
        Map<String, Object> w = obj(call("POST", "/api/workouts", workout, token));
        expect(status, 200);
        check("Push, heavy".equals(w.get("title")), "title survives commas");
        check(((Number) w.get("volume")).doubleValue() == 807.5, "volume is computed from sets");
        int id = ((Number) w.get("id")).intValue();
        call("PUT", "/api/workouts/" + id, workout.replace("Push, heavy", "Push day"), token);
        expect(status, 200);
        call("POST", "/api/workouts", "{\"sets\":[{\"weight\":-5}]}", token);
        expect(status, 400);
        call("POST", "/api/weights", "{\"kg\":81.4}", token);
        expect(status, 200);
        call("POST", "/api/meals", "{\"name\":\"Rice bowl\",\"calories\":650,\"protein\":42}", token);
        expect(status, 200);
        Map<String, Object> me = obj(call("GET", "/api/me", null, token));
        List<Object> workouts = (List<Object>) me.get("workouts");
        check(workouts.size() == 1 && "Push day".equals(((Map<String, Object>) workouts.get(0)).get("title")), "update persisted");
        check(((List<Object>) ((Map<String, Object>) workouts.get(0)).get("sets")).size() == 2, "sets persisted");
        check(((List<Object>) me.get("weights")).size() == 1 && ((List<Object>) me.get("meals")).size() == 1, "entries listed");

        // another user can't touch this workout; non-admins can't reach admin routes
        String other = (String) obj(call("POST", "/api/auth/signup", "{\"email\":\"x" + email + "\",\"password\":\"another pass\"}", null)).get("token");
        call("DELETE", "/api/workouts/" + id, null, other);
        expect(status, 404);
        call("GET", "/api/admin/users", null, other);
        expect(status, 403);

        // profile settings round-trip, password change
        call("PUT", "/api/me", "{\"name\":\"Ari N\",\"settings\":{\"units\":\"lbs\",\"routines\":[{\"name\":\"Push\"}]}}", token);
        expect(status, 200);
        check(call("GET", "/api/me", null, token).contains("\"units\":\"lbs\""), "settings persisted");
        call("PUT", "/api/me/password", "{\"current\":\"nope nope\",\"password\":\"new password\"}", token);
        expect(status, 400);
        call("PUT", "/api/me/password", "{\"current\":\"correct horse\",\"password\":\"new password\"}", token);
        expect(status, 200);

        // reset with a wrong code fails, and burns the code
        call("POST", "/api/auth/forgot", "{\"email\":\"" + email + "\"}", null);
        expect(status, 200);
        call("POST", "/api/auth/reset", "{\"email\":\"" + email + "\",\"code\":\"000000x\",\"password\":\"whatever123\"}", null);
        expect(status, 400);

        call("DELETE", "/api/workouts/" + id, null, token);
        expect(status, 200);
        call("DELETE", "/api/me", null, other);
        expect(status, 200);

        // static files: index served, path traversal refused
        check(call("GET", "/", null, null).contains("<div id=\"app\""), "index.html served");
        call("GET", "/../backend/src/com/fitrank/app/Auth.java", null, null);
        check(status == 404 || status == 400, "path traversal refused");
    }

    private static String call(String method, String path, String body, String token) throws Exception {
        HttpURLConnection c = (HttpURLConnection) new URL(base + path).openConnection();
        c.setRequestMethod(method);
        if (token != null) c.setRequestProperty("Authorization", "Bearer " + token);
        if (body != null) {
            c.setDoOutput(true);
            try (OutputStream os = c.getOutputStream()) {
                os.write(body.getBytes(StandardCharsets.UTF_8));
            }
        }
        status = c.getResponseCode();
        InputStream in = status < 400 ? c.getInputStream() : c.getErrorStream();
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        if (in != null) {
            byte[] buf = new byte[4096];
            for (int n; (n = in.read(buf)) > 0; ) out.write(buf, 0, n);
        }
        return new String(out.toByteArray(), StandardCharsets.UTF_8);
    }

    private static Map<String, Object> obj(String json) {
        return Json.object(json);
    }

    private static void expect(String ignored, int code) {
        expect(status, code);
    }

    private static void expect(int actual, int code) {
        check(actual == code, "expected HTTP " + code + " but got " + actual);
    }

    private static void check(boolean ok, String message) {
        if (!ok) throw new AssertionError(message);
    }
}
