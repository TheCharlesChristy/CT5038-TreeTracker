# README for developers

** PLEASE READ THIS WHOLE DOCUMENT **

Given that this project is based around scrum we want to spread the work out as much as possible so that everyone in the team gets
a chance to contribute and thus they get a fair chance at getting a high mark.

To help enforce this, we will follow best scrum practices to help our work be spread evenly, have higher quality and be more accountable.

# Development Environment (IMPORTANT)

## Setting Up Your Environment

### Prerequisites

Install the following tools before getting started:

- **Node.js** (LTS version recommended — [download here](https://nodejs.org/))
- **npm** (comes with Node.js)
- **Expo CLI**: `npm install -g expo-cli`
- **Docker Desktop** ([download here](https://www.docker.com/products/docker-desktop)) — required for pre-commit hooks
- **Python 3** and **pip** — required for pre-commit
- A mobile device or emulator:
  - **Android**: Android Studio with an emulator, or a physical device with Expo Go installed
  - **iOS**: Xcode simulator (macOS only), or a physical device with Expo Go installed

### First Time Setup

1. **Clone and Install**:
   ```bash
   git clone https://github.com/TheCharlesChristy/CT5038-TreeTracker.git
   cd CT5038-TreeTracker/TreeGuardiansExpo
   npm install
   ```

2. **Install Pre-commit Hooks** (Important!):
   We use `pre-commit` to ensure code quality before every commit. The hooks run inside Docker, so Docker Desktop must be running.
   ```bash
   # From the repo root
   pip install pre-commit
   pre-commit install
   ```
   Now, every time you run `git commit`, the linters will run automatically.

3. **Start the development server**:
   ```bash
   # From the TreeGuardiansExpo directory
   npm start
   ```
   Then press `a` for Android, `i` for iOS, or `w` for web.

## Development Workflow

### Daily Workflow

1. **Start Day**: Open a terminal in `TreeGuardiansExpo/` and run `npm start`
2. **Develop**: Write code, test on device/simulator, commit changes
3. **End Day**: Stop the dev server with `Ctrl+C`

### Working with Code

- **App screens** live in `TreeGuardiansExpo/app/`
- **Reusable components** live in `TreeGuardiansExpo/components/`
- **Styles and theme tokens** live in `TreeGuardiansExpo/styles/`
- **Database schema** is defined in `schema.sql` at the repo root

## Testing Your Code

### Local Testing (Before Creating PR)

1. **Run the app** on a device or emulator and manually test your changes
2. **Lint your code** before committing:
   ```bash
   # From the TreeGuardiansExpo directory
   npm run lint
   ```

### Code Quality Checks

The pre-commit hooks run automatically on `git commit`. To run them manually:

```bash
# From the repo root
pre-commit run --all-files
```

## Common Development Tasks

### Installing JavaScript Dependencies

```bash
# From the TreeGuardiansExpo directory
npm install <package-name>
```

## Troubleshooting

### "Metro bundler not starting"

1. Ensure you are in the `TreeGuardiansExpo/` directory
2. Delete `node_modules` and reinstall: `rm -rf node_modules && npm install`
3. Clear the Metro cache: `npx expo start --clear`

### "Pre-commit hooks failing"

1. Ensure Docker Desktop is running (hooks run inside a Docker container)
2. Ensure `pre-commit` is installed: `pip install pre-commit`
3. Run hooks manually for more detail: `pre-commit run --all-files`

## Important Notes for Team Development

### DO:
- ✅ Develop locally using Expo
- ✅ Commit your changes regularly
- ✅ Test thoroughly before creating PR
- ✅ Run linting before pushing (`npm run lint`)
- ✅ Document your database schema changes
- ✅ Ask for help in team chat if stuck

### DON'T:
- ❌ Commit `node_modules/` or build artifacts to Git
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