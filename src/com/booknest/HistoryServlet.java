package com.booknest;

import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.text.SimpleDateFormat;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;

// HistoryServlet - GET returns reading history, POST adds/updates or clears reading history
@WebServlet("/HistoryServlet")
public class HistoryServlet extends HttpServlet {
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

    // GET: Return all books this user has opened, most recent first
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

            // Join reading_history with books to get full book details
            String sql = "SELECT h.current_page, h.last_read, b.id as book_id, b.title, b.author, " +
                         "b.category, b.pages, b.cover_image " +
                         "FROM reading_history h " +
                         "JOIN books b ON h.book_id = b.id " +
                         "WHERE h.user_id = ? " +
                         "ORDER BY h.last_read DESC";

            stmt = conn.prepareStatement(sql);
            stmt.setInt(1, currentUserId);
            rs = stmt.executeQuery();

            StringBuilder jsonOutput = new StringBuilder();
            jsonOutput.append("[");

            boolean isFirst = true;
            SimpleDateFormat dateFormatter = new SimpleDateFormat("yyyy-MM-dd HH:mm:ss");

            while (rs.next()) {
                if (!isFirst) {
                    jsonOutput.append(",");
                }

                String bookTitle = rs.getString("title");
                String bookAuthor = rs.getString("author");
                String bookCategory = rs.getString("category");
                int totalBookPages = rs.getInt("pages");
                int currentPageNumber = rs.getInt("current_page");
                String bookCoverImage = rs.getString("cover_image");
                String lastReadDate = dateFormatter.format(rs.getTimestamp("last_read"));

                // Calculate reading progress as a percentage
                int readingProgress = 0;
                if (totalBookPages > 0) {
                    readingProgress = (int) Math.round(((double) currentPageNumber / totalBookPages) * 100);
                    if (readingProgress > 100) readingProgress = 100;
                    if (readingProgress < 0) readingProgress = 0;
                }

                // Two-letter initials for the book cover display
                String bookInitials = "";
                if (bookTitle != null && bookTitle.trim().length() > 0) {
                    bookInitials = bookTitle.substring(0, Math.min(2, bookTitle.length())).toUpperCase();
                }

                jsonOutput.append("{");
                jsonOutput.append("\"bookId\":").append(rs.getInt("book_id")).append(",");
                jsonOutput.append("\"title\":\"").append(escapeJson(bookTitle)).append("\",");
                jsonOutput.append("\"author\":\"").append(escapeJson(bookAuthor)).append("\",");
                jsonOutput.append("\"category\":\"").append(escapeJson(bookCategory)).append("\",");
                jsonOutput.append("\"progress\":").append(readingProgress).append(",");
                jsonOutput.append("\"currentPage\":").append(currentPageNumber).append(",");
                jsonOutput.append("\"totalPages\":").append(totalBookPages).append(",");
                jsonOutput.append("\"lastAccess\":\"").append(escapeJson(lastReadDate)).append("\",");
                jsonOutput.append("\"coverClass\":\"").append(escapeJson(bookCoverImage)).append("\",");
                jsonOutput.append("\"initials\":\"").append(escapeJson(bookInitials)).append("\"");
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

    // POST: Add/update reading history entry, or clear all history
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

        String actionParam = request.getParameter("action");

        Connection conn = null;
        PreparedStatement stmt = null;

        try {
            conn = DatabaseConnection.getConnection();

            if ("clear".equals(actionParam)) {
                // Delete all reading history for this user
                String sql = "DELETE FROM reading_history WHERE user_id = ?";
                stmt = conn.prepareStatement(sql);
                stmt.setInt(1, currentUserId);
                stmt.executeUpdate();
                out.print("{\"status\":\"success\", \"message\":\"History cleared.\"}");

            } else {
                // Add or update a reading history record
                String requestedBookTitle = request.getParameter("bookTitle");
                String requestedPageParam = request.getParameter("page");

                if (requestedBookTitle == null || requestedBookTitle.trim().isEmpty()) {
                    out.print("{\"status\":\"error\", \"message\":\"Book title is required.\"}");
                    return;
                }

                // Step 1: Find the book ID using the title
                PreparedStatement stmtFindBook = conn.prepareStatement("SELECT id, pages FROM books WHERE LOWER(title) = ?");
                stmtFindBook.setString(1, requestedBookTitle.trim().toLowerCase());
                ResultSet rsBook = stmtFindBook.executeQuery();

                int foundBookId = -1;
                int foundTotalPages = 0;

                if (rsBook.next()) {
                    foundBookId = rsBook.getInt("id");
                    foundTotalPages = rsBook.getInt("pages");
                }
                rsBook.close();
                stmtFindBook.close();

                if (foundBookId == -1) {
                    out.print("{\"status\":\"error\", \"message\":\"Book not found.\"}");
                    return;
                }

                // Step 2: Parse and validate page number
                int pageNumber = 1;
                if (requestedPageParam != null && !requestedPageParam.isEmpty()) {
                    try {
                        pageNumber = Integer.parseInt(requestedPageParam);
                        if (foundTotalPages > 0 && pageNumber > foundTotalPages) {
                            pageNumber = foundTotalPages;
                        }
                        if (pageNumber < 1) {
                            pageNumber = 1;
                        }
                    } catch (NumberFormatException nfe) {
                        pageNumber = 1;
                    }
                }

                // Step 3: Check if a history record already exists for this user + book
                PreparedStatement stmtCheck = conn.prepareStatement(
                    "SELECT id FROM reading_history WHERE user_id = ? AND book_id = ?");
                stmtCheck.setInt(1, currentUserId);
                stmtCheck.setInt(2, foundBookId);
                ResultSet rsCheck = stmtCheck.executeQuery();

                boolean historyRecordExists = rsCheck.next();
                rsCheck.close();
                stmtCheck.close();

                if (historyRecordExists) {
                    // Update the existing record
                    if (requestedPageParam != null) {
                        String updateSql = "UPDATE reading_history SET current_page = ?, last_read = CURRENT_TIMESTAMP WHERE user_id = ? AND book_id = ?";
                        stmt = conn.prepareStatement(updateSql);
                        stmt.setInt(1, pageNumber);
                        stmt.setInt(2, currentUserId);
                        stmt.setInt(3, foundBookId);
                    } else {
                        String updateSql = "UPDATE reading_history SET last_read = CURRENT_TIMESTAMP WHERE user_id = ? AND book_id = ?";
                        stmt = conn.prepareStatement(updateSql);
                        stmt.setInt(1, currentUserId);
                        stmt.setInt(2, foundBookId);
                    }
                    stmt.executeUpdate();
                } else {
                    // Insert a new history record
                    String insertSql = "INSERT INTO reading_history (user_id, book_id, current_page, last_read) VALUES (?, ?, ?, CURRENT_TIMESTAMP)";
                    stmt = conn.prepareStatement(insertSql);
                    stmt.setInt(1, currentUserId);
                    stmt.setInt(2, foundBookId);
                    stmt.setInt(3, pageNumber);
                    stmt.executeUpdate();
                }

                out.print("{\"status\":\"success\", \"message\":\"History updated.\", \"page\":" + pageNumber + "}");
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
