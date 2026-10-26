package com.fitrank.app;

/** An admin is a user who can manage other accounts; admins always get premium features. */
public class AdminUser extends User {
    @Override
    public String getRole() {
        return "ADMIN";
    }

    @Override
    public boolean canAccessAdmin() {
        return true;
    }

    @Override
    public boolean isPremium() {
        return true;
    }
}
