# Universal Engineering Guide

*Coding philosophy, engineering standards, design principles, reusable patterns, best practices, naming conventions, and architecture principles — reusable across any software project.*

> **See also**: [NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md) for framework-specific implementations of these patterns.

---

## 1. Coding Philosophy

### 1.1 Clarity Over Cleverness
Write code that is obvious in its intent. Avoid one-liners, overly clever abstractions, or premature optimization.

### 1.2 Explicit Over Implicit
Make dependencies, error paths, and data flow visible. Avoid hidden side effects, global state, or magic behavior.

### 1.3 Fail Fast, Fail Clearly
Validate inputs at the boundary. Throw descriptive errors as early as possible.

### 1.4 Consistency Over Perfection
A consistent-but-imperfect pattern across the codebase is better than a perfect pattern used in only one place.

### 1.5 Composition Over Inheritance
Prefer small, focused units that compose together. Deep inheritance trees are brittle.

### 1.6 Document Intent, Not Mechanics
Comments should explain *why*, not *what*. The code itself should already make the *what* clear.

---

## 2. Engineering Standards

### 2.1 Language & Runtime
- TypeScript with strong typing for all backend work.
- Node.js LTS runtime.
- Use `any` sparingly and only at module boundaries you intend to widen later.

### 2.2 Error Handling
- Every async operation must be wrapped in try/catch.
- Errors should carry a `location` property (`ClassName.methodName`) to pinpoint origin.
- Use a centralized error response builder, never ad-hoc error shapes.
- Distinguish expected domain errors (returned gracefully) from unexpected system errors (logged + 500).

### 2.3 Logging
- Use structured loggers with a consistent format.
- Log at entry/exit of significant operations, not every line.
- Include correlation IDs for request tracing.
- Never log secrets, tokens, or PII.

### 2.4 Testing
- Unit test business logic in isolation by mocking external dependencies.
- Test name pattern: `should [expected behavior] when [condition]`.
- Test both success paths and error paths.
- Aim for fast, deterministic tests. Avoid network calls in unit tests.
- Use `describe`/`it` blocks that mirror the class structure.

### 2.5 Configuration
- Environment-based config via a centralized config module.
- Never hardcode secrets, URLs, or environment-specific values.
- All config keys documented in a reference `.env.example` file.

### 2.6 Dependencies
- Pin major versions. Regularly audit and update.
- Prefer well-maintained libraries over NIH.

---

## 3. Design Principles

### 3.1 Single Responsibility
A module, class, or function should have one reason to change.

### 3.2 Dependency Inversion
High-level modules should not depend on low-level modules. Both should depend on abstractions. Inject dependencies through constructors.

### 3.3 Separation of Concerns
- **Controller/Handler layer**: Request/response handling, validation, routing.
- **Service layer**: Business logic, orchestration, domain rules.
- **Repository/Dao layer**: Data access, query building, persistence.
- **Domain layer**: Entities, value objects, domain events.

### 3.4 Open/Closed Principle
Modules should be open for extension but closed for modification. Use strategy patterns or hooks instead of modifying existing code.

### 3.5 Law of Demeter
A unit should only talk to its immediate dependencies. Avoid deep method chaining.

### 3.6 Command-Query Separation
Methods either perform an action (command) or return data (query), but rarely both.

---

## 4. Reusable Patterns

### 4.1 Repository Pattern
Abstract data access behind a repository class. The service layer never interacts with the ORM/ODM directly.

### 4.2 DTO Pattern (Data Transfer Object)
Define dedicated objects for every endpoint's input and output. Input DTOs carry validation rules. Output DTOs shape the response, hiding internal fields.

### 4.3 Utility/Helper Classes
Inject utility classes as providers rather than importing static functions. This keeps them testable and configurable.

### 4.4 Guard Pattern
Extract authentication and authorization into composable guards. Each guard focuses on one concern (e.g., token validation, role check, API key check). Compose them per route.

### 4.5 SSE (Server-Sent Events) for Progress
For long-running operations, stream progress updates to the client instead of blocking the request.

### 4.6 Pagination Pattern
Standardize on `batch` (page) and `limit` (page size) parameters. Compute offset via `(batch - 1) * limit`. Return both data and total count.

### 4.7 Audit Log Pattern
For sensitive operations, create audit log entries recording the actor, action, resource, and timestamp.

---

## 5. Best Practices

### 5.1 Code Organization
```
module/
  module.controller.ts
  module.service.ts
  module.module.ts
  module.utility.ts       (if needed)
  module.data.ts          (static lookup data, if large)
  dto/                    (data transfer objects)
  entity/                 (database schemas/models)
  enum/                   (enumerations)
  interface/              (TypeScript interfaces)
  repository/             (data access layer)
```

### 5.2 Imports
- Use relative imports within the same module.
- Use absolute imports (configured via `baseUrl` in tsconfig) for cross-module references.
- Group imports: external packages first, then internal modules, separated by a blank line.

### 5.3 Naming Conventions
| Element | Convention | Example |
|---------|-----------|---------|
| Classes | PascalCase | `DataService` |
| Interfaces | PascalCase + `I` suffix | `ResponseI` |
| Types | PascalCase + `T` suffix | `DataTypeT` |
| DTOs | PascalCase + `Dto` suffix | `CreateUserDto` |
| Enums | PascalCase | `ProductType` |
| Enum values | UPPER_SNAKE_CASE | `RETAIL_PRICE_CHANGE` |
| Functions/methods | camelCase | `calculateAverage()` |
| Variables | camelCase | `todayPrice` |
| Files | kebab-case | `data.service.ts` |
| Directories | kebab-case | `data-management/` |

---

## 6. Architecture Principles

### 6.1 Layered Architecture
```
Controller (HTTP handling)
    |
Service (business logic)
    |
Repository (data access)
    |
Database / external store
```
Each layer only depends on the layer below it.

### 6.2 Modular Monolith
Organize code into feature modules. Each module owns its domain and is self-contained. Modules communicate only through exported services, not by reaching into each other's internals.

### 6.3 Cross-Cutting Concerns
Use the framework's interceptors/guards/filters/pipes/middleware mechanisms for cross-cutting concerns rather than scattering them through business logic.

### 6.4 API Versioning
Prefix all routes with a version segment (e.g., `/api/v2/...`) to allow coexisting versions during migration.

### 6.5 Configuration as a Service
Access config (env vars, secrets, feature flags) through a single config service. Never access `process.env` directly.

### 6.6 External Integrations
Wrap every external service (S3, SMS, email, AI APIs) behind an injected service class. This makes them replaceable, testable, and allows for graceful degradation.

### 6.7 Database Indexing
Every collection with non-trivial query patterns must have explicit indexes. Index frequently-queried fields and compound indexes for common filter combinations.

---

## 7. Operational Excellence

### 7.1 Graceful Shutdown
Handle SIGTERM/SIGINT to close connections, finish in-flight requests, and release resources.

### 7.2 Health Checks
Expose a `/health` endpoint that verifies connectivity to critical dependencies.

### 7.3 Monitoring
- Log structured request summaries (method, path, status, duration).
- Track business metrics (queries run, exports created, AI calls).
- Monitor error rates and response times.

### 7.4 Security
- No secrets in code or logs.
- Input validation on every public endpoint.
- Rate limiting on expensive operations.
- Authenticate external-facing endpoints with API keys or tokens.
