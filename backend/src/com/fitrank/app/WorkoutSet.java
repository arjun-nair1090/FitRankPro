package com.fitrank.app;

public class WorkoutSet extends BaseEntity {
    private int exerciseId;
    private int order;
    private double weight;
    private int reps;
    private int durationSeconds;
    private double distanceKm;
    private double rpe;
    private String tag;
    private String notes;

    public WorkoutSet() {
        tag = "WORKING";
    }

    public WorkoutSet(int exerciseId, double weight, int reps) {
        this.exerciseId = exerciseId;
        this.weight = weight;
        this.reps = reps;
        this.tag = "WORKING";
    }

    public int getExerciseId() {
        return exerciseId;
    }

    public void setExerciseId(int exerciseId) {
        this.exerciseId = exerciseId;
    }

    public int getOrder() {
        return order;
    }

    public void setOrder(int order) {
        this.order = order;
    }

    public double getWeight() {
        return weight;
    }

    public void setWeight(double weight) {
        this.weight = weight;
    }

    public int getReps() {
        return reps;
    }

    public void setReps(int reps) {
        this.reps = reps;
    }

    public int getDurationSeconds() {
        return durationSeconds;
    }

    public void setDurationSeconds(int durationSeconds) {
        this.durationSeconds = durationSeconds;
    }

    public double getDistanceKm() {
        return distanceKm;
    }

    public void setDistanceKm(double distanceKm) {
        this.distanceKm = distanceKm;
    }

    public double getRpe() {
        return rpe;
    }

    public void setRpe(double rpe) {
        this.rpe = rpe;
    }

    public String getTag() {
        return tag;
    }

    public void setTag(String tag) {
        this.tag = tag;
    }

    public String getNotes() {
        return notes;
    }

    public void setNotes(String notes) {
        this.notes = notes;
    }

    @Override
    public String toJson() {
        return "{\"exerciseId\":" + exerciseId
                + ",\"order\":" + order
                + ",\"weight\":" + weight
                + ",\"reps\":" + reps
                + ",\"durationSeconds\":" + durationSeconds
                + ",\"distanceKm\":" + distanceKm
                + ",\"rpe\":" + rpe
                + ",\"tag\":\"" + JsonUtil.escape(tag)
                + "\",\"notes\":\"" + JsonUtil.escape(notes) + "\"}";
    }
}
