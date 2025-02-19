# Git Guidelines

In my experience, working with anyone other than yourself when coding can introduce the dreaded merge conflicts (in some cases even with yourself). Merge conflicts can be annoying, but they are preventable. While we won't be able to completely eliminate them all, here's a set of guidelines to ensure our team minimizes such conflicts.

This guide serves to prevent integration and collaboration conflicts and ensure changes made will not break the production-level code.

## Operations

### Branching Setup

- Main: Holds the code ready for production. This will have scheduled releases so that we can ensure continuous delivery
- Dev: development branch where all code is integrated and tested before merging into main
- Features: 1-3 day branches created for individual features, fixes, or updates

### Starting a new feature

Whether you have been assigned to a feature or would like to start working on a feature, always create a feature branch from the latest changes in the dev branch to prevent merge conflicts and start your code as the most recent (covered later).

# Switch to dev branch

Always create and switch to your new feature branch. First, make sure your dev branch is up to date.

```bash
git switch dev

git pull --rebase origin dev  # Get latest dev changes with linear history
```

```bash
git switch -c feature/awesome-feature-name
```

### Questions

**Why should you --rebase?**

Rebasing a branch keeps the commit history linear instead of branched out, making the history easier to read and so you don't have to create extra "merge commits".

**When should you --rebase?**

- After a few commits in your feature branch, for safety.
- If it has been some time since you've worked on the code.

Since there are multiple people working at any given time, merges and changes to dev could be consistently happening
In either case, Switch to dev, rebase there, then switch back to your feature branch and rebase the dev changes on to your branch. _We'll cover this later._

**Best case scenario: you're always up to date!**

##d Commit Messages
Structuring your commit messages to a standardized and conventional format makes it easier for the team to understand the changes you've made, and for tools to generate automatic release notes.

#### How to structure your commit messages

Each commit message should have the following structure:

```plain
<commit type>(optional scope): description -m

[optional body with detailed description]

[optional footer(s)]
```

### Structure explanation

- Type: The nature of the change. Common types:

    - feat: A new feature
    - fix: A bug fix
    - docs: Documentation changes
    - style: Code formatting, no functionality changes
    - refactor: Code changes without adding features or fixing bugs
    - test: Adding or modifying tests
    - chore: Routine tasks or maintenance

- Scope (Optional): The part of the codebase affected by the commit (e.g., feat(auth): add login feature).

- Description: A brief summary of the changes, written as a command (e.g., "add login functionality").

- Body (Optional): Explains the “why” behind the change, useful for more complex commits.

- Footer (Optional): References issues or breaking changes (e.g., BREAKING CHANGE: removes support for legacy APIs).

Examples:

- Feature Addition:
    ```bash
    git commit -m "feat(auth): add user login functionality"
    ```
- Bug Fix:
    ```bash
    git commit -m "fix(ui): correct button alignment on mobile screens"
    ```
- Breaking Change:

    ```vim
        # only type 'git commit' to write this type of message in an editor instead of a terminal

        feat(api): overhaul user endpoint structure

        Breaking Change: add change that will break existing version.
    ```

## Working on Features

When working on a feature:

- Make frequent, small commits to capture your progress.
- Use conventional commit messages for clarity.
- Push your branch regularly to share progress.

## Make changes and commit often

```bash
git add .

git commit -m "feat(scope): description"

# Share your work

git push origin feature/awesome-feature-name
```

Tip: _Small, frequent commits are easier to review and troubleshoot. Don’t worry about perfect messages since we’ll squash them later._

## Updates During Development

For long-running features, it’s important to keep your branch up-to-date with dev to avoid conflicts.

Update your dev branch:

```bash
git switch dev

git pull --rebase dev

# Then rebase your feature branch

git switch feature/awesome-feature-name

git rebase dev # places your changes at the top of the latest dev updates
```

## Integrating your branch

Your feature branch will only be merged into the dev branch.

### Checklist for Code Integration: Important!

Use this checklist to ensure you are ready to integrate your branch

- [ ] Am I sure that I am done with this feature/branch?
- [ ] Does everything I wrote work to the best of its ability?
- [ ] Have I done a final pull to get the changes from the dev branch? (see [Updates during development](#updates-during-development))

## Steps to integrating your changes

### Create a Pull Request (PR):

- Make a PR from your feature branch to dev on Github. (you won't be able to merge from your terminal, as dev is a protected branch)
- Include a descriptive title and link any relevant issues

#### Squash and Merge:

- Your code will be reviewed either by a lead or via automations. Either will need to pass 100% before merging

- After review, use Github's `Squash and Merge` option to merge. This converts all of your individual commits into bullet points and creates one single commit to dev

**Example:**

```bash
feat(user-profile): add avatar upload functionality

- Add image upload component

- Implement cropping functionality

- add unit tests

- update user documentation

# all bullet points were originally a commit
```

## Ready for Release

When all integrated features are ready to release, an admin will rebase dev onto the main branch for a clean and linear history.

- Verify dev branch is ready
- Switch to dev and ensure it's up to date

```bash
git switch dev

git pull --rebase dev

# run all tests to ensure everything works
```

- Create a pull request
- Create a PR on Github:

    - Base main
    - Compare dev

- Title: Use conventional format (e.g., release: v1.2.0 user profile enhancements).
- Review and Rebase:
- Perform a final review of all changes
- Use Github's Rebase and Merge option. This places all dev commits linearly after main.
- Tag the release:
- After rebasing, tag the release on main

**Example**

```bash
git switch main

git pull --rebase main

git tag -a v1.2.0 -m "Release v1.2.0 - User Profile Enhancement"

git push origin v1.2.0
```

_Why tag? Tagging marks the release version. This makes it easier to locate, rollback or reference in the future_

## Best Practices

### Feature Branches

- Make small, regular commits.
- Use conventional commit format.
- Push changes frequently.

### Pull Requests

- One feature per PR for clear reviews.
- Use squash merge to create a clean single commit on dev.
- Write descriptive messages for squashed commits.

### Dev Branch

- Only completed, reviewed features.
- Each feature is one conventional commit.
- Always up-to-date with latest changes and ready for testing.

### Main Branch

- Stable releases only.
- Linear history of features.
- Tagged versions for easy reference.

## Troubleshooting

### Rebasing Conflicts

If you encounter conflicts during a rebase:

- Resolve: Edit conflicting files and use git add to mark them resolved.
- Continue: Use git rebase --continue to proceed.
- Abort: If it’s too complex, use git rebase --abort to return to the state before rebasing.
