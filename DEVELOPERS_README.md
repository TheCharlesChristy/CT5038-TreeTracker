# README for developers

** PLEASE READ THIS WHOLE DOCUMENT **

Given that this project is based around scrum we want to spread the work out as much as possible so that everyone in the team gets
a chance to contribute and thus they get a fair chance at getting a high mark.

To help enforce this, we will follow best scrum practices to help our work be spread evenly, have higher quality and be more accountable.

# Development Environment (IMPORTANT)

## Mandatory: Use the Dev Container

**All team members MUST develop within the provided Dev Container.** This is non-negotiable for the following reasons:

1. **Consistency**: Everyone has identical PHP versions, extensions, and database configurations
2. **No "Works on My Machine"**: Eliminates environment-specific bugs
3. **Fair Assessment**: Ensures all code is tested in the same environment
4. **Quick Onboarding**: New team members are productive within minutes
5. **Professional Practice**: Mirrors real-world development workflows

## Setting Up Your Environment

### First Time Setup (15 minutes)

1. **Install Prerequisites** (if not already installed):
   - Docker Desktop ([download here](https://www.docker.com/products/docker-desktop))
   - Visual Studio Code ([download here](https://code.visualstudio.com/))
   - Dev Containers extension (install from VS Code extensions marketplace)

2. **Clone and Open**:
   ```bash
   git clone https://github.com/TheCharlesChristy/CT5038-DatabaseApp.git
   cd CT5038-DatabaseApp
   code .
   ```

3. **Start Dev Container**:
   - Click "Reopen in Container" when prompted
   - OR press `F1` → "Dev Containers: Reopen in Container"
   - Wait 5-10 minutes for initial build (subsequent starts are under 1 minute)

4. **Verify Setup**:
   ```bash
   php example-db-test.php
   ```
   Should show successful connections to all databases.

## Development Workflow

### Daily Workflow

1. **Start Day**: Open project in VS Code → Container starts automatically
2. **Develop**: Write code, test locally, commit changes
3. **End Day**: Close VS Code → Container stops automatically

### Working with Code

- **All PHP files** should be in `/var/www/html` (your workspace root)
- **Database files** (SQLite) should be in `/var/db/sqlite/`
- **Test your changes** by accessing http://localhost:8080
- **Use XDebug** for debugging (breakpoints work in VS Code)

### Database Development

You have three database options available:

#### SQLite (Recommended for Simple Features)
- **Use for**: Small features, prototyping, unit tests
- **Pros**: No server needed, file-based, fast setup
- **Connection**: `new PDO('sqlite:/var/db/sqlite/mydb.db')`

#### MySQL (Recommended for Production-Like Testing)
- **Use for**: Complex queries, transactions, team collaboration
- **Pros**: Industry standard, robust, ACID compliant
- **Connection**: `new PDO('mysql:host=mysql;dbname=devdb', 'devuser', 'devpassword')`
- **Access**: mysql CLI or Adminer at http://localhost:8081

#### PostgreSQL (Alternative to MySQL)
- **Use for**: Advanced features, JSON support, specific requirements
- **Pros**: Advanced features, strong standards compliance
- **Connection**: `new PDO('pgsql:host=postgres;dbname=devdb', 'postgres', 'postgres')`
- **Access**: psql CLI or Adminer at http://localhost:8081

### Database Management Tools

#### Adminer (Web GUI) - Recommended for Beginners
- URL: http://localhost:8081
- Visual interface for database management
- Supports all database types
- Perfect for browsing data, running queries, creating tables

#### SQLTools (VS Code Extension) - Pre-configured
- Click database icon in VS Code sidebar
- Pre-configured connections to MySQL and PostgreSQL
- Write and execute queries without leaving VS Code

#### Command Line (Advanced)
```bash
# MySQL
mysql -h mysql -u devuser -pdevpassword devdb

# PostgreSQL
psql -h postgres -U postgres devdb
```

## Testing Your Code

### Local Testing (Before Creating PR)

1. **Test in Browser**: http://localhost:8080/your-file.php
2. **Test Database Connections**: Run `php example-db-test.php`
3. **Check for PHP Errors**: View terminal output or browser errors
4. **Test All Endpoints**: Manually test all API endpoints you've modified

### Code Quality Checks

Before creating a pull request:

```bash
# Check PHP syntax
php -l your-file.php

# Run any tests (if we add them later)
php test-runner.php
```

## Common Development Tasks

### Installing PHP Dependencies

```bash
composer require vendor/package-name
```

### Accessing Container Shell

You're already in the container! The VS Code terminal IS the container terminal.

### Viewing Logs

```bash
# Apache error logs
tail -f /var/log/apache2/error.log

# Apache access logs
tail -f /var/log/apache2/access.log
```

### Restarting Apache

```bash
apachectl restart
```

## Troubleshooting

### "I Changed Code But Don't See Changes"

1. Hard refresh browser: `Ctrl+Shift+R` (or `Cmd+Shift+R`)
2. Check you're editing the right file
3. Restart Apache: `apachectl restart`
4. Check for PHP syntax errors in terminal

### "Database Connection Failed"

1. Ensure containers are running: `docker ps` (should see app, mysql, postgres)
2. Use correct hostname:
   - ✅ `mysql` (from PHP code)
   - ❌ `localhost` (wrong when connecting from PHP)
3. Check credentials match the ones in the table above
4. View database logs: `docker-compose -f .devcontainer/docker-compose.yml logs mysql`

### "Container Won't Start"

1. Ensure Docker Desktop is running
2. Check port conflicts (8080, 8081, 3306, 5432 must be free)
3. Rebuild container: `F1` → "Dev Containers: Rebuild Container"
4. As last resort, clean rebuild:
   ```bash
   docker-compose -f .devcontainer/docker-compose.yml down -v
   docker system prune -a
   ```
   Then reopen in container

### "Permission Denied" Errors

```bash
# Fix file permissions
sudo chown -R www-data:www-data /var/www/html
sudo chmod -R 755 /var/www/html
```

## Important Notes for Team Development

### DO:
- ✅ Always develop in the dev container
- ✅ Commit your changes regularly
- ✅ Test thoroughly before creating PR
- ✅ Use Adminer or SQLTools for database work
- ✅ Document your database schema changes
- ✅ Ask for help in team chat if stuck

### DON'T:
- ❌ Develop on your local machine (not in container)
- ❌ Modify the Dockerfile without team discussion
- ❌ Commit database files to Git
- ❌ Change database passwords (use the defaults)
- ❌ Install packages without updating documentation
- ❌ Push directly to main (always use branches and PRs)

## Getting Help

If you encounter issues:

1. Check this section of the documentation
2. Search the issue tracker for similar problems
3. Ask in the team Discord/Slack channel
4. Create an issue with:
   - What you were trying to do
   - What happened instead
   - Error messages (full text)
   - Steps to reproduce

## Development Strategy

For these reasons the `main` branch will be set to be protected so that no one can directly commit to `main`, this will help stop anyone from doing too much work.

Another key design decision is our epic, issue (user story) and branching strategy.

### Documentation

Documentation is a significant aspect of this project. Due to the potentially complex directory structure developers are encouraged to use
side by side documentation (i just coined that btw, because I forgot the actual term).

This is where documentation for a feature is written in the same folder as the source code for that feature.

Developers are also encouraged to use the markdown format of writing documentation as it is used widely in industry and when learnt is much faster to write.
Markdown also offers the benefit of being easy to combine together (through the use of automated scripts) into a wiki which may be considered in the future.

### Epics

Epics will be large complex pieces of work that require multiple seperate things to come together for it to be complete.
For example, adding user functionality to the database would be an epic. Though not a particularly difficult task, it is an epic because
it requires database tables for both user data and user passwords (which ideally should be stored in the same database but seperate tables).

Some out of the ordinary cases exist for epics when the piece of work is a single piece of work but it is so large that it must be an epic.
For example, if a single piece of work is estimated at taking 1 developer 2 weeks to complete, then that would be classified as an epic.

### Issues

Issues are individual pieces of work that are small in size and easy for a single developer to complete.

Ideally issues should only take a developer a single day to complete, however this is very flexible.

When solving an issue, I recommend writing comments under the issue at every milestone. That way evidence for work completed is easy to find.

### Branching strategy

When working in teams of software developers it is crucial that a common branching strategy is decided on.

Each branch created (with the exception of main) is solely responsible for a single developer. If another developer wishes to do work on someone else's branch then they must branch off of that branch.

Branch names must follow a standardised naming scheme to help developers easily identify the purpose of a branch. It is recommended that it follows this structure:

```
<prefix>-<issue name>
```

The issue name should be the issue that this branch is associated with. The prefix must be selected from this list depending on what the purpose of the branch is:

 - `feat`, if this branch is adding/removing a feature to the codebase.
 - `bug`, if the branch is fixing a bug in an existing feature.

### Pull requests

Upon completion of an issue in a branch developers must create a pull request, where they request that their code changes in their branch be applied to the `main` branch.

The review process is simple, due to the small team size a pull request can only be merged into main if **all** other developers on the team approve.

Developers reserve the right to request changes to a PR, all change requests must be resolved before a PR is merged.