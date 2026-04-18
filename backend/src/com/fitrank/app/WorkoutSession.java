package com.fitrank.app;

import java.util.ArrayList;
import java.util.List;

public class WorkoutSession extends BaseEntity {
    private int userId;
    private String title;
    private String notes;
    private int calories;
    private int durationMinutes;
    private String visibility;
    private List<WorkoutSet> sets;

    public WorkoutSession() {
        this.sets = new ArrayList<WorkoutSet>();
        this.visibility = "PRIVATE";
    }

    public WorkoutSession(int id, int userId, String title) {
        super(id);
        this.userId = userId;
        this.title = title;
        this.sets = new ArrayList<WorkoutSet>();
        this.visibility = "PRIVATE";
    }

    public void addSet(WorkoutSet set) {
        set.setOrder(sets.size() + 1);
        sets.add(set);
    }

    public void addSet(int exerciseId, double weight, int reps) {
        addSet(new WorkoutSet(exerciseId, weight, reps));
    }

    public int getUserId() {
        return userId;
    }

    public void setUserId(int userId) {
        this.userId = userId;
    }

    public String getTitle() {
        return title;
    }

    public void setTitle(String title) {
        this.title = title;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    public int getCalories() {
        return calories;
    }

    public void setCalories(int calories) {
        this.calories = calories;
    }

    public int getDurationMinutes() {
        return durationMinutes;
    }

    public void setDurationMinutes(int durationMinutes) {
        this.durationMinutes = durationMinutes;
    }

    public String getVisibility() {
        return visibility;
    }

    public void setVisibility(String visibility) {
        this.visibility = visibility;
    }

    public List<WorkoutSet> getSets() {
        return sets;
    }

    public void setSets(List<WorkoutSet> sets) {
        this.sets = sets;
    }

    @Override
    public String toJson() {
        StringBuilder builder = new StringBuilder();
        builder.append("{\"id\":").append(getId())
                .append(",\"userId\":").append(userId)
                .append(",\"title\":\"").append(JsonUtil.escape(title))
                .append("\",\"notes\":\"").append(JsonUtil.escape(notes))
                .append("\",\"calories\":").append(calories)
                .append(",\"durationMinutes\":").append(durationMinutes)
                .append(",\"visibility\":\"").append(JsonUtil.escape(visibility))
                .append("\",\"sets\":[");
        for (int i = 0; i < sets.size(); i++) {
            if (i > 0) {
                builder.append(",");
            }
            builder.append(sets.get(i).toJson());
        }
        builder.append("]}");
        return builder.toString();
    }
}
