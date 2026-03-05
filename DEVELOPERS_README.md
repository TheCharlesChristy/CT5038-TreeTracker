# README for developers

** PLEASE READ THIS WHOLE DOCUMENT **

Given that this project is based around scrum we want to spread the work out as much as possible so that everyone in the team gets
a chance to contribute and thus they get a fair chance at getting a high mark.

To help enforce this, we will follow best scrum practices to help our work be spread evenly, have higher quality and be more accountable.

# Development Environment (IMPORTANT)

## Setting Up Your Environment

### Prerequisites

1. **Install Docker Desktop** ([download here](https://www.docker.com/products/docker-desktop))
2. **Install Visual Studio Code** ([download here](https://code.visualstudio.com/))
3. **Install Python** (for pre-commit)

### First Time Setup

1. **Clone the repo**:
   ```bash
   git clone https://github.com/TheCharlesChristy/CT5038-TreeTracker.git
   cd CT5038-TreeTracker
   ```

2. **Install Pre-commit Hooks** (Important!):
   We use `pre-commit` to ensure code quality before every commit.
   ```bash
   # From the repo root
   pip install pre-commit

   # Install the git hooks
   pre-commit install
   ```
   Now, every time you run `git commit`, the linters will run automatically.

3. **Start the development server**:
   ```bash
   # From the TreeGuardiansExpo directory
   npm start
   ```
   Then press `a` for Android, `i` for iOS, or `w` for web.

3. **Start Developing**: Open the project in VS Code and begin coding.

## Development Workflow

### Daily Workflow

1. **Develop**: Write code, test locally, commit changes
2. **Pre-commit hooks**: Linting runs automatically on `git commit`
3. **CI Checks**: GitHub Actions workflows enforce lint checks on every push/PR

### Working with Code

- **Mobile App**: The Expo/React Native project lives in `TreeGuardiansExpo/`
- **Database Schema**: See `schema.sql` for the MySQL schema
- **Linting**: Run `pre-commit run --all-files` to check your code manually

### Database Development

The project uses MySQL. Apply the schema with:

```bash
mysql -u <user> -p<password> <database> < schema.sql
```

## Testing Your Code

### Local Testing (Before Creating PR)

1. **Lint checks**: Run `pre-commit run --all-files` to run all linters locally
2. **JS/Expo**: `cd TreeGuardiansExpo && npm run lint`
3. **SQL**: `sqlfluff lint schema.sql`

### Code Quality Checks

Before creating a pull request, the pre-commit hook will automatically run linters. You can also run them manually:

```bash
pre-commit run --all-files
```

## Common Development Tasks

### Installing JS Dependencies

```bash
cd TreeGuardiansExpo
npm install
```

## Troubleshooting

### "Pre-commit Hooks Not Running"

1. Ensure pre-commit is installed: `pip install pre-commit`
2. Install hooks: `pre-commit install`
3. Run manually: `pre-commit run --all-files`

### "Docker Not Found"

1. Ensure Docker Desktop is running
2. Verify with `docker --version`

## Important Notes for Team Development

### DO:
- ✅ Install pre-commit hooks before your first commit
- ✅ Commit your changes regularly
- ✅ Test thoroughly before creating PR
- ✅ Document your database schema changes
- ✅ Ask for help in team chat if stuck

### DON'T:
- ❌ Skip linting (pre-commit hooks enforce this automatically)
- ❌ Commit database files to Git
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