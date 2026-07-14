package com.booknest;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

// RegisterServlet - inserts a new user into the users table in PostgreSQL
@WebServlet("/RegisterServlet")
public class RegisterServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        // Read registration form values
        String registerFullName = request.getParameter("fullName");
        String registerEmail    = request.getParameter("email");
        String registerPassword = request.getParameter("password");

        // Validate - all fields are required
        if (registerFullName == null || registerEmail == null || registerPassword == null ||
            registerFullName.trim().isEmpty() || registerEmail.trim().isEmpty() || registerPassword.trim().isEmpty()) {
            out.print("{\"status\":\"error\", \"message\":\"Please fill in all the required fields!\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmtCheck  = null;
        PreparedStatement stmtInsert = null;
        ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            // Step 1: Check if email already exists in the database
            String checkSql = "SELECT id FROM users WHERE LOWER(email) = ?";
            stmtCheck = conn.prepareStatement(checkSql);
            stmtCheck.setString(1, registerEmail.trim().toLowerCase());
            rs = stmtCheck.executeQuery();

            if (rs.next()) {
                // Email already registered
                out.print("{\"status\":\"error\", \"message\":\"Email address already registered! Please use a different email.\"}");
                return;
            }

            // Step 2: Email is free - insert new user with default role 'user'
            String insertSql = "INSERT INTO users (full_name, email, password, role) VALUES (?, ?, ?, 'user')";
            stmtInsert = conn.prepareStatement(insertSql);
            stmtInsert.setString(1, registerFullName.trim());
            stmtInsert.setString(2, registerEmail.trim().toLowerCase());
            stmtInsert.setString(3, registerPassword);

            int rowsInserted = stmtInsert.executeUpdate();

            if (rowsInserted > 0) {
                out.print("{\"status\":\"success\", \"message\":\"Registration successful!\"}");
            } else {
                out.print("{\"status\":\"error\", \"message\":\"Registration failed. Please try again!\"}");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database Error: " + e.getMessage() + "\"}");
        } finally {
            try {
                if (rs != null) rs.close();
                if (stmtCheck != null) stmtCheck.close();
                if (stmtInsert != null) stmtInsert.close();
                if (conn != null) conn.close();
            } catch (SQLException ex) {
                ex.printStackTrace();
            }
        }
    }
}
