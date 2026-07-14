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

// ManageUsersServlet - Admin only: list all users, view single user details, delete a user
@WebServlet("/ManageUsersServlet")
public class ManageUsersServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    // GET: list all users OR get details of one specific user
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        // Only admin is allowed
        HttpSession session = request.getSession(false);
        if (session == null || !"admin".equals(session.getAttribute("role"))) {
            out.print("{\"status\":\"error\", \"message\":\"Access Denied! Administrators only.\"}");
            return;
        }

        // selectedUserId is used when clicking "View Details" for a specific user
        String selectedUserIdStr = request.getParameter("selectedUserId");
        Connection conn = null;

        try {
            conn = DatabaseConnection.getConnection();

            if (selectedUserIdStr != null && !selectedUserIdStr.isEmpty()) {
                // Fetch a single user's profile and reading history
                int selectedUserId = Integer.parseInt(selectedUserIdStr);
                fetchSingleUserDetails(conn, selectedUserId, out);
            } else {
                // List all registered users
                fetchAllUsersList(conn, out);
            }

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database error: " + escapeJson(e.getMessage()) + "\"}");
        } finally {
            try {
                if (conn != null) conn.close();
            } catch (SQLException ex) {
                ex.printStackTrace();
            }
        }
    }

    // POST: Delete a user account and all their data
    protected void doPost(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        // Only admin is allowed
        HttpSession session = request.getSession(false);
        if (session == null || !"admin".equals(session.getAttribute("role"))) {
            out.print("{\"status\":\"error\", \"message\":\"Access Denied! Administrators only.\"}");
            return;
        }

        String actionParam = request.getParameter("action");
        String deleteUserIdStr = request.getParameter("userId");

        if ("delete".equals(actionParam) && deleteUserIdStr != null && !deleteUserIdStr.isEmpty()) {
            int deleteUserId = Integer.parseInt(deleteUserIdStr);

            Connection conn = null;
            PreparedStatement stmtHistory = null;
            PreparedStatement stmtFavorites = null;
            PreparedStatement stmtUser = null;

            try {
                conn = DatabaseConnection.getConnection();
                conn.setAutoCommit(false); // Begin transaction

                // Step 1: Delete all reading history for this user
                stmtHistory = conn.prepareStatement("DELETE FROM reading_history WHERE user_id = ?");
                stmtHistory.setInt(1, deleteUserId);
                stmtHistory.executeUpdate();

                // Step 2: Delete all favorites for this user
                stmtFavorites = conn.prepareStatement("DELETE FROM favorites WHERE user_id = ?");
                stmtFavorites.setInt(1, deleteUserId);
                stmtFavorites.executeUpdate();

                // Step 3: Delete the user record itself (only non-admin users can be deleted)
                stmtUser = conn.prepareStatement("DELETE FROM users WHERE id = ? AND role = 'user'");
                stmtUser.setInt(1, deleteUserId);
                int rowsDeleted = stmtUser.executeUpdate();

                if (rowsDeleted > 0) {
                    conn.commit();
                    out.print("{\"status\":\"success\", \"message\":\"User deleted successfully!\"}");
                } else {
                    conn.rollback();
                    out.print("{\"status\":\"error\", \"message\":\"Failed to delete user. User not found or is admin.\"}");
                }

            } catch (SQLException e) {
                e.printStackTrace();
                if (conn != null) {
                    try { conn.rollback(); } catch (SQLException rollbackEx) { rollbackEx.printStackTrace(); }
                }
                out.print("{\"status\":\"error\", \"message\":\"Database transaction error: " + escapeJson(e.getMessage()) + "\"}");
            } finally {
                try {
                    if (stmtHistory != null) stmtHistory.close();
                    if (stmtFavorites != null) stmtFavorites.close();
                    if (stmtUser != null) stmtUser.close();
                    if (conn != null) conn.close();
                } catch (SQLException ex) {
                    ex.printStackTrace();
                }
            }
        } else {
            out.print("{\"status\":\"error\", \"message\":\"Invalid action parameters.\"}");
        }
    }

    // Helper: Returns JSON array of all registered users (non-admin)
    private void fetchAllUsersList(Connection conn, PrintWriter out) throws SQLException {
        String sql = "SELECT id, full_name, email, role, phone, fav_genre, created_at FROM users WHERE role = 'user' ORDER BY id ASC";
        PreparedStatement stmt = conn.prepareStatement(sql);
        ResultSet rs = stmt.executeQuery();

        StringBuilder jsonOutput = new StringBuilder();
        jsonOutput.append("[");
        boolean isFirst = true;

        while (rs.next()) {
            if (!isFirst) {
                jsonOutput.append(",");
            }
            isFirst = false;

            String userPhone = rs.getString("phone");
            String userFavGenre = rs.getString("fav_genre");
            String userCreatedAt = rs.getTimestamp("created_at") != null ? rs.getTimestamp("created_at").toString() : "-";

            jsonOutput.append("{");
            jsonOutput.append("\"id\":").append(rs.getInt("id")).append(",");
            jsonOutput.append("\"fullName\":\"").append(escapeJson(rs.getString("full_name"))).append("\",");
            jsonOutput.append("\"email\":\"").append(escapeJson(rs.getString("email"))).append("\",");
            jsonOutput.append("\"role\":\"").append(escapeJson(rs.getString("role"))).append("\",");
            jsonOutput.append("\"phone\":\"").append(escapeJson(userPhone != null ? userPhone : "-")).append("\",");
            jsonOutput.append("\"favGenre\":\"").append(escapeJson(userFavGenre != null ? userFavGenre : "-")).append("\",");
            jsonOutput.append("\"createdAt\":\"").append(escapeJson(userCreatedAt)).append("\"");
            jsonOutput.append("}");
        }

        jsonOutput.append("]");
        out.print(jsonOutput.toString());

        rs.close();
        stmt.close();
    }

    // Helper: Returns profile + reading history of a single user by ID
    private void fetchSingleUserDetails(Connection conn, int selectedUserId, PrintWriter out) throws SQLException {
        // Fetch user info
        PreparedStatement userStmt = conn.prepareStatement(
            "SELECT id, full_name, email, phone, fav_genre, created_at FROM users WHERE id = ? AND role = 'user'");
        userStmt.setInt(1, selectedUserId);
        ResultSet userRs = userStmt.executeQuery();

        if (!userRs.next()) {
            out.print("{\"status\":\"error\", \"message\":\"User not found.\"}");
            userRs.close();
            userStmt.close();
            return;
        }

        String userPhone = userRs.getString("phone");
        String userFavGenre = userRs.getString("fav_genre");
        String userCreatedAt = userRs.getTimestamp("created_at") != null ? userRs.getTimestamp("created_at").toString() : "-";

        StringBuilder jsonOutput = new StringBuilder();
        jsonOutput.append("{");
        jsonOutput.append("\"status\":\"success\",");
        jsonOutput.append("\"id\":").append(userRs.getInt("id")).append(",");
        jsonOutput.append("\"fullName\":\"").append(escapeJson(userRs.getString("full_name"))).append("\",");
        jsonOutput.append("\"email\":\"").append(escapeJson(userRs.getString("email"))).append("\",");
        jsonOutput.append("\"phone\":\"").append(escapeJson(userPhone != null ? userPhone : "-")).append("\",");
        jsonOutput.append("\"favGenre\":\"").append(escapeJson(userFavGenre != null ? userFavGenre : "-")).append("\",");
        jsonOutput.append("\"createdAt\":\"").append(escapeJson(userCreatedAt)).append("\",");

        // Fetch reading history for this user
        PreparedStatement historyStmt = conn.prepareStatement(
            "SELECT b.title, b.author, b.category, rh.current_page, rh.last_read " +
            "FROM reading_history rh " +
            "JOIN books b ON rh.book_id = b.id " +
            "WHERE rh.user_id = ? " +
            "ORDER BY rh.last_read DESC");
        historyStmt.setInt(1, selectedUserId);
        ResultSet historyRs = historyStmt.executeQuery();

        jsonOutput.append("\"history\": [");
        boolean isFirstHistory = true;

        while (historyRs.next()) {
            if (!isFirstHistory) {
                jsonOutput.append(",");
            }
            isFirstHistory = false;

            String histLastRead = historyRs.getTimestamp("last_read") != null ? historyRs.getTimestamp("last_read").toString() : "-";

            jsonOutput.append("{");
            jsonOutput.append("\"title\":\"").append(escapeJson(historyRs.getString("title"))).append("\",");
            jsonOutput.append("\"author\":\"").append(escapeJson(historyRs.getString("author"))).append("\",");
            jsonOutput.append("\"category\":\"").append(escapeJson(historyRs.getString("category"))).append("\",");
            jsonOutput.append("\"currentPage\":").append(historyRs.getInt("current_page")).append(",");
            jsonOutput.append("\"lastRead\":\"").append(escapeJson(histLastRead)).append("\"");
            jsonOutput.append("}");
        }

        jsonOutput.append("]");
        jsonOutput.append("}");
        out.print(jsonOutput.toString());

        historyRs.close();
        historyStmt.close();
        userRs.close();
        userStmt.close();
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
