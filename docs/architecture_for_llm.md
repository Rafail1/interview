# Architecture for LLMs — NestJS Task Service Boilerplate

Purpose
- A concise, machine-friendly description of the project's architecture and coding rules.
- Intended for: LLMs, automated coders, reviewers, and new engineers to generate code that fits the project's structure and constraints.
- Project goal: a NestJS boilerplate that enforces clear layering, DI-by-token, repo abstraction, mappers, and messaging patterns suitable for AI-assisted development.

Summary
- NestJS + TypeScript application structured by responsibility: HTTP controllers → Application / Use-cases → Domain → Infrastructure → Core.
- Repositories and persistence are abstracted as domain interfaces; implementations live under `infrastructure`.
- DI tokens (upper-snake, suffixed `_TOKEN`) are used to decouple implementations from callers.
- Messaging (RabbitMQ) and mappers exist in `infrastructure/messaging` and `infrastructure/mappers`.
- Tests: unit tests colocated, e2e/integration tests under `test/`.

Repository surfaces referenced in this doc (examples)
- `src/core` — shared interfaces, exceptions, infra (e.g., `src/core/interfaces/logger.interface.ts`, `src/core/infrastructure/nest-logger.service.ts`, `src/core/exceptions/not-found.appexception.ts`)
- `src/tasks/interfaces/http/tasks.controller.ts`
- `src/tasks/application/use-cases/create-task.use-case.ts`
- `src/tasks/application/services/task-event-handler.service.ts`
- `src/tasks/domain/entities/task.entity.ts`
- `src/tasks/domain/value-objects/task-status.value-object.ts`
- `src/tasks/domain/interfaces/task.repository.interface.ts`
- `src/tasks/infrastructure/repositories/task.repository.ts`
- `src/tasks/infrastructure/mappers/task.mapper.ts`
- `src/tasks/infrastructure/messaging/rabbitmq-event.publisher.ts`
- `test/tasks.e2e-spec.ts` and spec files next to code (e.g., `src/tasks/application/use-cases/get-tasks.use-case.spec.ts`)

Architecture (textual diagram)
- Layers (outer → inner):
  1. HTTP / Controllers — `src/tasks/interfaces/http`  
  2. Application / Use-cases — `src/tasks/application`  
  3. Domain — `src/tasks/domain` (entities, value-objects, interfaces)  
  4. Infrastructure — `src/tasks/infrastructure` (persistence, mappers, messaging)  
  5. Core / Shared — `src/core` (logger, connections, exceptions, utils)

- Allowed dependency directions:
  - Controllers → Application → Domain → Infrastructure
  - Application → Core
  - Infrastructure → Domain (implementation uses domain types)
  - Infrastructure → Core

- Forbidden dependency directions:
  - Domain must not import Application, Infrastructure, or Controllers.
  - Application must not import specific Infrastructure implementations (only domain interfaces or core).
  - Controllers must not import Infrastructure implementations directly.

Conventions & Patterns (short)
- DI tokens:
  - Naming: `UPPER_SNAKE_TOKEN` (e.g., `TASK_REPOSITORY_TOKEN`, `LOGGER_TOKEN`)
  - Tokens export the binding key for DI and live near their interface or in a `domain` or `core` index-barrel.
  - Example usage: `@Inject(TASK_REPOSITORY_TOKEN) private readonly taskRepository: ITaskRepository` in `create-task.use-case.ts`.

- Use-cases:
  - Stateless `@Injectable()` classes in `src/tasks/application/use-cases`.
  - Orchestrate domain factories/entities/value-objects and call repository interfaces.

- Domain:
  - Pure TypeScript; no framework-specific imports or infrastructure code.
  - Holds business invariants: `src/tasks/domain/entities/*`, `src/tasks/domain/value-objects/*`, `src/tasks/domain/interfaces/*`.

- Repositories:
  - Interfaces in `src/tasks/domain/interfaces`.
  - Implementations in `src/tasks/infrastructure/repositories`.
  - Use DI tokens for binding implementations to interfaces.

- Mappers:
  - Map between domain and ORM/DTO shapes in `src/tasks/infrastructure/mappers`.
  - Application and Domain must not import mappers.

- Messaging:
  - Publishers/consumers in `src/tasks/infrastructure/messaging`.
  - Event handling logic placed in `src/tasks/application/services` or `application/use-cases` when it belongs to business logic.

- DTOs:
  - HTTP DTOs in `src/tasks/interfaces/dtos`.
  - Controllers convert DTOs → command objects for use-cases; Use-cases return domain outputs (IDs or domain DTOs) which controllers map back to HTTP DTOs.

- Exceptions & logging:
  - Exceptions in `src/core/exceptions`.
  - Logger exposed by `src/core/interfaces/logger.interface.ts` and implementation in `src/core/infrastructure`.

AI-Coding Rules (explicit, numbered)
These rules are the authoritative constraints an LLM or automated coder must follow when producing or modifying code.

1. Layer-respect: Always place code in the layer that corresponds to its responsibility. Example: HTTP handlers in `src/tasks/interfaces/http`, domain entities in `src/tasks/domain/entities`.  
   - Rationale: maintain separation of concerns.

2. Import-direction: Enforce allowed dependency directions only (Controllers → Application → Domain → Infrastructure/Core). Do not create imports that reverse the direction.  
   - Example to forbid: `src/tasks/domain/*` importing from `src/tasks/infrastructure/*`.

3. Domain purity: Domain code must not import NestJS, TypeORM, mappers, controllers, or any infra implementation. Only `src/core` primitives (value types, small helpers) and stdlib allowed.

4. Repositories by interface: Use repository interfaces from `src/tasks/domain/interfaces` inside use-cases; always inject implementations with DI tokens declared near the interface. Implementations must live in `src/tasks/infrastructure/repositories`.

5. DI token naming: Exported DI tokens must be upper-snake-case and end with `_TOKEN` (e.g., `TASK_REPOSITORY_TOKEN`). Use these tokens in `@Inject(...)`. Tokens should be exported constants (not string literals scattered across files).

6. No mapper usage in use-cases/domain: Mappers live in `infrastructure` and are used by infra code (repositories/controllers) only. Use-cases should operate on domain objects only.

7. DTO boundary: Controllers accept/return DTOs (`src/tasks/interfaces/dtos/*`), convert to domain-friendly shapes/commands, call use-cases, and map results back to DTOs.

8. No deep-relative imports: Prefer root-alias `src/...` (configure `tsconfig.paths`) or short relative imports. Avoid long `../../../..` chains in imports.

9. Single responsibility per file & naming: One exported top-level class or interface per file; file name matches symbol name (e.g., `create-task.use-case.ts` contains `CreateTaskUseCase`).

10. Exceptions & error mapping: Use `src/core/exceptions/*` for common HTTP-mapped errors (e.g., NotFound, Conflict). Domain may define domain-specific error types (pure TS) but mapping to HTTP codes is the responsibility of controllers/exception filters.

11. Logger usage: Use the `ILogger` interface via injection (`LOGGER_TOKEN`); avoid `console.log` outside quick scripts or local debugging.

12. Messaging placement: Publishers and consumers live in `src/tasks/infrastructure/messaging`. Event handlers that contain business logic should live in `application/services` (not in infra) and be invoked by consuming adapters.

13. Tests co-location: Unit tests next to implementation files (e.g., `*.spec.ts` beside a use-case). Integration tests and e2e tests live in `test/`.

14. Barrel exports: Only expose stable contracts from layer indices (e.g., `src/tasks/domain/index.ts`)—do not export internal implementation details.

15. Avoid framework leakage: Domain module code must be framework-agnostic; Application layer may use DI/Decorators; Controllers and infra can use framework specifics.

16. Mapper testing: For each mapper in `infrastructure/mappers`, provide unit tests validating domain ↔ persistence ↔ DTO conversions.

17. Event payloads: Events should carry domain primitives or value-object serializable forms; avoid passing ORM-specific entities.

18. Config & secrets: Keep credentials/config in environment variables. `src/core/infrastructure` loads connections using env + safe defaults.

19. Naming: Keep entity and value-object names descriptive: `Task`, `TaskStatus`, `Priority`. Use `PascalCase` for types and classes, `camelCase` for variables and functions, `UPPER_SNAKE` for DI tokens and constants.

20. PRs and linters: All code changes must pass linting (warnings for now) and include unit tests for new or modified mappers/domain logic.

Rationale summary
- These rules keep domain logic portable and testable, avoid coupling business logic to persistence/frameworks, and make AI-generated patches auditable and verifiable.

Enforcement Recommendations (implementable)
- Use ESLint with recommended plugins (initial enforcement severity: `warn`):
  - `eslint-plugin-boundaries` (or `import/no-restricted-paths`) to define layer zones and permitted import directions.
  - `import/no-relative-parent-imports` to reduce deep relative imports.
  - `id-match` or a light custom rule to enforce DI token naming (`*_TOKEN`).
  - `import/no-extraneous-dependencies` to ensure infra-only packages are not used in domain.
  - Optional quality plugins: `eslint-plugin-unicorn`, `eslint-plugin-sonarjs`.
- TypeScript config:
  - Use `paths` in `tsconfig.json` to allow `src/*` imports and simplify import rules.
- CI:
  - Add `npm run lint` to PR checks (initially surface warnings only).
  - Require unit tests for domain/mappers; failing tests block merge.
- Pre-commit:
  - Husky + lint-staged to run `eslint --fix` on staged files.
- Progressive enforcement:
  - Start with `warn` for many rules; after stabilization flip critical layered-import rules to `error` in CI.
- Automated checks:
  - Add a simple script that scans imports to detect forbidden direction violations (useful as a fallback if ESLint plugin produces false positives).

Checklist to implement enforcement
1. Add ESLint plugins: boundaries/import/unicorn/sonarjs (or equivalents).
2. Configure `eslint.config.mjs` to declare zones: `src/core`, `src/tasks/domain`, `src/tasks/application`, `src/tasks/infrastructure`, `src/tasks/interfaces`, `src/tasks/interfaces/http`.
3. Add `import/no-relative-parent-imports` and `import/no-restricted-paths` rules; set to `warn`.
4. Add `id-match` to enforce DI token pattern; set to `warn`.
5. Update `tsconfig.json` with `paths` such as `"@src/*": ["src/*"]` or `"src/*": ["src/*"]`.
6. Add `lint` to `package.json` and run locally: `npm run lint`.
7. Add Husky + lint-staged for pre-commit.
8. Run linter across repo, fix obvious issues, iterate on rule tuning.
9. Add `npm run lint` to CI as a warning-report step; later promote to blocking for critical rules.

LLM Prompt Templates & Usage (short)
- Use the following templates when asking an LLM to modify or add code:

1) Add a new use-case
- Prompt: "Create a new Use-Case in `src/tasks/application/use-cases` named `DoXUseCase`. It must import domain interfaces from `src/tasks/domain/interfaces`, inject the `X_REPOSITORY_TOKEN`, use domain factories/value-objects in `src/tasks/domain`, and not import any infra mappers or implementations. Place tests at `src/tasks/application/use-cases/do-x.use-case.spec.ts`. Follow project DI token naming (`*_TOKEN`)."

2) Add a repository implementation
- Prompt: "Implement repository `XRepository` under `src/tasks/infrastructure/repositories` implementing the interface `IXRepository` from `src/tasks/domain/interfaces`. Use mappers in `src/tasks/infrastructure/mappers` to convert between ORM and domain. Export binding constant to be provided by module wiring, and do not change domain files."

3) Fix an import violation
- Prompt: "Detect imports in `src/tasks/domain` that reference `src/tasks/infrastructure` and refactor them to depend on domain interfaces or move code to infrastructure. Provide a patch and tests for any moved code."

4) General change rule for LLM
- Prompt preface to LLM: "Adhere to the project's layering rules: Controllers → Application → Domain → Infrastructure → Core. Never import infrastructure into domain. DI tokens must be named `*_TOKEN`. Use DTOs in `src/tasks/interfaces/dtos`, mappers in `src/tasks/infrastructure/mappers`, and repository interfaces in `src/tasks/domain/interfaces`."

Example LLM check request (automatic)
- "Scan repo for import statements where `src/tasks/domain` imports `src/tasks/infrastructure` or `src/tasks/interfaces/http` — list file paths and offending lines."

Appendix — Practical examples (from repo)
- Use-case example: `src/tasks/application/use-cases/create-task.use-case.ts`
  - Injects: `TASK_REPOSITORY_TOKEN` (`src/tasks/domain/interfaces/task.repository.interface.ts`) and `LOGGER_TOKEN` (`src/core/interfaces/logger.interface.ts`).
  - Uses: `Task.create(...)` (`src/tasks/domain/entities/task.entity.ts`) and value objects `TaskStatus`, `Priority` (`src/tasks/domain/value-objects/*`).
  - Does not import: mappers or infrastructure implementations.

- Mapper example: `src/tasks/infrastructure/mappers/task.mapper.ts`
  - Responsibility: map between ORM entity (`src/tasks/infrastructure/entities/task-orm.entity.ts`) and domain `Task`.

- Repository interface: `src/tasks/domain/interfaces/task.repository.interface.ts`
  - Defines contract used by use-cases; implementation in `src/tasks/infrastructure/repositories/task.repository.ts`.

How to feed this to another LLM
- Provide:
  - Relevant file tree (top-level `src/` and `test/`).
  - This `docs/architecture_for_llm.md`.
  - Example files mentioned in Appendix (especially `create-task.use-case.ts`, `task.entity.ts`, `task.repository.interface.ts`, mapper file).
- Ask the LLM to:
  - Propose code following these rules.
  - Generate ESLint config matching the enforcement recommendations (set to `warn`).
  - Create PRs with changes and tests.

Closing notes
- Start with the rules as `warn` in linters to collect violations and refine the rule set; then incrementally tighten to `error` for hard constraints.
- If you want, I can now:
  1) Generate the ESLint config snippet that implements the enforcement recommendations (set to `warn`), ready to paste into `eslint.config.mjs`.  
  2) Create a small script to list forbidden imports (domain → infra) as a lightweight guard before ESLint is configured.

Which follow-up would you like: the ESLint config snippet next, or the lightweight forbidden-imports detection script?
