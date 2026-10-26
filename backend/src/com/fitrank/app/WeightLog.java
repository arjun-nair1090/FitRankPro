package com.fitrank.app;

import java.util.Collections;
import java.util.List;
import java.util.Map;

public class WeightLog extends UserEntry {
    private double kg;

    @Override
    public List<String> fields() {
        return Collections.singletonList("kg");
    }

    @Override
    protected void read(Map<String, Object> m) {
        kg = range(m, "kg", 500);
        if (kg == 0) throw new IllegalArgumentException("'kg' is required");
    }

    @Override
    protected Map<String, Object> values() {
        return Collections.<String, Object>singletonMap("kg", kg);
    }
}
