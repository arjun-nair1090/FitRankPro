package com.fitrank.app;

import java.util.Map;

public class User extends Person {
    private String passwordHash;
    private String goal = "Strength";
    private String plan = "FREE";
    private String settings = "{}";
    private String createdAt;

    /** Builds the right subclass for a stored role. */
    public static User forRole(String role) {
        return "ADMIN".equals(role) ? new AdminUser() : new User();
    }

    public String getRole() {
        return "USER";
    }

    public boolean isPremium() {
        return !"FREE".equals(plan);
    }

    /** Applies the editable profile fields from a request body. */
    public void apply(Map<String, Object> body) {
        setName(UserEntry.text(body, "name", getName(), 120));
        goal = UserEntry.text(body, "goal", goal, 80);
        if (body.containsKey("settings")) {
            Object s = body.get("settings");
            if (!(s instanceof Map)) throw new IllegalArgumentException("'settings' must be an object");
            String json = Json.write(s);
            if (json.length() > 200000) throw new IllegalArgumentException("Settings are too large");
            settings = json;
        }
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public void setPasswordHash(String passwordHash) {
        this.passwordHash = passwordHash;
    }

    public String getGoal() {
        return goal;
    }

    public void setGoal(String goal) {
        this.goal = goal;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        if (!"FREE".equals(plan) && !"PREMIUM".equals(plan)) throw new IllegalArgumentException("Plan must be FREE or PREMIUM");
        this.plan = plan;
    }

    public String getSettings() {
        return settings;
    }

    public void setSettings(String settings) {
        this.settings = settings == null || settings.isEmpty() ? "{}" : settings;
    }

    public String getCreatedAt() {
        return createdAt;
    }

    public void setCreatedAt(String createdAt) {
        this.createdAt = createdAt;
    }

    @Override
    public Map<String, Object> toMap() {
        Map<String, Object> m = idMap();
        m.put("name", getName());
        m.put("email", getEmail());
        m.put("goal", goal);
        m.put("role", getRole());
        m.put("plan", plan);
        m.put("createdAt", createdAt);
        m.put("settings", Json.parse(settings));
        return m;
    }
}
