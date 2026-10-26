package com.fitrank.app;

import java.util.ArrayList;
import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class WorkoutSession extends UserEntry {
    private String title;
    private String notes;
    private int durationMinutes;
    private int calories;
    private final List<WorkoutSet> sets = new ArrayList<WorkoutSet>();

    @Override
    public List<String> fields() {
        return Arrays.asList("title", "notes", "durationMinutes", "calories");
    }

    @Override
    protected void read(Map<String, Object> m) {
        title = text(m, "title", "Workout", 160);
        notes = text(m, "notes", "", 4000);
        durationMinutes = (int) range(m, "durationMinutes", 1440);
        calories = (int) range(m, "calories", 20000);
        if (m.containsKey("sets")) {
            List<Object> raw = Json.list(m, "sets");
            if (raw.size() > 500) throw new IllegalArgumentException("A workout can hold at most 500 sets");
            sets.clear();
            for (Object o : raw) {
                if (!(o instanceof Map)) throw new IllegalArgumentException("Each set must be an object");
                @SuppressWarnings("unchecked")
                Map<String, Object> set = (Map<String, Object>) o;
                addSet(WorkoutSet.from(set));
            }
        }
    }

    @Override
    protected Map<String, Object> values() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("title", title);
        m.put("notes", notes);
        m.put("durationMinutes", durationMinutes);
        m.put("calories", calories);
        List<Object> list = new ArrayList<Object>();
        for (WorkoutSet s : sets) list.add(s.toMap());
        m.put("sets", list);
        m.put("volume", volume());
        return m;
    }

    public void addSet(WorkoutSet set) {
        sets.add(set);
    }

    public void addSet(String exercise, double weight, int reps) {
        addSet(new WorkoutSet(exercise, weight, reps, 0, "normal"));
    }

    public double volume() {
        double total = 0;
        for (WorkoutSet s : sets) total += s.volume();
        return total;
    }

    public List<WorkoutSet> getSets() {
        return sets;
    }
}
