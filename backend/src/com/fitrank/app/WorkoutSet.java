package com.fitrank.app;

import java.util.LinkedHashMap;
import java.util.Map;

/** One logged set. Sets belong to a session and have no identity of their own. */
public class WorkoutSet {
    private final String exercise;
    private final double weight;
    private final int reps;
    private final double rpe;
    private final String tag;

    public WorkoutSet(String exercise, double weight, int reps, double rpe, String tag) {
        this.exercise = exercise;
        this.weight = weight;
        this.reps = reps;
        this.rpe = rpe;
        this.tag = tag;
    }

    public static WorkoutSet from(Map<String, Object> m) {
        return new WorkoutSet(UserEntry.text(m, "exercise", "Exercise", 120), UserEntry.range(m, "weight", 2000),
                (int) UserEntry.range(m, "reps", 1000), UserEntry.range(m, "rpe", 10), UserEntry.text(m, "tag", "normal", 20));
    }

    public double volume() {
        return weight * reps;
    }

    public String getExercise() {
        return exercise;
    }

    public double getWeight() {
        return weight;
    }

    public int getReps() {
        return reps;
    }

    public double getRpe() {
        return rpe;
    }

    public String getTag() {
        return tag;
    }

    public Map<String, Object> toMap() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("exercise", exercise);
        m.put("weight", weight);
        m.put("reps", reps);
        m.put("rpe", rpe);
        m.put("tag", tag);
        return m;
    }
}
