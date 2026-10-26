package com.fitrank.app;

import java.time.Instant;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.Iterator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/** In-memory store used when PostgreSQL is unreachable. Data is lost on restart. */
public class MemoryStore implements Store {
    private final List<User> users = new ArrayList<User>();
    private final Map<Class<?>, List<UserEntry>> entries = new HashMap<Class<?>, List<UserEntry>>();
    private int nextId = 1;

    @Override
    public String kind() {
        return "memory";
    }

    @Override
    public synchronized User saveUser(User user) {
        if (user.getId() == 0) {
            if (findUserByEmail(user.getEmail()) != null) throw new IllegalStateException("An account with this email already exists");
            user.setId(nextId++);
            user.setCreatedAt(Instant.now().toString());
            users.add(user);
        }
        return user;
    }

    @Override
    public synchronized User findUser(int id) {
        for (User u : users) if (u.getId() == id) return u;
        return null;
    }

    @Override
    public synchronized User findUserByEmail(String email) {
        for (User u : users) if (u.getEmail().equalsIgnoreCase(email)) return u;
        return null;
    }

    @Override
    public synchronized List<User> users(String query) {
        String q = query == null ? "" : query.toLowerCase();
        List<User> found = new ArrayList<User>();
        for (int i = users.size() - 1; i >= 0; i--) {
            User u = users.get(i);
            if (u.getName().toLowerCase().contains(q) || u.getEmail().contains(q)) found.add(u);
        }
        return found;
    }

    @Override
    public synchronized boolean deleteUser(int id) {
        for (List<UserEntry> list : entries.values()) {
            for (Iterator<UserEntry> it = list.iterator(); it.hasNext(); ) if (it.next().getUserId() == id) it.remove();
        }
        return users.remove(findUser(id));
    }

    @Override
    public synchronized <T extends UserEntry> List<T> entries(Class<T> type, int userId) {
        List<T> found = new ArrayList<T>();
        for (UserEntry e : list(type)) if (e.getUserId() == userId) found.add(type.cast(e));
        return found;
    }

    @Override
    public synchronized <T extends UserEntry> T saveEntry(T entry) {
        List<UserEntry> list = list(entry.getClass());
        if (entry.getId() == 0) {
            entry.setId(nextId++);
            list.add(0, entry);
            return entry;
        }
        for (int i = 0; i < list.size(); i++) {
            UserEntry old = list.get(i);
            if (old.getId() == entry.getId() && old.getUserId() == entry.getUserId()) {
                list.set(i, entry);
                return entry;
            }
        }
        return null;
    }

    @Override
    public synchronized boolean deleteEntry(Class<? extends UserEntry> type, int userId, int id) {
        for (Iterator<UserEntry> it = list(type).iterator(); it.hasNext(); ) {
            UserEntry e = it.next();
            if (e.getId() == id && e.getUserId() == userId) {
                it.remove();
                return true;
            }
        }
        return false;
    }

    @Override
    public synchronized Map<String, Object> stats() {
        int premium = 0;
        for (User u : users) if (!(u instanceof AdminUser) && u.isPremium()) premium++;
        int sets = 0;
        double volume = 0;
        Map<String, Integer> counts = new HashMap<String, Integer>();
        for (UserEntry e : list(WorkoutSession.class)) {
            for (WorkoutSet s : ((WorkoutSession) e).getSets()) {
                sets++;
                volume += s.volume();
                Integer c = counts.get(s.getExercise());
                counts.put(s.getExercise(), c == null ? 1 : c + 1);
            }
        }
        List<Map.Entry<String, Integer>> sorted = new ArrayList<Map.Entry<String, Integer>>(counts.entrySet());
        sorted.sort((a, b) -> b.getValue() - a.getValue());
        List<Object> top = new ArrayList<Object>();
        for (Map.Entry<String, Integer> e : sorted.subList(0, Math.min(5, sorted.size()))) top.add(pair(e.getKey(), e.getValue()));
        return JdbcStore.statsMap(users.size(), premium, list(WorkoutSession.class).size(), sets, volume, top);
    }

    static Map<String, Object> pair(String name, int sets) {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("exercise", name);
        m.put("sets", sets);
        return m;
    }

    private List<UserEntry> list(Class<?> type) {
        List<UserEntry> list = entries.get(type);
        if (list == null) entries.put(type, list = new ArrayList<UserEntry>());
        return list;
    }
}
