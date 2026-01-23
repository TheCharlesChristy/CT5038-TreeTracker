# Dev Container Configuration

This directory contains two dev container configurations for PHP database development:

## Option 1: Simple Container (devcontainer.json)
Uses just the Dockerfile with SQLite support built-in. Best for:
- Quick setup and testing
- SQLite-only projects
- Lightweight development

**To use:** Rename `devcontainer.json` to be the active configuration or select it when opening in container.

## Option 2: Full Stack with Docker Compose (devcontainer-compose.json)
Includes MySQL, PostgreSQL, and Adminer (database GUI). Best for:
- Multi-database development
- Testing against real database servers
- Team collaboration with standardized database environments

**To use:** Rename `devcontainer-compose.json` to `devcontainer.json` or select it when opening in container.

## Database Access Information

### MySQL
- **Host:** mysql (or localhost:3306 from host machine)
- **Database:** devdb
- **User:** devuser
- **Password:** devpassword
- **Root Password:** rootpassword

### PostgreSQL
- **Host:** postgres (or localhost:5432 from host machine)
- **Database:** devdb
- **User:** postgres
- **Password:** postgres

### SQLite
- Files can be stored in `/var/db/sqlite/` directory
- Or anywhere in your project with proper permissions

### Adminer (Database GUI)
- **URL:** http://localhost:8081
- Web-based database management tool supporting all database types

## PHP Configuration

### Installed Extensions
- PDO (MySQL, PostgreSQL, SQLite)
- MySQLi
- PostgreSQL
- mbstring, gd, zip, opcache
- XDebug (for debugging)

### XDebug Configuration
- Port: 9003
- Mode: develop, debug, coverage
- Configured for VS Code debugging

### PHP Settings
- Memory Limit: 512M
- Upload Max Filesize: 50M
- Post Max Size: 50M
- Max Execution Time: 300s
- Display Errors: On
- Error Reporting: E_ALL

## VS Code Extensions Included

- **PHP Intelephense** - PHP code intelligence
- **PHP Debug** - XDebug integration
- **SQLTools** - Database management and queries
- **SQLTools MySQL Driver** - MySQL support
- **SQLTools PostgreSQL Driver** - PostgreSQL support
- **SQLTools SQLite Driver** - SQLite support
- **Docker** - Docker container management
- **EditorConfig** - Maintain consistent coding styles

## Getting Started

1. Open this folder in VS Code
2. When prompted, click "Reopen in Container" (or press F1 and select "Dev Containers: Reopen in Container")
3. Select your preferred configuration:
   - Simple: Use `devcontainer.json`
   - Full Stack: Use `devcontainer-compose.json`
4. Wait for the container to build and start
5. Your development environment is ready!

## Testing Database Connections

Create a `test-db.php` file in your project root:

```php
<?php
// Test MySQL
try {
    $mysql = new PDO('mysql:host=mysql;dbname=devdb', 'devuser', 'devpassword');
    echo "MySQL: Connected successfully\n";
} catch(PDOException $e) {
    echo "MySQL: Connection failed - " . $e->getMessage() . "\n";
}

// Test PostgreSQL
try {
    $postgres = new PDO('pgsql:host=postgres;dbname=devdb', 'postgres', 'postgres');
    echo "PostgreSQL: Connected successfully\n";
} catch(PDOException $e) {
    echo "PostgreSQL: Connection failed - " . $e->getMessage() . "\n";
}

// Test SQLite
try {
    $sqlite = new PDO('sqlite:/var/db/sqlite/test.db');
    echo "SQLite: Connected successfully\n";
} catch(PDOException $e) {
    echo "SQLite: Connection failed - " . $e->getMessage() . "\n";
}
?>
```

Run: `php test-db.php`

## Composer

Composer is pre-installed. Use it to manage PHP dependencies:
```bash
composer init
composer require vendor/package
composer install
```

## Apache Configuration

- Document root: `/var/www/html`
- Rewrite module: Enabled
- Headers module: Enabled
- Default port: 80 (mapped to 8080 on host)

## Troubleshooting

### Permission Issues
```bash
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

### Database Connection Issues
- Ensure containers are running: `docker-compose ps`
- Check container logs: `docker-compose logs mysql` or `docker-compose logs postgres`
- Verify network connectivity: `ping mysql` or `ping postgres`

### XDebug Not Working
- Check XDebug is enabled: `php -v` (should show XDebug)
- Verify configuration: `php -i | grep xdebug`
- Check VS Code launch.json is configured correctly
