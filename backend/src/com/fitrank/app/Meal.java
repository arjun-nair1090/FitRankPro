package com.fitrank.app;

import java.util.Arrays;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

public class Meal extends UserEntry {
    private String name;
    private int calories;
    private double protein;
    private double water;

    @Override
    public List<String> fields() {
        return Arrays.asList("name", "calories", "protein", "water");
    }

    @Override
    protected void read(Map<String, Object> m) {
        name = text(m, "name", "Meal", 160);
        calories = (int) range(m, "calories", 20000);
        protein = range(m, "protein", 1000);
        water = range(m, "water", 20);
    }

    @Override
    protected Map<String, Object> values() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("name", name);
        m.put("calories", calories);
        m.put("protein", protein);
        m.put("water", water);
        return m;
    }
}
