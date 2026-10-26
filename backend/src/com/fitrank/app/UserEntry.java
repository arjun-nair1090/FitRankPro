package com.fitrank.app;

import java.util.List;
import java.util.Map;

/**
 * A timestamped record owned by one user (workouts, meals, weigh-ins).
 * Subclasses list their stored fields; JSON keys double as column names (camelCase -> snake_case),
 * which lets both stores persist every entry type with the same code.
 */
public abstract class UserEntry extends BaseEntity {
    private int userId;
    private String loggedAt;

    /** The stored fields beyond id, user and timestamp, in column order. */
    public abstract List<String> fields();

    /** Reads the stored fields back from a map built from JSON or a database row. */
    protected abstract void read(Map<String, Object> m);

    /** Values for {@link #fields()}, keyed the same way. */
    protected abstract Map<String, Object> values();

    public void load(Map<String, Object> m) {
        loggedAt = Json.time(m, "loggedAt");
        read(m);
    }

    @Override
    public Map<String, Object> toMap() {
        Map<String, Object> m = idMap();
        m.put("loggedAt", loggedAt);
        m.putAll(values());
        return m;
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getLoggedAt() {
        return loggedAt;
    }

    protected static String text(Map<String, Object> m, String key, String fallback, int max) {
        String s = Json.str(m, key, fallback);
        if (s.length() > max) throw new IllegalArgumentException("'" + key + "' is longer than " + max + " characters");
        return s;
    }

    protected static double range(Map<String, Object> m, String key, double max) {
        double v = Json.num(m, key, 0);
        if (v < 0 || v > max) throw new IllegalArgumentException("'" + key + "' must be between 0 and " + (long) max);
        return v;
    }
}
