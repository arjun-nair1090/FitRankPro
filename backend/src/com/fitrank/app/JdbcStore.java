package com.fitrank.app;

import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.ResultSetMetaData;
import java.sql.SQLException;
import java.sql.Statement;
import java.sql.Timestamp;
import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** PostgreSQL store. Opens a connection per call. */
public class JdbcStore implements Store {
    // ponytail: connection per request; add a pool (HikariCP) if this ever serves more than one household.
    private final String url;
    private final String user;
    private final String password;

    public JdbcStore(String url, String user, String password, Path schema) throws Exception {
        this.url = url;
        this.user = user;
        this.password = password;
        try (Connection c = connect(); Statement st = c.createStatement()) {
            for (String sql : new String(Files.readAllBytes(schema), StandardCharsets.UTF_8).split(";")) {
                if (!sql.trim().isEmpty()) st.execute(sql);
            }
        }
    }

    private Connection connect() throws SQLException {
        return DriverManager.getConnection(url, user, password);
    }

    @Override
    public String kind() {
        return "postgres";
    }

    // ---- users ----

    @Override
    public User saveUser(User u) throws SQLException {
        try (Connection c = connect()) {
            if (u.getId() == 0) {
                PreparedStatement st = c.prepareStatement("INSERT INTO users (name,email,password_hash,goal,role,plan,settings) VALUES (?,?,?,?,?,?,?)",
                        Statement.RETURN_GENERATED_KEYS);
                bind(st, u.getName(), u.getEmail(), u.getPasswordHash(), u.getGoal(), u.getRole(), u.getPlan(), u.getSettings());
                st.executeUpdate();
                ResultSet keys = st.getGeneratedKeys();
                keys.next();
                u.setId(keys.getInt(1));
                u.setCreatedAt(Instant.now().toString());
            } else {
                PreparedStatement st = c.prepareStatement("UPDATE users SET name=?,email=?,password_hash=?,goal=?,role=?,plan=?,settings=? WHERE id=?");
                bind(st, u.getName(), u.getEmail(), u.getPasswordHash(), u.getGoal(), u.getRole(), u.getPlan(), u.getSettings(), u.getId());
                st.executeUpdate();
            }
            return u;
        } catch (SQLException e) {
            if ("23505".equals(e.getSQLState())) throw new IllegalStateException("An account with this email already exists");
            throw e;
        }
    }

    @Override
    public User findUser(int id) throws SQLException {
        List<User> found = queryUsers("SELECT * FROM users WHERE id=?", id);
        return found.isEmpty() ? null : found.get(0);
    }

    @Override
    public User findUserByEmail(String email) throws SQLException {
        List<User> found = queryUsers("SELECT * FROM users WHERE email=?", email.toLowerCase());
        return found.isEmpty() ? null : found.get(0);
    }

    @Override
    public List<User> users(String query) throws SQLException {
        String q = "%" + (query == null ? "" : query.toLowerCase()) + "%";
        return queryUsers("SELECT * FROM users WHERE lower(name) LIKE ? OR email LIKE ? ORDER BY id DESC", q, q);
    }

    @Override
    public boolean deleteUser(int id) throws SQLException {
        return update("DELETE FROM users WHERE id=?", id) > 0;
    }

    private List<User> queryUsers(String sql, Object... args) throws SQLException {
        List<User> users = new ArrayList<User>();
        for (Map<String, Object> row : query(sql, args)) {
            User u = User.forRole((String) row.get("role"));
            u.setId((Integer) row.get("id"));
            u.setName((String) row.get("name"));
            u.setEmail((String) row.get("email"));
            u.setPasswordHash((String) row.get("password_hash"));
            u.setGoal((String) row.get("goal"));
            u.setPlan((String) row.get("plan"));
            u.setSettings((String) row.get("settings"));
            u.setCreatedAt((String) row.get("created_at"));
            users.add(u);
        }
        return users;
    }

    // ---- entries: columns are the entry's field names in snake_case ----

    @Override
    public <T extends UserEntry> List<T> entries(Class<T> type, int userId) throws Exception {
        String table = table(type);
        Map<Integer, List<Object>> sets = new HashMap<Integer, List<Object>>();
        if (type == WorkoutSession.class) {
            for (Map<String, Object> row : query("SELECT s.* FROM workout_sets s JOIN workout_sessions w ON w.id=s.session_id WHERE w.user_id=? ORDER BY s.session_id, s.set_order", userId)) {
                Integer sessionId = (Integer) row.get("session_id");
                if (!sets.containsKey(sessionId)) sets.put(sessionId, new ArrayList<Object>());
                sets.get(sessionId).add(row);
            }
        }
        List<T> found = new ArrayList<T>();
        for (Map<String, Object> row : query("SELECT * FROM " + table + " WHERE user_id=? ORDER BY logged_at DESC", userId)) {
            T e = type.getDeclaredConstructor().newInstance();
            Map<String, Object> m = new HashMap<String, Object>();
            for (String f : e.fields()) m.put(f, row.get(column(f)));
            m.put("loggedAt", row.get("logged_at"));
            if (sets.containsKey(row.get("id"))) m.put("sets", sets.get(row.get("id")));
            e.load(m);
            e.setId((Integer) row.get("id"));
            e.setUserId(userId);
            found.add(e);
        }
        return found;
    }

    @Override
    public <T extends UserEntry> T saveEntry(T e) throws SQLException {
        String table = table(e.getClass());
        List<String> fields = e.fields();
        Map<String, Object> values = e.toMap();
        List<Object> args = new ArrayList<Object>();
        StringBuilder cols = new StringBuilder("user_id,logged_at");
        StringBuilder sets = new StringBuilder("logged_at=?");
        args.add(Timestamp.from(Instant.parse(e.getLoggedAt())));
        for (String f : fields) {
            cols.append(',').append(column(f));
            sets.append(',').append(column(f)).append("=?");
            args.add(values.get(f));
        }
        try (Connection c = connect()) {
            c.setAutoCommit(false);
            try {
                if (e.getId() == 0) {
                    args.add(0, e.getUserId());
                    PreparedStatement st = c.prepareStatement("INSERT INTO " + table + " (" + cols + ") VALUES (" + marks(args.size()) + ")",
                            Statement.RETURN_GENERATED_KEYS);
                    bind(st, args.toArray());
                    st.executeUpdate();
                    ResultSet keys = st.getGeneratedKeys();
                    keys.next();
                    e.setId(keys.getInt(1));
                } else {
                    args.add(e.getId());
                    args.add(e.getUserId());
                    PreparedStatement st = c.prepareStatement("UPDATE " + table + " SET " + sets + " WHERE id=? AND user_id=?");
                    bind(st, args.toArray());
                    if (st.executeUpdate() == 0) {
                        c.rollback();
                        return null;
                    }
                }
                if (e instanceof WorkoutSession) saveSets(c, (WorkoutSession) e);
                c.commit();
                return e;
            } catch (SQLException ex) {
                c.rollback();
                throw ex;
            }
        }
    }

    private void saveSets(Connection c, WorkoutSession w) throws SQLException {
        PreparedStatement clear = c.prepareStatement("DELETE FROM workout_sets WHERE session_id=?");
        bind(clear, w.getId());
        clear.executeUpdate();
        PreparedStatement st = c.prepareStatement("INSERT INTO workout_sets (session_id,set_order,exercise,weight,reps,rpe,tag) VALUES (?,?,?,?,?,?,?)");
        int order = 0;
        for (WorkoutSet s : w.getSets()) {
            bind(st, w.getId(), ++order, s.getExercise(), s.getWeight(), s.getReps(), s.getRpe(), s.getTag());
            st.addBatch();
        }
        st.executeBatch();
    }

    @Override
    public boolean deleteEntry(Class<? extends UserEntry> type, int userId, int id) throws SQLException {
        return update("DELETE FROM " + table(type) + " WHERE id=? AND user_id=?", id, userId) > 0;
    }

    @Override
    public Map<String, Object> stats() throws SQLException {
        Map<String, Object> totals = query("SELECT (SELECT count(*) FROM users) AS users,"
                + " (SELECT count(*) FROM users WHERE plan<>'FREE' AND role<>'ADMIN') AS premium,"
                + " (SELECT count(*) FROM workout_sessions) AS workouts,"
                + " (SELECT count(*) FROM workout_sets) AS sets,"
                + " (SELECT coalesce(sum(weight*reps),0) FROM workout_sets) AS volume").get(0);
        List<Object> top = new ArrayList<Object>();
        for (Map<String, Object> row : query("SELECT exercise, count(*) AS n FROM workout_sets GROUP BY exercise ORDER BY n DESC LIMIT 5")) {
            top.add(MemoryStore.pair((String) row.get("exercise"), ((Number) row.get("n")).intValue()));
        }
        return statsMap(((Number) totals.get("users")).intValue(), ((Number) totals.get("premium")).intValue(),
                ((Number) totals.get("workouts")).intValue(), ((Number) totals.get("sets")).intValue(),
                ((Number) totals.get("volume")).doubleValue(), top);
    }

    static Map<String, Object> statsMap(int users, int premium, int workouts, int sets, double volume, List<Object> top) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("users", users);
        m.put("premium", premium);
        m.put("workouts", workouts);
        m.put("sets", sets);
        m.put("volume", volume);
        m.put("topExercises", top);
        return m;
    }

    // ---- helpers ----

    private static String table(Class<?> type) {
        if (type == WorkoutSession.class) return "workout_sessions";
        if (type == Meal.class) return "meals";
        if (type == WeightLog.class) return "weight_logs";
        throw new IllegalArgumentException("Unknown entry type " + type.getSimpleName());
    }

    static String column(String field) {
        return field.replaceAll("([A-Z])", "_$1").toLowerCase();
    }

    private static String marks(int n) {
        StringBuilder b = new StringBuilder();
        for (int i = 0; i < n; i++) b.append(i == 0 ? "?" : ",?");
        return b.toString();
    }

    private static void bind(PreparedStatement st, Object... args) throws SQLException {
        for (int i = 0; i < args.length; i++) st.setObject(i + 1, args[i]);
    }

    private int update(String sql, Object... args) throws SQLException {
        try (Connection c = connect(); PreparedStatement st = c.prepareStatement(sql)) {
            bind(st, args);
            return st.executeUpdate();
        }
    }

    /** Runs a query and returns rows as maps; timestamps become ISO strings, decimals become doubles. */
    private List<Map<String, Object>> query(String sql, Object... args) throws SQLException {
        try (Connection c = connect(); PreparedStatement st = c.prepareStatement(sql)) {
            bind(st, args);
            ResultSet rs = st.executeQuery();
            ResultSetMetaData meta = rs.getMetaData();
            List<Map<String, Object>> rows = new ArrayList<Map<String, Object>>();
            while (rs.next()) {
                Map<String, Object> row = new HashMap<String, Object>();
                for (int i = 1; i <= meta.getColumnCount(); i++) {
                    Object v = rs.getObject(i);
                    if (v instanceof Timestamp) v = ((Timestamp) v).toInstant().toString();
                    else if (v instanceof java.math.BigDecimal) v = ((java.math.BigDecimal) v).doubleValue();
                    row.put(meta.getColumnLabel(i), v);
                }
                rows.add(row);
            }
            return rows;
        }
    }
}
