package com.booknest;

import java.io.File;
import java.io.IOException;
import java.io.PrintWriter;
import java.sql.Connection;
import java.sql.PreparedStatement;
import java.sql.SQLException;
import javax.servlet.ServletException;
import javax.servlet.annotation.MultipartConfig;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;
import javax.servlet.http.HttpSession;
import javax.servlet.http.Part;

/*
 * AdminBookServlet.java
 * Handles all admin book operations: Upload, Edit, Delete
 * Use action parameter to choose operation:
 *   action=upload  -> add new book with PDF file
 *   action=edit    -> update existing book details
 *   action=delete  -> remove book from database
 */
@WebServlet("/AdminBookServlet")
@MultipartConfig(
    fileSizeThreshold = 1024 * 1024 * 2,  // 2MB
    maxFileSize       = 1024 * 1024 * 20, // 20MB
    maxRequestSize    = 1024 * 1024 * 50  // 50MB
)
public class AdminBookServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;

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

        // Read the action to decide what to do
        String actionType = request.getParameter("action");

        if ("upload".equals(actionType)) {
            handleUploadBook(request, out);
        } else if ("edit".equals(actionType)) {
            handleEditBook(request, out);
        } else if ("delete".equals(actionType)) {
            handleDeleteBook(request, out);
        } else {
            out.print("{\"status\":\"error\", \"message\":\"Invalid action. Use action=upload/edit/delete.\"}");
        }
    }

    // -------------------------------------------------------
    // Upload: Save PDF + cover image and insert into database
    // -------------------------------------------------------
    private void handleUploadBook(HttpServletRequest request, PrintWriter out)
            throws ServletException, IOException {

        String bookTitle      = request.getParameter("title");
        String bookAuthor     = request.getParameter("author");
        String bookCategory   = request.getParameter("category");
        String bookCoverClass = request.getParameter("coverClass");
        String bookRatingStr  = request.getParameter("rating");
        String bookPagesStr   = request.getParameter("pages");
        String bookDesc       = request.getParameter("description");

        if (bookTitle == null || bookAuthor == null || bookCategory == null || bookDesc == null) {
            out.print("{\"status\":\"error\", \"message\":\"Missing required book details.\"}");
            return;
        }

        // Prepare upload folder path
        String uploadBasePath = request.getServletContext().getRealPath("") + File.separator + "uploads";
        File uploadBaseDir = new File(uploadBasePath);
        if (!uploadBaseDir.exists()) {
            uploadBaseDir.mkdirs();
        }

        String pdfSavedPath   = "";
        String coverSavedPath = bookCoverClass != null ? bookCoverClass : "grad_blue";

        try {
            // Save PDF file
            Part pdfFilePart = request.getPart("pdfFile");
            if (pdfFilePart == null || pdfFilePart.getSize() == 0) {
                out.print("{\"status\":\"error\", \"message\":\"PDF file is required.\"}");
                return;
            }

            File pdfFolder = new File(uploadBasePath + File.separator + "Book_PDFs");
            if (!pdfFolder.exists()) pdfFolder.mkdirs();
            String savedPdfFileName = System.currentTimeMillis() + "_" + getOriginalFileName(pdfFilePart);
            pdfFilePart.write(pdfFolder.getAbsolutePath() + File.separator + savedPdfFileName);
            pdfSavedPath = "uploads/Book_PDFs/" + savedPdfFileName;

            // Save cover image if provided
            Part coverFilePart = request.getPart("coverFile");
            if (coverFilePart != null && coverFilePart.getSize() > 0) {
                File imgFolder = new File(uploadBasePath + File.separator + "Book_Images");
                if (!imgFolder.exists()) imgFolder.mkdirs();
                String savedCoverFileName = System.currentTimeMillis() + "_" + getOriginalFileName(coverFilePart);
                coverFilePart.write(imgFolder.getAbsolutePath() + File.separator + savedCoverFileName);
                coverSavedPath = "uploads/Book_Images/" + savedCoverFileName;
            }

            // Parse numeric fields
            double bookRating = 4.5;
            if (bookRatingStr != null && !bookRatingStr.isEmpty()) {
                bookRating = Double.parseDouble(bookRatingStr);
            }

            int bookPages = 100;
            if (bookPagesStr != null && !bookPagesStr.isEmpty()) {
                bookPages = Integer.parseInt(bookPagesStr);
            }

            // Insert book into PostgreSQL
            Connection conn = DatabaseConnection.getConnection();
            String sql = "INSERT INTO books (title, author, category, description, language, pages, pdf_path, cover_image, uploaded_at) " +
                         "VALUES (?, ?, ?, ?, 'English', ?, ?, ?, CURRENT_TIMESTAMP)";
            PreparedStatement stmt = conn.prepareStatement(sql);
            stmt.setString(1, bookTitle.trim());
            stmt.setString(2, bookAuthor.trim());
            stmt.setString(3, bookCategory.trim());
            stmt.setString(4, bookDesc.trim());
            stmt.setInt(5, bookPages);
            stmt.setString(6, pdfSavedPath);
            stmt.setString(7, coverSavedPath);
            stmt.executeUpdate();
            stmt.close();
            conn.close();

            out.print("{\"status\":\"success\", \"message\":\"eBook uploaded successfully!\"}");

        } catch (Exception e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Upload Error: " + escapeJson(e.getMessage()) + "\"}");
        }
    }

    // -------------------------------------------------------
    // Edit: Update book title, author, category, rating
    // -------------------------------------------------------
    private void handleEditBook(HttpServletRequest request, PrintWriter out) throws IOException {
        String bookIdStr      = request.getParameter("id");
        String updatedTitle   = request.getParameter("title");
        String updatedAuthor  = request.getParameter("author");
        String updatedCategory = request.getParameter("category");
        String updatedRatingStr = request.getParameter("rating");

        if (bookIdStr == null || updatedTitle == null || updatedAuthor == null ||
            updatedCategory == null || updatedRatingStr == null) {
            out.print("{\"status\":\"error\", \"message\":\"Missing parameters for edit.\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmt = null;

        try {
            int bookId = Integer.parseInt(bookIdStr);
            double updatedRating = Double.parseDouble(updatedRatingStr);

            conn = DatabaseConnection.getConnection();
            String sql = "UPDATE books SET title = ?, author = ?, category = ?, rating = ? WHERE id = ?";
            stmt = conn.prepareStatement(sql);
            stmt.setString(1, updatedTitle.trim());
            stmt.setString(2, updatedAuthor.trim());
            stmt.setString(3, updatedCategory.trim());
            stmt.setDouble(4, updatedRating);
            stmt.setInt(5, bookId);

            int rowsUpdated = stmt.executeUpdate();
            if (rowsUpdated > 0) {
                out.print("{\"status\":\"success\", \"message\":\"Book updated successfully.\"}");
            } else {
                out.print("{\"status\":\"error\", \"message\":\"Book not found.\"}");
            }

        } catch (NumberFormatException e) {
            out.print("{\"status\":\"error\", \"message\":\"Invalid ID or Rating format.\"}");
        } catch (SQLException e) {
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database Error: " + escapeJson(e.getMessage()) + "\"}");
        } finally {
            try {
                if (stmt != null) stmt.close();
                if (conn != null) conn.close();
            } catch (SQLException ex) { ex.printStackTrace(); }
        }
    }

    // -------------------------------------------------------
    // Delete: Remove book + its history + favorites (cascaded)
    // -------------------------------------------------------
    private void handleDeleteBook(HttpServletRequest request, PrintWriter out) throws IOException {
        String bookIdStr = request.getParameter("id");

        if (bookIdStr == null || bookIdStr.trim().isEmpty()) {
            out.print("{\"status\":\"error\", \"message\":\"Book ID is required.\"}");
            return;
        }

        Connection conn = null;
        PreparedStatement stmtDeleteFavorites = null;
        PreparedStatement stmtDeleteHistory   = null;
        PreparedStatement stmtDeleteBook      = null;

        try {
            int bookId = Integer.parseInt(bookIdStr);
            conn = DatabaseConnection.getConnection();
            conn.setAutoCommit(false); // Begin transaction

            // Delete favorites first (foreign key)
            stmtDeleteFavorites = conn.prepareStatement("DELETE FROM favorites WHERE book_id = ?");
            stmtDeleteFavorites.setInt(1, bookId);
            stmtDeleteFavorites.executeUpdate();

            // Delete reading history (foreign key)
            stmtDeleteHistory = conn.prepareStatement("DELETE FROM reading_history WHERE book_id = ?");
            stmtDeleteHistory.setInt(1, bookId);
            stmtDeleteHistory.executeUpdate();

            // Delete the book itself
            stmtDeleteBook = conn.prepareStatement("DELETE FROM books WHERE id = ?");
            stmtDeleteBook.setInt(1, bookId);
            int rowsDeleted = stmtDeleteBook.executeUpdate();

            conn.commit(); // Commit transaction

            if (rowsDeleted > 0) {
                out.print("{\"status\":\"success\", \"message\":\"Book deleted successfully.\"}");
            } else {
                out.print("{\"status\":\"error\", \"message\":\"Book not found.\"}");
            }

        } catch (NumberFormatException e) {
            out.print("{\"status\":\"error\", \"message\":\"Invalid Book ID.\"}");
        } catch (SQLException e) {
            if (conn != null) {
                try { conn.rollback(); } catch (SQLException ex) { ex.printStackTrace(); }
            }
            e.printStackTrace();
            out.print("{\"status\":\"error\", \"message\":\"Database Error: " + escapeJson(e.getMessage()) + "\"}");
        } finally {
            try {
                if (stmtDeleteFavorites != null) stmtDeleteFavorites.close();
                if (stmtDeleteHistory != null) stmtDeleteHistory.close();
                if (stmtDeleteBook != null) stmtDeleteBook.close();
                if (conn != null) conn.close();
            } catch (SQLException ex) { ex.printStackTrace(); }
        }
    }

    // Helper: Extract original filename from multipart content-disposition header
    private String getOriginalFileName(Part part) {
        String contentDisp = part.getHeader("content-disposition");
        String originalFileName = "";
        String[] headerTokens = contentDisp.split(";");
        for (String token : headerTokens) {
            if (token.trim().startsWith("filename")) {
                originalFileName = token.substring(token.indexOf("=") + 2, token.length() - 1);
                break;
            }
        }
        return new File(originalFileName).getName();
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
