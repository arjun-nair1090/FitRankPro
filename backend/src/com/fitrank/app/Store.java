package com.fitrank.app;

import java.util.List;
import java.util.Map;

/** Persistence for FitRank. JdbcStore talks to PostgreSQL; MemoryStore is the no-database fallback. */
public interface Store {
    /** "postgres" or "memory", reported to the client so it can say where data lives. */
    String kind();

    User saveUser(User user) throws Exception;

    User findUser(int id) throws Exception;

    User findUserByEmail(String email) throws Exception;

    List<User> users(String query) throws Exception;

    boolean deleteUser(int id) throws Exception;

    <T extends UserEntry> List<T> entries(Class<T> type, int userId) throws Exception;

    /** Inserts when the id is 0, otherwise updates the user's own entry; returns null when it doesn't exist. */
    <T extends UserEntry> T saveEntry(T entry) throws Exception;

    boolean deleteEntry(Class<? extends UserEntry> type, int userId, int id) throws Exception;

    /** Admin overview: counts, total volume and the most logged exercises. */
    Map<String, Object> stats() throws Exception;
}
