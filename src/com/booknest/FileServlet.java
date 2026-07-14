package com.booknest;

import java.io.File;
import java.io.FileInputStream;
import java.io.IOException;
import java.io.OutputStream;
import java.net.URLDecoder;
import javax.servlet.ServletException;
import javax.servlet.annotation.WebServlet;
import javax.servlet.http.HttpServlet;
import javax.servlet.http.HttpServletRequest;
import javax.servlet.http.HttpServletResponse;

/**
 * FileServlet.java
 * Intercepts requests for "/uploads/*" and serves them directly from
 * the persistent local filesystem. This prevents files (such as book cover images
 * and PDFs) from being deleted when the server is restarted or redeployed.
 */
@WebServlet("/uploads/*")
public class FileServlet extends HttpServlet {
    private static final long serialVersionUID = 1L;
    
    // Persistent absolute directory where uploaded files are stored
    private static final String PERSISTENT_BASE_PATH = "D:\\TECH_Training_10DAYS\\BookNest_copy_deletingUnwanted\\uploads";

    protected void doGet(HttpServletRequest request, HttpServletResponse response)
            throws ServletException, IOException {
        
        // Retrieve the requested file path relative to /uploads
        String pathInfo = request.getPathInfo();
        if (pathInfo == null || pathInfo.equals("/")) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Decode the path to support spaces and special characters in filenames
        String decodedPathInfo = URLDecoder.decode(pathInfo, "UTF-8");

        // Construct absolute file path in persistent directory
        File file = new File(PERSISTENT_BASE_PATH, decodedPathInfo);

        // Fallback to servlet context deployment directory if not found in persistent location
        if (!file.exists()) {
            String servletContextPath = request.getServletContext().getRealPath("/uploads" + decodedPathInfo);
            if (servletContextPath != null) {
                file = new File(servletContextPath);
            }
        }

        // If file still doesn't exist or is a directory, return 404
        if (!file.exists() || file.isDirectory()) {
            response.sendError(HttpServletResponse.SC_NOT_FOUND);
            return;
        }

        // Detect Mime Type
        String mimeType = request.getServletContext().getMimeType(file.getName());
        if (mimeType == null) {
            mimeType = "application/octet-stream";
        }
        
        response.setContentType(mimeType);
        response.setContentLength((int) file.length());
        
        // Add cache control to speed up rendering
        response.setHeader("Cache-Control", "public, max-age=86400"); // 1 day cache

        // Write the file contents to the response output stream
        try (FileInputStream in = new FileInputStream(file);
             OutputStream out = response.getOutputStream()) {
            byte[] buffer = new byte[8192];
            int bytesRead;
            while ((bytesRead = in.read(buffer)) != -1) {
                out.write(buffer, 0, bytesRead);
            }
        }
    }
}
