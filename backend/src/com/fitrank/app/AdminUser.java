package com.fitrank.app;

public class AdminUser extends User {
    private String adminRole;

    public AdminUser(int id, String name, String email, String adminRole) {
        super(id, name, email, "Strength");
        this.adminRole = adminRole;
        setRole(adminRole);
        setPlan("TEAM");
    }

    public String getAdminRole() {
        return adminRole;
    }

    public void setAdminRole(String adminRole) {
        this.adminRole = adminRole;
        setRole(adminRole);
    }

    @Override
    public boolean canAccessAdmin() {
        return true;
    }

    @Override
    public String toJson() {
        return "{\"id\":" + getId()
                + ",\"name\":\"" + JsonUtil.escape(getName())
                + "\",\"email\":\"" + JsonUtil.escape(getEmail())
                + "\",\"role\":\"" + JsonUtil.escape(adminRole)
                + "\",\"admin\":true}";
    }
}
