package com.fitrank.app;

import com.sun.net.httpserver.HttpExchange;
import com.sun.net.httpserver.HttpServer;

import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.io.InputStream;
import java.io.OutputStream;
import java.net.InetSocketAddress;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.Paths;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.Map;
import java.util.concurrent.Executors;

/** FitRank REST API plus the static frontend, on one port. */
public class FitRankServer {
    private static final int MAX_BODY = 2 * 1024 * 1024;
    private static final Map<String, Class<? extends UserEntry>> KINDS = new HashMap<String, Class<? extends UserEntry>>();
    private static final Map<String, String> TYPES = new HashMap<String, String>();

    static {
        KINDS.put("workouts", WorkoutSession.class);
        KINDS.put("meals", Meal.class);
        KINDS.put("weights", WeightLog.class);
        TYPES.put("html", "text/html; charset=utf-8");
        TYPES.put("js", "text/javascript; charset=utf-8");
        TYPES.put("css", "text/css; charset=utf-8");
        TYPES.put("json", "application/json; charset=utf-8");
        TYPES.put("webmanifest", "application/manifest+json");
        TYPES.put("svg", "image/svg+xml");
        TYPES.put("png", "image/png");
    }

    private final Store store;
    private final Auth auth;
    private final Path web;

    FitRankServer(Store store, Auth auth, Path web) {
        this.store = store;
        this.auth = auth;
        this.web = web;
    }

    public static void main(String[] args) throws Exception {
        int port = Integer.parseInt(env("PORT", "8080"));
        FitRankServer app = new FitRankServer(openStore(), new Auth(env("FITRANK_SECRET", null)), locate("frontend"));
        app.ensureAdmin();
        app.start(port);
        System.out.println("FitRank running on http://localhost:" + port + " (store: " + app.store.kind() + ")");
        if (System.getenv("FITRANK_SECRET") == null) {
            System.out.println("Tip: set FITRANK_SECRET so sign-ins survive a server restart.");
        }
    }

    HttpServer start(int port) throws IOException {
        HttpServer server = HttpServer.create(new InetSocketAddress(port), 0);
        server.createContext("/api/", this::api);
        server.createContext("/", this::staticFile);
        server.setExecutor(Executors.newCachedThreadPool());
        server.start();
        return server;
    }

    private static Store openStore() {
        try {
            return new JdbcStore(env("FITRANK_DB_URL", "jdbc:postgresql://localhost:5432/fitrank"), env("FITRANK_DB_USER", "postgres"),
                    env("FITRANK_DB_PASSWORD", ""), locate("database").resolve("schema.sql"));
        } catch (Exception e) {
            System.out.println("PostgreSQL unavailable (" + e.getMessage() + ").");
            System.out.println("Using the in-memory store: data is lost when the server stops.");
            return new MemoryStore();
        }
    }

    /** Creates the first admin account when none exists. */
    void ensureAdmin() throws Exception {
        for (User u : store.users("")) if (u.canAccessAdmin()) return;
        String password = env("FITRANK_ADMIN_PASSWORD", null);
        boolean generated = password == null;
        if (generated) password = Auth.randomPassword();
        AdminUser admin = new AdminUser();
        admin.setName("FitRank Admin");
        admin.setEmail(env("FITRANK_ADMIN_EMAIL", "admin@fitrank.app"));
        admin.setPasswordHash(Auth.hash(password));
        store.saveUser(admin);
        System.out.println("Created admin " + admin.getEmail() + (generated ? " with password " + password : ""));
    }

    // ---- API ----

    private void api(HttpExchange ex) throws IOException {
        int status = 200;
        Object result;
        try {
            result = route(ex.getRequestMethod(), ex.getRequestURI().getPath().replaceAll("/+$", ""), ex);
        } catch (HttpError e) {
            status = e.status;
            result = error(e.getMessage());
        } catch (IllegalArgumentException e) {
            status = 400;
            result = error(e.getMessage());
        } catch (IllegalStateException e) {
            status = 409;
            result = error(e.getMessage());
        } catch (Exception e) {
            e.printStackTrace();
            status = 500;
            result = error("Something went wrong on the server");
        }
        ex.getResponseHeaders().set("Cache-Control", "no-store");
        send(ex, status, "application/json; charset=utf-8", Json.write(result).getBytes(StandardCharsets.UTF_8));
    }

    private Object route(String method, String path, HttpExchange ex) throws Exception {
        if (path.equals("/api/health")) return map("status", "ok", "store", store.kind());
        if (method.equals("POST") && path.equals("/api/auth/signup")) return signup(body(ex));
        if (method.equals("POST") && path.equals("/api/auth/login")) return login(body(ex));
        if (method.equals("POST") && path.equals("/api/auth/forgot")) return forgot(body(ex));
        if (method.equals("POST") && path.equals("/api/auth/reset")) return reset(body(ex));

        User me = currentUser(ex);
        if (path.equals("/api/me")) {
            if (method.equals("GET")) {
                return map("user", me, "workouts", store.entries(WorkoutSession.class, me.getId()),
                        "meals", store.entries(Meal.class, me.getId()), "weights", store.entries(WeightLog.class, me.getId()));
            }
            if (method.equals("PUT")) {
                me.apply(body(ex));
                return store.saveUser(me);
            }
            if (method.equals("DELETE")) {
                if (me.canAccessAdmin()) throw new HttpError(400, "Admin accounts can't be deleted");
                store.deleteUser(me.getId());
                return map("ok", true);
            }
        }
        if (method.equals("PUT") && path.equals("/api/me/password")) {
            Map<String, Object> b = body(ex);
            if (!Auth.verify(Json.str(b, "current", ""), me.getPasswordHash())) throw new HttpError(400, "Current password is wrong");
            String next = Json.str(b, "password", "");
            Auth.checkStrength(next);
            me.setPasswordHash(Auth.hash(next));
            store.saveUser(me);
            return map("ok", true);
        }
        if (path.startsWith("/api/admin/")) return admin(method, path, me, ex);

        String[] parts = path.split("/");
        Class<? extends UserEntry> kind = parts.length >= 3 ? KINDS.get(parts[2]) : null;
        if (kind != null && parts.length == 3) {
            if (method.equals("GET")) return store.entries(kind, me.getId());
            if (method.equals("POST")) return saveEntry(kind, 0, me, body(ex));
        }
        if (kind != null && parts.length == 4) {
            int id = id(parts[3]);
            if (method.equals("PUT")) return saveEntry(kind, id, me, body(ex));
            if (method.equals("DELETE")) {
                if (!store.deleteEntry(kind, me.getId(), id)) throw new HttpError(404, "Not found");
                return map("ok", true);
            }
        }
        throw new HttpError(404, "No route for " + method + " " + path);
    }

    private Object signup(Map<String, Object> b) throws Exception {
        String email = Json.str(b, "email", "").toLowerCase();
        if (!email.matches("[^@\\s]+@[^@\\s]+\\.[^@\\s]+")) throw new IllegalArgumentException("Enter a valid email address");
        String password = Json.str(b, "password", "");
        Auth.checkStrength(password);
        User u = new User();
        u.setEmail(email);
        u.setName(UserEntry.text(b, "name", email.split("@")[0], 120));
        u.setGoal(UserEntry.text(b, "goal", "Strength", 80));
        u.setPasswordHash(Auth.hash(password));
        return session(store.saveUser(u));
    }

    private Object login(Map<String, Object> b) throws Exception {
        User u = store.findUserByEmail(Json.str(b, "email", ""));
        if (u == null || !Auth.verify(Json.str(b, "password", ""), u.getPasswordHash())) throw new HttpError(401, "Wrong email or password");
        return session(u);
    }

    private Object forgot(Map<String, Object> b) throws Exception {
        String email = Json.str(b, "email", "").toLowerCase();
        if (store.findUserByEmail(email) != null) {
            // FitRank has no mail service: the code goes to the server console the owner is running.
            System.out.println("Password reset code for " + email + ": " + auth.startReset(email) + " (valid 30 minutes)");
        }
        return map("message", "If that account exists, a 6-digit reset code is now in the FitRank server console.");
    }

    private Object reset(Map<String, Object> b) throws Exception {
        String email = Json.str(b, "email", "").toLowerCase();
        String password = Json.str(b, "password", "");
        Auth.checkStrength(password);
        User u = store.findUserByEmail(email);
        if (u == null || !auth.finishReset(email, Json.str(b, "code", ""))) throw new HttpError(400, "That reset code is wrong or expired. Request a new one.");
        u.setPasswordHash(Auth.hash(password));
        return session(store.saveUser(u));
    }

    private Object admin(String method, String path, User me, HttpExchange ex) throws Exception {
        if (!me.canAccessAdmin()) throw new HttpError(403, "Admins only");
        if (method.equals("GET") && path.equals("/api/admin/stats")) return store.stats();
        if (method.equals("GET") && path.equals("/api/admin/users")) return store.users(query(ex, "q"));
        String[] parts = path.split("/");
        if (parts.length == 5 && parts[3].equals("users")) {
            User target = store.findUser(id(parts[4]));
            if (target == null) throw new HttpError(404, "User not found");
            if (target.canAccessAdmin()) throw new HttpError(400, "Admin accounts can't be changed here");
            if (method.equals("PUT")) {
                target.setPlan(Json.str(body(ex), "plan", ""));
                return store.saveUser(target);
            }
            if (method.equals("DELETE")) {
                store.deleteUser(target.getId());
                return map("ok", true);
            }
        }
        throw new HttpError(404, "No route for " + method + " " + path);
    }

    private <T extends UserEntry> Object saveEntry(Class<T> kind, int id, User me, Map<String, Object> b) throws Exception {
        T entry = kind.getDeclaredConstructor().newInstance();
        entry.load(b);
        entry.setId(id);
        entry.setUserId(me.getId());
        T saved = store.saveEntry(entry);
        if (saved == null) throw new HttpError(404, "Not found");
        return saved;
    }

    private Map<String, Object> session(User u) {
        return map("token", auth.issue(u.getId()), "user", u);
    }

    private User currentUser(HttpExchange ex) throws Exception {
        String header = ex.getRequestHeaders().getFirst("Authorization");
        int id = auth.verifyToken(header != null && header.startsWith("Bearer ") ? header.substring(7) : null);
        User u = id < 0 ? null : store.findUser(id);
        if (u == null) throw new HttpError(401, "Please sign in again");
        return u;
    }

    // ---- static frontend ----

    private void staticFile(HttpExchange ex) throws IOException {
        String path = ex.getRequestURI().getPath();
        Path file = web.resolve(path.substring(1)).normalize();
        if (Files.isDirectory(file)) file = file.resolve("index.html");
        if (!file.startsWith(web) || !Files.isRegularFile(file)) {
            send(ex, 404, "text/plain; charset=utf-8", "Not found".getBytes(StandardCharsets.UTF_8));
            return;
        }
        String name = file.getFileName().toString();
        String type = TYPES.get(name.substring(name.lastIndexOf('.') + 1));
        ex.getResponseHeaders().set("Cache-Control", "no-cache");
        ex.getResponseHeaders().set("Content-Security-Policy",
                "default-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob:; connect-src 'self'");
        send(ex, 200, type == null ? "application/octet-stream" : type, Files.readAllBytes(file));
    }

    // ---- helpers ----

    private static void send(HttpExchange ex, int status, String type, byte[] bytes) throws IOException {
        ex.getResponseHeaders().set("Content-Type", type);
        ex.getResponseHeaders().set("X-Content-Type-Options", "nosniff");
        ex.sendResponseHeaders(status, bytes.length);
        try (OutputStream os = ex.getResponseBody()) {
            os.write(bytes);
        }
    }

    private static Map<String, Object> body(HttpExchange ex) throws IOException {
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        byte[] buf = new byte[8192];
        try (InputStream in = ex.getRequestBody()) {
            for (int n; (n = in.read(buf)) > 0; ) {
                out.write(buf, 0, n);
                if (out.size() > MAX_BODY) throw new HttpError(413, "Request body is too large");
            }
        }
        return Json.object(new String(out.toByteArray(), StandardCharsets.UTF_8));
    }

    private static String query(HttpExchange ex, String key) throws IOException {
        String raw = ex.getRequestURI().getRawQuery();
        if (raw != null) {
            for (String pair : raw.split("&")) {
                String[] kv = pair.split("=", 2);
                if (kv[0].equals(key) && kv.length == 2) return URLDecoder.decode(kv[1], "UTF-8");
            }
        }
        return "";
    }

    private static int id(String s) {
        try {
            return Integer.parseInt(s);
        } catch (NumberFormatException e) {
            throw new HttpError(404, "Not found");
        }
    }

    private static Map<String, Object> map(Object... kv) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        for (int i = 0; i < kv.length; i += 2) m.put((String) kv[i], kv[i + 1]);
        return m;
    }

    private static Map<String, Object> error(String message) {
        return map("error", message);
    }

    private static Path locate(String dir) {
        Path here = Paths.get(dir);
        return (Files.isDirectory(here) ? here : Paths.get("..", dir)).toAbsolutePath().normalize();
    }

    private static String env(String key, String fallback) {
        String v = System.getenv(key);
        return v == null || v.trim().isEmpty() ? fallback : v;
    }

    private static class HttpError extends RuntimeException {
        final int status;

        HttpError(int status, String message) {
            super(message);
            this.status = status;
        }
    }
}
