package com.fitrank.app;

import java.sql.SQLException;
import java.util.ArrayList;
import java.util.List;

public class MemoryRepository implements CrudRepository<BaseEntity> {
    private final List<BaseEntity> records = new ArrayList<BaseEntity>();
    private int nextId = 1;

    @Override
    public BaseEntity create(BaseEntity record) throws SQLException {
        record.setId(nextId++);
        records.add(record);
        return record;
    }

    @Override
    public List<BaseEntity> findAll() throws SQLException {
        return new ArrayList<BaseEntity>(records);
    }

    @Override
    public BaseEntity findById(int id) throws SQLException {
        for (BaseEntity record : records) {
            if (record.getId() == id) {
                return record;
            }
        }
        return null;
    }

    @Override
    public BaseEntity update(BaseEntity record) throws SQLException {
        delete(record.getId());
        records.add(record);
        return record;
    }

    @Override
    public boolean delete(int id) throws SQLException {
        BaseEntity found = findById(id);
        return found != null && records.remove(found);
    }

    @Override
    public List<BaseEntity> search(String query) throws SQLException {
        List<BaseEntity> matches = new ArrayList<BaseEntity>();
        String normalized = query == null ? "" : query.toLowerCase();
        for (BaseEntity record : records) {
            if (record.toJson().toLowerCase().contains(normalized)) {
                matches.add(record);
            }
        }
        return matches;
    }
}
