package com.fitrank.app;

public class User extends Person {
    private String passwordHash;
    private String goal;
    private String role;
    private String plan;
    private String status;
    private int streakDays;

    public User() {
        setRole("USER");
        setPlan("FREE");
        setStatus("ACTIVE");
    }

    public User(int id, String name, String email, String goal) {
        super(id, name, email);
        this.goal = goal;
        this.role = "USER";
        this.plan = "FREE";
        this.status = "ACTIVE";
    }

    public User(int id, String name, String email, String goal, String plan, int streakDays) {
        this(id, name, email, goal);
        this.plan = plan;
        this.streakDays = streakDays;
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

    public String getRole() {
        return role;
    }

    public void setRole(String role) {
        this.role = role;
    }

    public String getPlan() {
        return plan;
    }

    public void setPlan(String plan) {
        this.plan = plan;
    }

    public String getStatus() {
        return status;
    }

    public void setStatus(String status) {
        this.status = status;
    }

    public int getStreakDays() {
        return streakDays;
    }

    public void setStreakDays(int streakDays) {
        this.streakDays = streakDays;
    }

    @Override
    public String toJson() {
        return "{\"id\":" + getId()
                + ",\"name\":\"" + JsonUtil.escape(getName())
                + "\",\"email\":\"" + JsonUtil.escape(getEmail())
                + "\",\"goal\":\"" + JsonUtil.escape(goal)
                + "\",\"role\":\"" + JsonUtil.escape(role)
                + "\",\"plan\":\"" + JsonUtil.escape(plan)
                + "\",\"status\":\"" + JsonUtil.escape(status)
                + "\",\"streakDays\":" + streakDays + "}";
    }
}
