# CT5038-DatabaseApp
Database Application for University Module CT5038

The Database Application is a PHP application designed to interface with existing web apps over API, where web apps can query the database through API calls.

## Setting up you dev environment

This project uses VS Code Dev Containers to provide a standardized development environment across the entire team. This ensures everyone has the same PHP version, database servers, and tools configured identically.

### Prerequisites

1. **Install Docker Desktop**
   - [Windows/Mac](https://www.docker.com/products/docker-desktop)
   - Linux: Install Docker Engine and Docker Compose

2. **Install Visual Studio Code**
   - Download from [code.visualstudio.com](https://code.visualstudio.com/)

3. **Install Dev Containers Extension**
   - Open VS Code
   - Press `Ctrl+Shift+X` (or `Cmd+Shift+X` on Mac)
   - Search for "Dev Containers" by Microsoft
   - Click Install

### Quick Start

1. **Clone the repository**
   ```bash
   git clone https://github.com/TheCharlesChristy/CT5038-DatabaseApp.git
   cd CT5038-DatabaseApp
   ```

2. **Open in VS Code**
   ```bash
   code .
   ```

3. **Start the Dev Container**
   - VS Code will prompt "Folder contains a Dev Container configuration file. Reopen folder to develop in a container"
   - Click **"Reopen in Container"**
   - Alternatively, press `F1` and select **"Dev Containers: Reopen in Container"**

4. **Wait for the container to build**
   - First time setup takes 5-10 minutes as it downloads and builds all services
   - Subsequent starts are much faster (under 1 minute)

5. **Verify the setup**
   ```bash
   php example-db-test.php
   ```
   You should see successful connections to MySQL, PostgreSQL, and SQLite.

### What's Included

The development environment includes:

- **PHP 8.3** with Apache web server
- **MySQL 8.0** database server
- **PostgreSQL 16** database server
- **SQLite** support (lightweight database)
- **Composer** (PHP dependency manager)
- **XDebug** (debugging tool configured for VS Code)
- **Adminer** (web-based database management GUI)

### Accessing Services

Once the dev container is running:

| Service | URL/Connection | Credentials |
|---------|----------------|-------------|
| Web Server | http://localhost:8080 | N/A |
| Adminer (DB GUI) | http://localhost:8081 | See below |
| MySQL | `localhost:3306` | user: `devuser`, password: `devpassword`, db: `devdb` |
| PostgreSQL | `localhost:5432` | user: `postgres`, password: `postgres`, db: `devdb` |
| SQLite | File: `/var/db/sqlite/*.db` | N/A |

### Working with Databases

#### Using Adminer (Recommended for Beginners)

1. Open http://localhost:8081 in your browser
2. Select your database system (MySQL or PostgreSQL)
3. Enter the credentials from the table above
4. Click "Login"

You can now browse tables, run queries, and manage your database through the web interface.

#### Using VS Code SQLTools Extension

The dev container automatically configures SQLTools with connections to both MySQL and PostgreSQL:

1. Click the database icon in the VS Code sidebar
2. Expand "MySQL Dev" or "PostgreSQL Dev"
3. Write and execute SQL queries directly in VS Code

#### Connecting from PHP Code

```php
// MySQL
$mysql = new PDO('mysql:host=mysql;dbname=devdb', 'devuser', 'devpassword');

// PostgreSQL
$postgres = new PDO('pgsql:host=postgres;dbname=devdb', 'postgres', 'postgres');

// SQLite
$sqlite = new PDO('sqlite:/var/db/sqlite/mydb.db');
```

### Debugging with XDebug

1. Set a breakpoint in your PHP file (click left of line number)
2. Press `F5` or go to Run → Start Debugging
3. Select "Listen for XDebug"
4. Access your PHP file through the browser
5. VS Code will pause at your breakpoint

### Troubleshooting

**Container won't start:**
- Ensure Docker Desktop is running
- Check no other services are using ports 8080, 8081, 3306, 5432
- Try "Dev Containers: Rebuild Container" from the command palette (`F1`)

**Can't connect to database:**
- Verify containers are running: Open terminal and run `docker ps`
- Check container logs: `docker-compose logs mysql` or `docker-compose logs postgres`
- Ensure you're using the correct hostname (`mysql` or `postgres`, not `localhost`) from within PHP

**Permission errors:**
- The container runs as `www-data` user
- File permissions are automatically managed by Docker

### Stopping the Environment

When you close VS Code or select "Reopen Folder Locally", the containers continue running in the background. To stop them:

```bash
docker-compose -f .devcontainer/docker-compose.yml down
```

Or through Docker Desktop → Containers → Stop

## API structure

API endpoint URL's will follow best practices where they are indexed as:
```
<collection>/<resource>:<specific_query_information(optional)>
```

For example to get a user with a specific id:
```
users/42
```

Using path based lookups for API endpoints forces developers to follow best practices in both API calling/handling and database design.