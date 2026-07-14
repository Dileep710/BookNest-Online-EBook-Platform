package com.booknest;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

// LoginServlet - checks email and password against users table in PostgreSQL
@WebServlet("/LoginServlet")
public class LoginServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        // Read login form values
        String enteredEmail = request.getParameter("email");
        String enteredPassword = request.getParameter("password");
        String selectedRole = request.getParameter("role");

        // Basic validation - email and password must not be empty
        if (enteredEmail == null || enteredPassword == null ||
            enteredEmail.trim().isEmpty() || enteredPassword.trim().isEmpty()) {
            out.print("{\"status\":\"error\", \"message\":\"Please enter both email and password!\"}");
            return;
        }

        // Default role to 'user' if not specified
        if (selectedRole == null || selectedRole.trim().isEmpty()) {
            selectedRole = "user";
        }

        Connection conn = null;
        PreparedStatement stmt = null;
        java.sql.ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            // Check email, password, and role in users table
            String sql = "SELECT id, full_name, email, role FROM users WHERE LOWER(email) = ? AND password = ? AND role = ?";
            stmt = conn.prepareStatement(sql);
            stmt.setString(1, enteredEmail.trim().toLowerCase());
            stmt.setString(2, enteredPassword);
            stmt.setString(3, selectedRole.trim());

            rs = stmt.executeQuery();

            if (rs.next()) {
                int loggedInUserId = rs.getInt("id");
                String loggedInFullName = rs.getString("full_name");
                String loggedInEmail = rs.getString("email");
                String loggedInRole = rs.getString("role");

                // Create session and store user details
                HttpSession session = request.getSession(true);
                session.setAttribute("userId", loggedInUserId);
                session.setAttribute("fullName", loggedInFullName);
                session.setAttribute("email", loggedInEmail);
                session.setAttribute("role", loggedInRole);

                // Return success response with user details
                StringBuilder jsonResponse = new StringBuilder();
                jsonResponse.append("{");
                jsonResponse.append("\"status\":\"success\",");
                jsonResponse.append("\"message\":\"Login successful!\",");
                jsonResponse.append("\"userId\":").append(loggedInUserId).append(",");
                jsonResponse.append("\"name\":\"").append(escapeJson(loggedInFullName)).append("\",");
                jsonResponse.append("\"email\":\"").append(escapeJson(loggedInEmail)).append("\",");
                jsonResponse.append("\"role\":\"").append(escapeJson(loggedInRole)).append("\"");
                jsonResponse.append("}");

                out.print(jsonResponse.toString());

            } else {
                out.print("{\"status\":\"error\", \"message\":\"Invalid Email or Password.\"}");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database Error: " + escapeJson(e.getMessage()) + "\"}");
        } finally {
            try {
                if (rs != null) rs.close();
                if (stmt != null) stmt.close();
                if (conn != null) conn.close();
            } catch (SQLException ex) {
                ex.printStackTrace();
            }
        }
    }

    private String escapeJson(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\r", "\\r")
                    .replace("\n", "\\n")
                    .replace("\t", "\\t");
    }
}
