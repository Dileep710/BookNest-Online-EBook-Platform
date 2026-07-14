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

// FavoriteServlet - GET lists favorites, POST adds/removes/checks a favorite book
@WebServlet("/FavoriteServlet")
public class FavoriteServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    // Helper: get userId from session or from request parameter
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

    // GET: Return all favorite books for the logged-in user
    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        int currentUserId = getUserIdFromSession(request);
        if (currentUserId == -1) {
            out.print("[]");
            return;
        }

        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            // Join favorites with books to get book details
            String sql = "SELECT b.id, b.title, b.author, b.category, b.cover_image " +
                         "FROM favorites f " +
                         "JOIN books b ON f.book_id = b.id " +
                         "WHERE f.user_id = ?";

            stmt = conn.prepareStatement(sql);
            stmt.setInt(1, currentUserId);
            rs = stmt.executeQuery();

            StringBuilder jsonOutput = new StringBuilder();
            jsonOutput.append("[");

            boolean isFirst = true;

            while (rs.next()) {
                if (!isFirst) {
                    jsonOutput.append(",");
                }

                int favoriteBookId = rs.getInt("id");
                String favoriteBookTitle = rs.getString("title");
                String favoriteBookAuthor = rs.getString("author");
                String favoriteBookCategory = rs.getString("category");
                String favoriteBookCover = rs.getString("cover_image");

                // Generate initials for cover display
                String favoriteBookInitials = "";
                if (favoriteBookTitle != null && favoriteBookTitle.trim().length() > 0) {
                    favoriteBookInitials = favoriteBookTitle.substring(0, Math.min(2, favoriteBookTitle.length())).toUpperCase();
                }

                jsonOutput.append("{");
                jsonOutput.append("\"id\":").append(favoriteBookId).append(",");
                jsonOutput.append("\"title\":\"").append(escapeJson(favoriteBookTitle)).append("\",");
                jsonOutput.append("\"author\":\"").append(escapeJson(favoriteBookAuthor)).append("\",");
                jsonOutput.append("\"category\":\"").append(escapeJson(favoriteBookCategory)).append("\",");
                jsonOutput.append("\"coverClass\":\"").append(escapeJson(favoriteBookCover)).append("\",");
                jsonOutput.append("\"initials\":\"").append(escapeJson(favoriteBookInitials)).append("\"");
                jsonOutput.append("}");

                isFirst = false;
            }

            jsonOutput.append("]");
            out.print(jsonOutput.toString());

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("[]");
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

    // POST: Toggle favorite (add or remove), or check if a book is favorited
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

        String actionType = request.getParameter("action");
        String requestedBookTitle = request.getParameter("bookTitle");

        if (requestedBookTitle == null || requestedBookTitle.trim().isEmpty()) {
            out.print("{\"status\":\"error\", \"message\":\"Book title is required.\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            // Step 1: Find book ID by title
            PreparedStatement stmtFindBook = conn.prepareStatement("SELECT id FROM books WHERE LOWER(title) = ?");
            stmtFindBook.setString(1, requestedBookTitle.trim().toLowerCase());
            ResultSet rsBook = stmtFindBook.executeQuery();

            int foundBookId = -1;
            if (rsBook.next()) {
                foundBookId = rsBook.getInt("id");
            }
            rsBook.close();
            stmtFindBook.close();

            if (foundBookId == -1) {
                out.print("{\"status\":\"error\", \"message\":\"Book not found.\"}");
                return;
            }

            // Step 2: Check if this book is already in the user's favorites
            PreparedStatement stmtCheck = conn.prepareStatement("SELECT id FROM favorites WHERE user_id = ? AND book_id = ?");
            stmtCheck.setInt(1, currentUserId);
            stmtCheck.setInt(2, foundBookId);
            rs = stmtCheck.executeQuery();

            boolean isAlreadyFavorite = rs.next();
            rs.close();
            stmtCheck.close();

            // If action is 'check', just return current favorite status
            if ("check".equals(actionType)) {
                out.print("{\"status\":\"success\", \"isFavorite\":" + isAlreadyFavorite + "}");
                return;
            }

            // Toggle: remove if already favorite, add if not
            if (isAlreadyFavorite) {
                stmt = conn.prepareStatement("DELETE FROM favorites WHERE user_id = ? AND book_id = ?");
                stmt.setInt(1, currentUserId);
                stmt.setInt(2, foundBookId);
                stmt.executeUpdate();
                out.print("{\"status\":\"success\", \"message\":\"Removed from favorites.\", \"isFavorite\":false}");
            } else {
                stmt = conn.prepareStatement("INSERT INTO favorites (user_id, book_id) VALUES (?, ?)");
                stmt.setInt(1, currentUserId);
                stmt.setInt(2, foundBookId);
                stmt.executeUpdate();
                out.print("{\"status\":\"success\", \"message\":\"Added to favorites.\", \"isFavorite\":true}");
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
