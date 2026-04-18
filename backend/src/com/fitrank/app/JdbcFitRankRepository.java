package com.fitrank.app;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.ArrayList;
import java.util.List;

public class JdbcFitRankRepository {
    private final String url;
    private final String username;
    private final String password;

    public JdbcFitRankRepository() {
        this.url = env("FITRANK_DB_URL", "jdbc:postgresql://localhost:5432/fitrank");
        this.username = env("FITRANK_DB_USER", "postgres");
        this.password = env("FITRANK_DB_PASSWORD", "postgres");
    }

    public Connection connect() throws SQLException {
        return DriverManager.getConnection(url, username, password);
    }

    public User createUser(User user) throws SQLException {
        String sql = "INSERT INTO users (name,email,password_hash,goal,role,plan,status,streak_days) VALUES (?,?,?,?,?,?,?,?)";
        Connection connection = connect();
        try {
            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, user.getName());
            statement.setString(2, user.getEmail());
            statement.setString(3, user.getPasswordHash());
            statement.setString(4, user.getGoal());
            statement.setString(5, user.getRole());
            statement.setString(6, user.getPlan());
            statement.setString(7, user.getStatus());
            statement.setInt(8, user.getStreakDays());
            statement.executeUpdate();
            ResultSet keys = statement.getGeneratedKeys();
            if (keys.next()) {
                user.setId(keys.getInt(1));
            }
            return user;
        } finally {
            connection.close();
        }
    }

    public List<User> findUsers(String query) throws SQLException {
        List<User> users = new ArrayList<User>();
        String sql = "SELECT id,name,email,goal,role,plan,status,streak_days FROM users WHERE lower(name) LIKE ? OR lower(email) LIKE ? ORDER BY id DESC";
        Connection connection = connect();
        try {
            PreparedStatement statement = connection.prepareStatement(sql);
            String term = "%" + (query == null ? "" : query.toLowerCase()) + "%";
            statement.setString(1, term);
            statement.setString(2, term);
            ResultSet rs = statement.executeQuery();
            while (rs.next()) {
                User user = mapUser(rs);
                users.add(user);
            }
            return users;
        } finally {
            connection.close();
        }
    }

    public List<Exercise> findExercises(String query) throws SQLException {
        List<Exercise> exercises = new ArrayList<Exercise>();
        String sql = "SELECT id,name,category,primary_muscle,equipment,substitute,instructions FROM exercises WHERE lower(name) LIKE ? OR lower(category) LIKE ? ORDER BY category,name";
        Connection connection = connect();
        try {
            PreparedStatement statement = connection.prepareStatement(sql);
            String term = "%" + (query == null ? "" : query.toLowerCase()) + "%";
            statement.setString(1, term);
            statement.setString(2, term);
            ResultSet rs = statement.executeQuery();
            while (rs.next()) {
                Exercise exercise = new Exercise(rs.getInt("id"), rs.getString("name"), rs.getString("category"),
                        rs.getString("primary_muscle"), rs.getString("equipment"), rs.getString("substitute"));
                exercise.setInstructions(rs.getString("instructions"));
                exercises.add(exercise);
            }
            return exercises;
        } finally {
            connection.close();
        }
    }

    public Exercise createExercise(Exercise exercise) throws SQLException {
        String sql = "INSERT INTO exercises (name,category,primary_muscle,equipment,substitute,instructions) VALUES (?,?,?,?,?,?)";
        Connection connection = connect();
        try {
            PreparedStatement statement = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            statement.setString(1, exercise.getName());
            statement.setString(2, exercise.getCategory());
            statement.setString(3, exercise.getPrimaryMuscle());
            statement.setString(4, exercise.getEquipment());
            statement.setString(5, exercise.getSubstitute());
            statement.setString(6, exercise.getInstructions());
            statement.executeUpdate();
            ResultSet keys = statement.getGeneratedKeys();
            if (keys.next()) {
                exercise.setId(keys.getInt(1));
            }
            return exercise;
        } finally {
            connection.close();
        }
    }

    public WorkoutSession createWorkout(WorkoutSession session) throws SQLException {
        String sessionSql = "INSERT INTO workout_sessions (user_id,title,notes,calories,duration_minutes,visibility) VALUES (?,?,?,?,?,?)";
        Connection connection = connect();
        try {
            connection.setAutoCommit(false);
            PreparedStatement statement = connection.prepareStatement(sessionSql, Statement.RETURN_GENERATED_KEYS);
            statement.setInt(1, session.getUserId());
            statement.setString(2, session.getTitle());
            statement.setString(3, session.getNotes());
            statement.setInt(4, session.getCalories());
            statement.setInt(5, session.getDurationMinutes());
            statement.setString(6, session.getVisibility());
            statement.executeUpdate();
            ResultSet keys = statement.getGeneratedKeys();
            if (keys.next()) {
                session.setId(keys.getInt(1));
            }
            String setSql = "INSERT INTO workout_sets (session_id,exercise_id,set_order,weight,reps,duration_seconds,distance_km,rpe,tag,notes) VALUES (?,?,?,?,?,?,?,?,?,?)";
            for (WorkoutSet set : session.getSets()) {
                PreparedStatement setStatement = connection.prepareStatement(setSql);
                setStatement.setInt(1, session.getId());
                setStatement.setInt(2, set.getExerciseId());
                setStatement.setInt(3, set.getOrder());
                setStatement.setDouble(4, set.getWeight());
                setStatement.setInt(5, set.getReps());
                setStatement.setInt(6, set.getDurationSeconds());
                setStatement.setDouble(7, set.getDistanceKm());
                setStatement.setDouble(8, set.getRpe());
                setStatement.setString(9, set.getTag());
                setStatement.setString(10, set.getNotes());
                setStatement.executeUpdate();
            }
            connection.commit();
            return session;
        } catch (SQLException ex) {
            connection.rollback();
            throw ex;
        } finally {
            connection.close();
        }
    }

    public String dashboardStats() throws SQLException {
        Connection connection = connect();
        try {
            int users = count(connection, "SELECT count(*) FROM users");
            int workouts = count(connection, "SELECT count(*) FROM workout_sessions");
            int exercises = count(connection, "SELECT count(*) FROM exercises");
            int paid = count(connection, "SELECT count(*) FROM users WHERE plan <> 'FREE'");
            return "{\"users\":" + users + ",\"workouts\":" + workouts + ",\"exercises\":" + exercises
                    + ",\"paidSubscribers\":" + paid + "}";
        } finally {
            connection.close();
        }
    }

    private int count(Connection connection, String sql) throws SQLException {
        PreparedStatement statement = connection.prepareStatement(sql);
        ResultSet rs = statement.executeQuery();
        return rs.next() ? rs.getInt(1) : 0;
    }

    private User mapUser(ResultSet rs) throws SQLException {
        User user = new User(rs.getInt("id"), rs.getString("name"), rs.getString("email"),
                rs.getString("goal"), rs.getString("plan"), rs.getInt("streak_days"));
        user.setRole(rs.getString("role"));
        user.setStatus(rs.getString("status"));
        return user;
    }

    private String env(String key, String fallback) {
        String value = System.getenv(key);
        return value == null || value.trim().length() == 0 ? fallback : value;
    }
}
