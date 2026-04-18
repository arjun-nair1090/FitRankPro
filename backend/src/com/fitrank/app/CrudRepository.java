package com.fitrank.app;

import java.sql.SQLException;
import java.util.List;

public interface CrudRepository<T extends BaseEntity> {
    T create(T record) throws SQLException;
    List<T> findAll() throws SQLException;
    T findById(int id) throws SQLException;
    T update(T record) throws SQLException;
    boolean delete(int id) throws SQLException;
    List<T> search(String query) throws SQLException;
}
