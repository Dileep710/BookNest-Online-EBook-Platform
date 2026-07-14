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

/*
 * BookServlet.java
 * GET /BookServlet           -> returns all books as JSON array
 * GET /BookServlet?action=stats -> returns site statistics (books, users, categories, rating)
 */
@WebServlet("/BookServlet")
public class BookServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {

        response.setContentType("application/json");
        response.setCharacterEncoding("UTF-8");
        PrintWriter out = response.getWriter();

        String actionParam = request.getParameter("action");

        if ("stats".equals(actionParam)) {
            // Return site statistics
            handleStatsRequest(out);
        } else {
            // Return full books list
            handleBooksListRequest(out);
        }
    }

    // Returns all books from database as a JSON array
    private void handleBooksListRequest(PrintWriter out) {
        Connection conn = null;
        PreparedStatement stmt = null;
        ResultSet rs = null;

        try {
            conn = DatabaseConnection.getConnection();

            String sql = "SELECT * FROM books ORDER BY id ASC";
            stmt = conn.prepareStatement(sql);
            rs = stmt.executeQuery();

            StringBuilder jsonOutput = new StringBuilder();
            jsonOutput.append("[");
            boolean isFirst = true;

            while (rs.next()) {
                if (!isFirst) jsonOutput.append(",");

                int bookId           = rs.getInt("id");
                String bookTitle     = rs.getString("title");
                String bookAuthor    = rs.getString("author");
                String bookCategory  = rs.getString("category");
                String bookDesc      = rs.getString("description");
                String bookPdfPath   = rs.getString("pdf_path");
                String bookCover     = rs.getString("cover_image");
                String bookLanguage  = rs.getString("language");
                int bookPages        = rs.getInt("pages");
                double bookRating    = rs.getDouble("rating");

                // Two-letter initials for book cover placeholder
                String bookInitials = "";
                if (bookTitle != null && bookTitle.trim().length() > 0) {
                    bookInitials = bookTitle.substring(0, Math.min(2, bookTitle.length())).toUpperCase();
                }

                jsonOutput.append("{");
                jsonOutput.append("\"id\":").append(bookId).append(",");
                jsonOutput.append("\"title\":\"").append(escapeJson(bookTitle)).append("\",");
                jsonOutput.append("\"author\":\"").append(escapeJson(bookAuthor)).append("\",");
                jsonOutput.append("\"category\":\"").append(escapeJson(bookCategory)).append("\",");
                jsonOutput.append("\"description\":\"").append(escapeJson(bookDesc)).append("\",");
                jsonOutput.append("\"pdf_path\":\"").append(escapeJson(bookPdfPath)).append("\",");
                jsonOutput.append("\"coverClass\":\"").append(escapeJson(bookCover)).append("\",");
                jsonOutput.append("\"initials\":\"").append(escapeJson(bookInitials)).append("\",");
                jsonOutput.append("\"language\":\"").append(escapeJson(bookLanguage)).append("\",");
                jsonOutput.append("\"pages\":\"").append(bookPages).append(" Pages\",");
                jsonOutput.append("\"rating\":").append(bookRating);
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
            } catch (SQLException ex) { ex.printStackTrace(); }
        }
    }

    // Returns statistics: total books, readers, categories, average rating
    private void handleStatsRequest(PrintWriter out) {
        Connection conn = null;

        try {
            conn = DatabaseConnection.getConnection();

            // Count total books
            int totalBooks = 0;
            PreparedStatement stmtBooks = conn.prepareStatement("SELECT COUNT(*) FROM books");
            ResultSet rsBooks = stmtBooks.executeQuery();
            if (rsBooks.next()) totalBooks = rsBooks.getInt(1);
            rsBooks.close();
            stmtBooks.close();

            // Count total readers (role = 'user')
            int totalReaders = 0;
            PreparedStatement stmtUsers = conn.prepareStatement("SELECT COUNT(*) FROM users WHERE role = 'user'");
            ResultSet rsUsers = stmtUsers.executeQuery();
            if (rsUsers.next()) totalReaders = rsUsers.getInt(1);
            rsUsers.close();
            stmtUsers.close();

            // Count distinct categories
            int totalCategories = 0;
            PreparedStatement stmtCats = conn.prepareStatement("SELECT COUNT(DISTINCT category) FROM books");
            ResultSet rsCats = stmtCats.executeQuery();
            if (rsCats.next()) totalCategories = rsCats.getInt(1);
            rsCats.close();
            stmtCats.close();

            // Average rating across all books
            double avgRating = 0.0;
            PreparedStatement stmtRating = conn.prepareStatement("SELECT AVG(rating) FROM books");
            ResultSet rsRating = stmtRating.executeQuery();
            if (rsRating.next()) avgRating = rsRating.getDouble(1);
            rsRating.close();
            stmtRating.close();

            // Use fallback defaults if database is empty
            if (totalBooks == 0)     totalBooks = 20;
            if (totalReaders == 0)   totalReaders = 500;
            if (totalCategories == 0) totalCategories = 6;
            if (avgRating == 0.0)    avgRating = 4.8;

            out.print("{\"totalBooks\":" + totalBooks +
                      ", \"totalReaders\":" + totalReaders +
                      ", \"totalCategories\":" + totalCategories +
                      ", \"avgRating\":" + (Math.round(avgRating * 10.0) / 10.0) + "}");

        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"totalBooks\":20, \"totalReaders\":500, \"totalCategories\":6, \"avgRating\":4.8}");
        } finally {
            try {
                if (conn != null) conn.close();
            } catch (SQLException ex) { ex.printStackTrace(); }
        }
    }

    private String escapeJson(String value) {
        if (value == null) return "";
        return value.replace("\\", "\\\\")
                    .replace("\"", "\\\"")
                    .replace("\r", "\\r")
                    .replace("\n", "\\n")
                    .replace("\t", "\\t");
    }
}
