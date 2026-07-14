package com.booknest;

import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.SQLException;

/**
 * DatabaseConnection.java
 * Simple helper class to get a database connection using JDBC and PostgreSQL.
 * Used by all servlets to execute SQL queries.
 */
public class DatabaseConnection {

    // Database configurations
    // Change these values to match your local PostgreSQL configuration
    private static final String URL = "jdbc:postgresql://localhost:5432/booknest";
    private static final String USER = "postgres";
    private static final String PASSWORD = "Dileep1234....."; // Enter your PostgreSQL password here

    // Static block to register the PostgreSQL driver
    static {
        try {
            Class.forName("org.postgresql.Driver");
        } catch (ClassNotFoundException e) {
            System.err.println("PostgreSQL JDBC Driver not found! Add postgresql.jar to WEB-INF/lib.");
            e.printStackTrace();
        }
    }

    // Returns a connection object to the database
    public static Connection getConnection() throws SQLException {
        return DriverManager.getConnection(URL, USER, PASSWORD);
    }
}
