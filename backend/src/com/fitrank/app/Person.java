package com.fitrank.app;

public abstract class Person extends BaseEntity {
    private String name;
    private String email;

    public Person() {
    }

    public Person(int id, String name, String email) {
        super(id);
        this.name = name;
        this.email = email;
    }

    public String getName() {
        return name;
    }

    public void setName(String name) {
        this.name = name;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }

    public boolean canAccessAdmin() {
        return false;
    }
}
