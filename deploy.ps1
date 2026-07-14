# deploy.ps1
# Automates Java Web App deployment to Apache Tomcat 9.0

$env:JAVA_HOME="C:\Program Files\Java\jdk-17"
$env:CATALINA_HOME="D:\TECH_Training_10DAYS\apache-tomcat-9.0.120"
$TomcatWebapps = "D:\TECH_Training_10DAYS\apache-tomcat-9.0.120\webapps\BookNest"

Write-Host "1. Compiling Java Servlet source files..." -ForegroundColor Cyan
if (!(Test-Path "target/classes")) {
    New-Item -ItemType Directory -Path "target/classes" -Force
}

javac -d target/classes -cp "C:\Users\dilee\.m2\repository\org\postgresql\postgresql\42.6.0\postgresql-42.6.0.jar;C:\Users\dilee\.m2\repository\javax\servlet\javax.servlet-api\4.0.1\javax.servlet-api-4.0.1.jar" src/com/booknest/*.java

if ($LASTEXITCODE -ne 0) {
    Write-Error "Java compilation failed!"
    exit 1
}
Write-Host "Compilation successful!" -ForegroundColor Green

Write-Host "2. Preparing Tomcat deployment directory..." -ForegroundColor Cyan

# --- Backup uploaded files before wiping ---
$BackupUploads = "$env:TEMP\BookNest_uploads_backup"
if (Test-Path "$TomcatWebapps\uploads") {
    Write-Host "   Backing up uploaded files..." -ForegroundColor Yellow
    if (Test-Path $BackupUploads) { Remove-Item -Recurse -Force $BackupUploads }
    Copy-Item -Path "$TomcatWebapps\uploads" -Destination $BackupUploads -Recurse -Force
}

if (Test-Path $TomcatWebapps) {
    Remove-Item -Recurse -Force $TomcatWebapps
}
New-Item -ItemType Directory -Path "$TomcatWebapps\WEB-INF\classes" -Force
New-Item -ItemType Directory -Path "$TomcatWebapps\WEB-INF\lib" -Force

Write-Host "3. Copying static web assets..." -ForegroundColor Cyan
Copy-Item -Path "index.html" -Destination "$TomcatWebapps\" -Force
Copy-Item -Path "css" -Destination "$TomcatWebapps\" -Recurse -Force
Copy-Item -Path "js" -Destination "$TomcatWebapps\" -Recurse -Force
Copy-Item -Path "pages" -Destination "$TomcatWebapps\" -Recurse -Force
Copy-Item -Path "images" -Destination "$TomcatWebapps\" -Recurse -Force
if (Test-Path "uploads") {
    Copy-Item -Path "uploads" -Destination "$TomcatWebapps\" -Recurse -Force
} else {
    New-Item -ItemType Directory -Path "$TomcatWebapps\uploads" -Force
}

# --- Restore previously uploaded files (uploaded via admin panel) ---
if (Test-Path $BackupUploads) {
    Write-Host "   Restoring uploaded files from backup..." -ForegroundColor Yellow
    Copy-Item -Path "$BackupUploads\*" -Destination "$TomcatWebapps\uploads\" -Recurse -Force
}

Write-Host "4. Copying compiled Java classes..." -ForegroundColor Cyan
Copy-Item -Path "target\classes\*" -Destination "$TomcatWebapps\WEB-INF\classes\" -Recurse -Force

Write-Host "5. Copying database driver JAR..." -ForegroundColor Cyan
Copy-Item -Path "C:\Users\dilee\.m2\repository\org\postgresql\postgresql\42.6.0\postgresql-42.6.0.jar" -Destination "$TomcatWebapps\WEB-INF\lib\" -Force

Write-Host "6. Restarting Tomcat Server..." -ForegroundColor Cyan
# Stop Tomcat if running
& "$env:CATALINA_HOME\bin\shutdown.bat" 2>&1 | Out-Null
Start-Sleep -Seconds 2

# Start Tomcat
& "$env:CATALINA_HOME\bin\startup.bat"

Write-Host "Deployment completed successfully! Accessible at: http://localhost:8080/BookNest/" -ForegroundColor Green
