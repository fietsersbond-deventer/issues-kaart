# Copilot Instructions for fietsersbond-kaart

## Git Commits

**CRITICAL:** Never make git commits yourself. Always leave code changes staged or unstaged for the user to commit.

The user must maintain full control over commits and decide when, how, and with which messages to commit changes. After completing code changes:
- Stage changes with `git add` if appropriate
- Do NOT run `git commit`
- Do NOT run `git push`
- Explicitly tell the user that changes are ready to be committed

## Development Workflow

- Begin a new environment with `bash scripts/setup-agent.sh --validate`
- After changes, run `bash scripts/validate-agent.sh` with the dev server stopped
- Use the Node.js version from `.nvmrc` with `nvm use`
- Install dependencies with `pnpm install --frozen-lockfile`
- Migrations are applied automatically on startup via `server/plugins/run-migrations.ts`

## Code Standards

- All variables and function names must be in English
- Commit messages and PRs should be in Dutch (except technical descriptions which may use English if needed)
- Follow [Conventional Commits 1.0.0-beta.2](https://www.conventionalcommits.org/en/v1.0.0-beta.2/)
- Use gerund titles: e.g., "fix(kaart): herstel de weergave van markers"

## Testing & Quality

- Run `pnpm run lint` for linting and formatting checks
- Run `pnpm run typecheck` for type checking
- Run `pnpm run test:run` for unit tests
- Always run checks before considering changes complete
- Tests are the source of truth for behavior

## Database

- Tags now use auto-incremented `id` as primary key (not slug)
- Tag slugs can be safely changed without breaking issue references
- All tag references use `tag_id` foreign key in `issue_tags` table
- Schema migrations in `server/database/migrations/` are applied automatically
