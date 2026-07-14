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
import javax.servlet.http.HttpSession;

// ProfileServlet - GET fetches user profile, POST updates user profile and optionally password
@WebServlet("/ProfileServlet")
public class ProfileServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    // Helper: gets userId from session or request parameter
    private int getUserIdFromSession(HttpServletRequest request) {
        HttpSession session = request.getSession(false);
        if (session != null && session.getAttribute("userId") != null) {
            return (Integer) session.getAttribute("userId");
        }
        String userIdParam = request.getParameter("userId");
        if (userIdParam != null && !userIdParam.trim().isEmpty()) {
            try {
                return Integer.parseInt(userIdParam.trim());
            } catch (NumberFormatException e) {
                // Not a valid number, ignore
            }
        }
        return -1;
    }

    // GET: Load user profile details from database
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        int currentUserId = getUserIdFromSession(request);
        if (currentUserId == -1) {
            out.print("{\"status\":\"error\", \"message\":\"User not logged in.\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            String sql = "SELECT full_name, email, phone, fav_genre, notifications FROM users WHERE id = ?";
            stmt = conn.prepareStatement(sql);
            stmt.setInt(1, currentUserId);
            rs = stmt.executeQuery();

            if (rs.next()) {
                String userFullName = rs.getString("full_name");
                String userEmail = rs.getString("email");
                String userPhone = rs.getString("phone");
                String userFavGenre = rs.getString("fav_genre");
                String userNotifications = rs.getString("notifications");

                StringBuilder jsonResponse = new StringBuilder();
                jsonResponse.append("{");
                jsonResponse.append("\"status\":\"success\",");
                jsonResponse.append("\"fullName\":\"").append(escapeJson(userFullName)).append("\",");
                jsonResponse.append("\"email\":\"").append(escapeJson(userEmail)).append("\",");
                jsonResponse.append("\"phone\":\"").append(escapeJson(userPhone)).append("\",");
                jsonResponse.append("\"favGenre\":\"").append(escapeJson(userFavGenre)).append("\",");
                jsonResponse.append("\"notifications\":\"").append(escapeJson(userNotifications)).append("\"");
                jsonResponse.append("}");

                out.print(jsonResponse.toString());
            } else {
                out.print("{\"status\":\"error\", \"message\":\"User profile not found in database.\"}");
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

    // POST: Update user profile (and optionally update password)
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        int currentUserId = getUserIdFromSession(request);
        if (currentUserId == -1) {
            out.print("{\"status\":\"error\", \"message\":\"User not logged in.\"}");
            return;
        }

        String newFullName = request.getParameter("fullName");
        String newEmail = request.getParameter("email");
        String newPhone = request.getParameter("phone");
        String newFavGenre = request.getParameter("favGenre");
        String newNotifications = request.getParameter("notifications");
        String newPassword = request.getParameter("newPassword");

        // fullName and email are required
        if (newFullName == null || newEmail == null || newFullName.trim().isEmpty() || newEmail.trim().isEmpty()) {
            out.print("{\"status\":\"error\", \"message\":\"Full Name and Email are required!\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmt = null;

        try {
            conn = DatabaseConnection.getConnection();
            String sql;

            if (newPassword != null && !newPassword.trim().isEmpty()) {
                // Update profile including password
                sql = "UPDATE users SET full_name = ?, email = ?, phone = ?, fav_genre = ?, notifications = ?, password = ? WHERE id = ?";
                stmt = conn.prepareStatement(sql);
                stmt.setString(1, newFullName.trim());
                stmt.setString(2, newEmail.trim());
                stmt.setString(3, newPhone != null ? newPhone.trim() : "");
                stmt.setString(4, newFavGenre != null ? newFavGenre.trim() : "");
                stmt.setString(5, newNotifications != null ? newNotifications.trim() : "");
                stmt.setString(6, newPassword);
                stmt.setInt(7, currentUserId);
            } else {
                // Update profile without changing password
                sql = "UPDATE users SET full_name = ?, email = ?, phone = ?, fav_genre = ?, notifications = ? WHERE id = ?";
                stmt = conn.prepareStatement(sql);
                stmt.setString(1, newFullName.trim());
                stmt.setString(2, newEmail.trim());
                stmt.setString(3, newPhone != null ? newPhone.trim() : "");
                stmt.setString(4, newFavGenre != null ? newFavGenre.trim() : "");
                stmt.setString(5, newNotifications != null ? newNotifications.trim() : "");
                stmt.setInt(6, currentUserId);
            }

            int rowsUpdated = stmt.executeUpdate();

            if (rowsUpdated > 0) {
                // Update session with new name and email
                HttpSession session = request.getSession(false);
                if (session != null) {
                    session.setAttribute("fullName", newFullName);
                    session.setAttribute("email", newEmail);
                }
                out.print("{\"status\":\"success\", \"message\":\"Profile updated successfully!\"}");
            } else {
                out.print("{\"status\":\"error\", \"message\":\"Failed to update profile.\"}");
            }

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database Error: " + escapeJson(e.getMessage()) + "\"}");
        } finally {
            try {
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
