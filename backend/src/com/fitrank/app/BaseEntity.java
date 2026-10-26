package com.fitrank.app;

import java.util.LinkedHashMap;
import java.util.Map;

/** Root of every stored record: an id plus its own JSON shape. */
public abstract class BaseEntity {
    private int id;

    public int getId() {
        return id;
    }

    public void setId(int id) {
        this.id = id;
    }

    /** Each entity describes the fields it exposes over the API. */
    public abstract Map<String, Object> toMap();

    public String toJson() {
        return Json.write(toMap());
    }

    protected Map<String, Object> idMap() {
        Map<String, Object> m = new LinkedHashMap<String, Object>();
        m.put("id", id);
        return m;
    }
}
