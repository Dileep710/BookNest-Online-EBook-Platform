// ==================================================
// BookNest - Global API CORS/Port Path Patch Utility
// Dynamically intercepts fetch calls for Live Server
// ==================================================

(function() {
    const originalFetch = window.fetch;
    window.fetch = function(input, init) {
        let targetUrl = input;
        
        if (typeof input === 'string') {
            // Check if the URL points to a Servlet endpoint
            if (input.includes('Servlet')) {
                const userId = localStorage.getItem('userId');
                
                // If the application is accessed via a non-Tomcat port (like VS Code Live Server on port 5501)
                if (window.location.port !== '8080') {
                    let path = input;
                    // Strip relative directories if any
                    if (path.startsWith('../')) {
                        path = path.substring(3);
                    } else if (path.startsWith('./')) {
                        path = path.substring(2);
                    }
                    
                    targetUrl = 'http://localhost:8080/BookNest/' + path;
                    console.log(`[API-Patch] Rerouting fetch request to Tomcat: ${targetUrl}`);
                }
                
                // Inject userId parameter if user is logged in (helps bypass CORS/SameSite session blocking)
                if (userId) {
                    const method = (init && init.method) ? init.method.toUpperCase() : 'GET';
                    if (method === 'GET' || method === 'DELETE') {
                        const separator = targetUrl.includes('?') ? '&' : '?';
                        targetUrl = targetUrl + separator + 'userId=' + encodeURIComponent(userId);
                    } else if (method === 'POST' || method === 'PUT') {
                        if (init) {
                            if (init.body && typeof init.body === 'string') {
                                if (!init.body.includes('userId=')) {
                                    init.body = init.body + '&userId=' + encodeURIComponent(userId);
                                }
                            } else if (!init.body) {
                                init.body = 'userId=' + encodeURIComponent(userId);
                                init.headers = init.headers || {};
                                if (!init.headers['Content-Type']) {
                                    init.headers['Content-Type'] = 'application/x-www-form-urlencoded';
                                }
                            }
                        }
                    }
                }
            }
        }
        
        // Ensure credentials (cookies/session IDs) are sent when accessing Tomcat cross-origin
        if (window.location.port !== '8080') {
            if (!init) {
                init = {};
            }
            init.credentials = 'include';
        }
        
        return originalFetch(targetUrl, init);
    };
    console.log("[API-Patch] Active: Auto-intercepting cross-port fetch requests.");
})();
