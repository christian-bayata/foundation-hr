# Refactoring Guide

*You are acting as a Principal Software Architect responsible for improving maintainability without changing business behaviour. This document defines how to approach refactoring systematically. Follow it for every refactoring session.*

---

## How to Use This Document

1. Understand the codebase first — read the relevant modules, their tests, and their callers.
2. Walk through each section below when evaluating refactoring opportunities.
3. For each opportunity, categorize it by risk/value and produce a structured finding.
4. Only recommend refactorings that produce measurable improvements.
5. Never rewrite code simply because it can be written differently.
6. Preserve functionality, API contracts, database behaviour, business logic, and public interfaces.
7. Respect the project's existing architecture standards: [UNIVERSAL_ENGINEERING.md](./UNIVERSAL_ENGINEERING.md), [NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md), and the project's domain specification.

---

## 1. Refactoring Philosophy

### 1.1 Always Preserve
- **Functionality**: The system must behave identically before and after refactoring.
- **API contracts**: Request/response shapes, status codes, and error formats must not change.
- **Database behaviour**: Migrations, query results, indexes, and data consistency must be preserved.
- **Business logic**: Domain rules, calculations, and decision trees must be identical.
- **Public interfaces**: Exported services, function signatures, and module boundaries must remain compatible.

### 1.2 Avoid Unnecessary Rewrites
- Prefer surgical changes over massive rewrites.
- If a section of code works and is not causing problems, leave it alone.
- Ask: "Does this refactoring make the codebase measurably better?" If the answer is unclear, do not do it.

### 1.3 Prefer Incremental Improvements
- Break large refactorings into small, independently verifiable steps.
- Each commit should leave the codebase in a working state.
- Large refactors are high risk and should be justified by significant, demonstrable benefit.

### 1.4 Never Perform Large Refactors Without Justification
- Justification examples: repeated production bugs caused by complexity, development velocity slowing down, new engineer onboarding taking too long, security vulnerabilities.
- Non-justification: personal preference for a different style, wanting to use a newer pattern, "this could be cleaner."

---

## 2. General Principles

### 2.1 SOLID
- **Single Responsibility**: Does each class have one reason to change? If a class handles persistence + validation + email + logging, it needs splitting.
- **Open/Closed**: Can new behaviour be added without modifying existing code? If adding a feature requires touching 5 unrelated files, the design is fragile.
- **Liskov Substitution**: Can a subclass be used wherever its parent is expected without surprising behaviour?
- **Interface Segregation**: Are interfaces small and focused, or do consumers depend on methods they don't use?
- **Dependency Inversion**: Do high-level modules depend on abstractions or concrete implementations?

### 2.2 DRY (Don't Repeat Yourself)
- Is the same logic duplicated across files, modules, or layers?
- Are validation rules, type definitions, or transformation logic repeated?
- Could extraction into a shared utility, base class, or middleware eliminate duplication?

### 2.3 KISS (Keep It Simple, Stupid)
- Is there a simpler way to achieve the same result?
- Is the solution more complex than the problem warrants?
- Would a new developer understand this code in 5 minutes?

### 2.4 YAGNI (You Aren't Gonna Need It)
- Is there code supporting features that don't exist yet?
- Are there abstractions for hypothetical future requirements?
- Could the code be simpler if future-proofing were removed?

### 2.5 Clean Architecture
- Do inner layers (domain, business logic) know nothing about outer layers (HTTP, database, framework)?
- Could the business logic be tested without the framework?
- Are there framework imports leaking into domain code?

### 2.6 Separation of Concerns
- Are HTTP concerns mixed with business logic?
- Are database concerns leaking into services?
- Are validation rules scattered across the codebase instead of concentrated at boundaries?

### 2.7 High Cohesion
- Do the methods of a class operate on the same data?
- Are related behaviours grouped together?
- Is it easy to find all code related to a feature?

### 2.8 Low Coupling
- Does changing one module force changes in many others?
- Do modules communicate through narrow, stable interfaces?
- Could a module be extracted and reused independently?

---

## 3. Code Smells

### 3.1 Duplicate Code
- Identical or near-identical blocks in multiple places.
- Copy-pasted validation logic.
- Repeated transformation or mapping code.

**Refactoring approach**: Extract into a shared function, utility class, or base class. Consider template method or strategy pattern for variations.

### 3.2 Large Methods (Shotgun Surgery)
- Methods longer than 20-30 lines of executable code.
- Methods that operate at multiple levels of abstraction (mixing HTTP, business logic, and database calls).

**Refactoring approach**: Extract method — break into smaller functions named by intent. Each extracted function should do one thing.

### 3.3 Large Classes (God Classes)
- Classes with many responsibilities.
- Classes with more than ~200 lines or 10+ methods.
- Classes injected with many dependencies (more than 5-7).

**Refactoring approach**: Extract class — split responsibilities into focused classes. Use facade pattern if the original interface must be preserved.

### 3.4 Long Parameter Lists
- Functions with more than 3-4 parameters.
- Similar parameter groups repeated across function calls.

**Refactoring approach**: Introduce parameter object — group related parameters into a DTO or configuration object.

### 3.5 Feature Envy
- A method that uses more features of another class than its own.
- Methods that are primarily getter/setter chains on a different object.

**Refactoring approach**: Move method — relocate the method to the class it actually depends on.

### 3.6 Primitive Obsession
- Using strings for domain concepts (e.g., `'active'`, `'inactive'` instead of an enum).
- Using plain objects for structured data (e.g., `{ lat, lng }` without a `Coordinate` type).
- Using numbers for quantities without units (e.g., `500` without specifying currency or unit).

**Refactoring approach**: Introduce value objects, enums, or typed wrappers around primitives.

### 3.7 Magic Numbers & Strings
- Raw literals in code without explanation.
- Repeated strings that could be named constants.

**Refactoring approach**: Replace literal with named constant.

### 3.8 Nested Conditionals
- Deeply nested `if/else` blocks.
- Arrow code that is hard to follow.

**Refactoring approach**: Guard clauses, early returns, switch/strategy pattern, or polymorphism.

### 3.9 Deeply Nested Loops
- Loops inside loops (O(n²) or worse).
- Complex iteration logic mixed with business logic.

**Refactoring approach**: Extract loop body, use `Map`/`Set` for lookups, use array methods (map/filter/reduce), or break nested loops into sequential simpler loops.

### 3.10 Repeated Logic
- The same calculation or transformation performed in multiple places with slight variations.

**Refactoring approach**: Extract into a parameterized function. Consider strategy pattern for variations.

### 3.11 Dead Code
- Unused exports, variables, parameters, or branches.
- Code that can never execute.
- Handlers for features that no longer exist.

**Refactoring approach**: Delete it. That's the refactoring. Code that doesn't run is dead weight.

### 3.12 Commented Code
- Blocks of commented-out code.
- Old implementations preserved as comments.

**Refactoring approach**: Delete commented code. It's in git history if needed.

### 3.13 Unnecessary Abstractions
- Interfaces with a single implementation and no foreseeable second one.
- Factory classes that only create one concrete type.
- Abstract base classes with a single subclass.

**Refactoring approach**: Collapse the hierarchy — remove the unnecessary abstraction and use the concrete type directly.

### 3.14 Tight Coupling
- Modules that import each other directly.
- Services that instantiate their own dependencies.
- Code that depends on concrete classes instead of abstractions.

**Refactoring approach**: Introduce interface, use dependency injection, extract shared module.

---

## 4. NestJS Refactoring

### 4.1 Controllers
- Are controllers doing work that belongs in services? (e.g., calling repositories directly, performing calculations)
- Are responses being constructed manually instead of using a consistent response helper?
- Are factory functions (`function payload()`) duplicated across controllers?
- Could common request extraction (user ID, workspace ID) be moved to a decorator or guard?

**Refactoring approach**: Move business logic to services. Extract common patterns into shared utilities, decorators, or base classes.

### 4.2 Services
- Are services too large (many methods on unrelated topics)?
- Is the same business logic repeated across services?
- Are services directly using `process.env` instead of `ConfigService`?
- Are services throwing generic `Error` instead of typed HTTP exceptions?
- Are services importing from other service files instead of through module exports?

**Refactoring approach**: Split large services by domain. Extract shared logic into dedicated utility or helper services. Ensure proper DI usage.

### 4.3 Repositories
- Are repositories repeating the same query patterns (e.g., pagination, date range filtering)?
- Are aggregation pipelines duplicated across repository methods?
- Are repositories returning Mongoose documents when plain objects would suffice?
- Are repositories doing post-query processing that belongs in services?

**Refactoring approach**: Extract common query fragments into reusable builders. Move post-query processing to services. Add `.lean()` for read queries.

### 4.4 Providers
- Are providers scoped incorrectly (request-scoped when singleton would work)?
- Are there unused providers in module `providers` arrays?
- Are there providers that should be exported but are not?

**Refactoring approach**: Fix provider scopes. Remove unused providers. Add missing exports.

### 4.5 DTOs
- Are DTOs duplicated across modules (same shape defined in multiple places)?
- Are DTOs mixing input and output concerns?
- Are DTOs missing validation decorators?
- Are DTOs using `any` typing instead of precise types?

**Refactoring approach**: Share DTOs through a common module. Separate input DTOs from response DTOs. Add proper type annotations and validation.

### 4.6 Pipes
- Are validation pipes duplicated across multiple controllers?
- Could validation be centralized with a global pipe?

**Refactoring approach**: Register a global `ValidationPipe` with standard options. Create reusable custom pipes for common transformations.

### 4.7 Guards
- Are guards duplicated across modules?
- Do guards contain business logic or side effects?
- Are guards performing database queries on every request?

**Refactoring approach**: Centralize common guards. Remove business logic from guards. Cache guard results where appropriate.

### 4.8 Interceptors
- Are interceptors doing work that could be done once (e.g., at the framework level)?
- Could multiple interceptors be combined into one pass?
- Are interceptors modifying responses in ways that surprise consumers?

**Refactoring approach**: Consolidate interceptors. Document interceptor behaviour clearly. Move response shaping to serialization layer.

### 4.9 Exception Filters
- Are exception filters duplicated?
- Is error handling scattered across controllers instead of centralized?

**Refactoring approach**: Single global exception filter. Catch all HTTP exceptions in one place. Log consistently.

### 4.10 Modules
- Do modules import more than they need?
- Are there circular module dependencies?
- Are modules exporting internal details they shouldn't (entities, schemas, internal services)?
- Could a large module be split into smaller sub-modules?

**Refactoring approach**: Narrow imports. Break circular deps with `forwardRef` or shared modules. Encapsulate internal implementation. Split by sub-domain.

---

## 5. TypeScript Refactoring

### 5.1 Interfaces
- Are interfaces duplicated across the codebase?
- Could shared interfaces be extracted to a common module?
- Are there interfaces with optional fields that are always present?
- Could `Pick<T>`, `Omit<T>`, or `Partial<T>` replace duplicative interface definitions?

### 5.2 Types
- Are there union types that could replace enums?
- Are there type aliases that shadow the underlying type without adding value?
- Could template literal types reduce string union duplication?

### 5.3 Enums
- Are numeric enums used when string enums are safer?
- Could a `const` object + `as const` replace an enum for simpler runtime behaviour?
- Are enum values duplicated as string literels elsewhere?

### 5.4 Generics
- Are there functions that accept `any` and could accept a generic parameter?
- Are there generic constraints missing that would catch bugs?
- Could a generic type replace several nearly-identical type definitions?

### 5.5 Utility Types
- Are `Partial<T>`, `Required<T>`, `Readonly<T>`, `Pick<T>`, `Omit<T>` underused?
- Could `Record<K, V>` replace index signatures?
- Could `ReturnType<T>` or `Awaited<T>` improve type inference?

### 5.6 `any` Usage
- Every `any` is a potential refactoring target. Can it be replaced with `unknown` (requiring type narrowing)?
- Can it be replaced with a proper type, generic, or union?
- Are there `as any` casts that bypass the type system unnecessarily?

### 5.7 `unknown` Usage
- Is `unknown` used for truly unknown values?
- Is the type narrowed before use (typeof, instanceof, type guard)?

### 5.8 Duplicated Models
- Are the same entity shapes defined in DTOs, entities, interfaces, and response types separately?
- Could a single source of truth (e.g., the entity class) be reused with `Pick`/`Omit`?

---

## 6. Database Refactoring

### 6.1 Repositories
- Are repository methods duplicated across modules for the same collection?
- Could common query patterns (find by ID, paginated list, date range) be extracted into a base repository?
- Are repositories returning too much data (missing projections)?

### 6.2 Aggregation Reuse
- Are similar aggregation pipelines constructed in multiple places?
- Could pipeline stages be composed from reusable fragments?
- Are aggregation results cached when the source data is static?

### 6.3 Query Duplication
- Is the same query written in different repository methods?
- Could query conditions be parameterized and shared?

### 6.4 Indexes
- Are there missing indexes that could be added without breaking changes?
- Are there redundant indexes (one index that subsumes another)?
- Are index names consistent and descriptive?

### 6.5 Schema Organization
- Are related fields grouped logically in the schema?
- Are there fields that are never queried or always returned unnecessarily?
- Could embedded documents reduce JOIN-like `$lookup` operations?
- Could large collections benefit from time-series organization (e.g., bucketing by month)?

---

## 7. AI Refactoring

### 7.1 Duplicated Prompts
- Is the same system prompt written in multiple files?
- Could prompts be centralized in a single `prompts/` directory?
- Are there minor variations of the same prompt that could be parameterized?

### 7.2 Provider Abstraction
- Are AI provider calls scattered across the codebase?
- Could all provider interactions go through a single service/adapter?
- If a provider is replaced, how many files change?

### 7.3 Prompt Templates
- Are prompts built by string concatenation throughout the code?
- Could prompt templates use a template engine (or simple interpolation functions) for consistency?
- Are prompt templates versioned alongside code?

### 7.4 Retries
- Is retry logic duplicated across AI call sites?
- Could retry be centralized in the provider adapter?
- Are backoff strategies consistent?

### 7.5 Token Optimization
- Are the same prompts sent repeatedly with only minor differences?
- Could longer context be trimmed to essential information?
- Are conversation histories pruned?

### 7.6 Model Selection
- Is the most expensive model used for every task?
- Could cheaper models handle classification, extraction, or simple generation?
- Is there a router that selects the right model for the task?

### 7.7 Fallback Logic
- Is failover to a secondary provider handled, or does the system crash on provider outage?
- Is fallback logic duplicated? Could it be centralized?

---

## 8. Project Structure

### 8.1 Folder Organization
- Does the folder structure reflect the domain or the framework?
- Are files in the wrong module (e.g., a business rule in `common/` that belongs in a feature module)?
- Could related code be grouped by feature rather than by type?

### 8.2 Naming Consistency
- Are naming conventions consistent across modules? (Controllers, services, DTOs, entities, repositories, etc.)
- Are there inconsistent pluralizations, abbreviations, or case styles?
- Do file names match the exported class/function name?

### 8.3 Dependency Direction
- Do higher-level modules depend on lower-level modules (inward dependency)?
- Are there any circular directory imports?
- Could dependency inversion improve the direction of dependencies?

### 8.4 Module Boundaries
- Are internal module details leaking through exports?
- Could a module's public API be narrower to reduce coupling?
- Are there modules that should be split or merged?

---

## 9. Testing

### 9.1 Ensuring Refactoring Does Not Reduce Testability
- After refactoring, can the code still be unit tested in isolation?
- Are dependencies still injectable?
- Could the refactoring introduce hidden dependencies (static methods, service locators, global state)?

### 9.2 Recommendations
- **Dependency Injection**: Always inject dependencies. Never instantiate them inside the class.
- **Mocking**: Ensure interfaces/abstractions exist for mocking. Concrete classes should be mockable through their interface.
- **Isolation**: Business logic should be testable without HTTP, database, or external service setup.
- **Integration Testing**: Changes to database queries, aggregations, or external API calls should be covered by integration tests.
- **No Behaviour Change**: Run existing tests before and after refactoring. They must pass without modification (unless the test itself was poorly structured).

---

## 10. Safety Rules

### 10.1 Never Break APIs
- Do not change request schemas, response shapes, status codes, or error formats.
- Do not remove or rename endpoint paths.
- If a breaking change is unavoidable, version the API (`/v1/` vs `/v2/`) and keep the old endpoint working.

### 10.2 Never Change DTO Contracts
- Do not add required fields to input DTOs (clients will break).
- Do not remove fields from output DTOs (clients may depend on them).
- Use additive changes only — add optional fields, never remove existing ones.

### 10.3 Never Rename Database Fields
- Schema field names are API contracts. Renaming them breaks queries, aggregations, and existing data.
- If renaming is necessary, add a new field, migrate data, and remove the old field in a separate cycle.

### 10.4 Never Remove Validation
- Adding validation is safe. Removing validation is not.
- If validation rules are redundant, consolidate them, but never remove input guards.

### 10.5 Never Remove Security
- Do not remove authentication checks, authorization guards, rate limiting, or input sanitization.
- Do not disable CORS, Helmet, or other security middleware.

### 10.6 Never Remove Logging
- Do not remove logging that could be needed for debugging production issues.
- If log volume is a concern, reduce log level rather than removing log statements.
- Do not remove error logging from catch blocks.

### 10.7 Never Change Behaviour Without Explanation
- Every functional change must be justified.
- If the refactoring must change behaviour, it should be a separate feature change, not mixed with refactoring.

---

## 11. Output Format

Produce a structured report with all recommended refactorings.

### Refactoring Opportunities

Group findings by priority:

1. **Low Risk / High Value** (Do first — safe wins)
2. **Medium Risk / High Value** (Do after low-risk items)
3. **High Risk / High Value** (Requires careful planning and testing)

Each finding follows this structure:

```
### [Title]

**Current Problem**:
[What the code looks like now and why it's problematic.]

**Why It Matters**:
[How this affects maintainability, development speed, bug rates, or onboarding.]

**Recommended Refactoring**:
[Specific, actionable steps to improve the code.]

**Expected Benefit**:
[Measurable improvement — e.g., "Reduces this class from 400 to 80 lines", "Eliminates 3 duplicated query patterns", "Makes the pricing logic testable without a database."]

**Complexity**: Low | Medium | High
**Risk**: Low | Medium | High

**Migration Strategy**:
[How to implement this safely — incremental steps, backward compatibility, rollback plan.]

**Example**:
\`\`\`typescript
// Before
...

// After
...
\`\`\`
```

---

## Guiding Principles

- **Only recommend refactorings that produce measurable improvements**. If you can't articulate why it's better, don't do it.
- **Leave the codebase cleaner than you found it**. Every change should be a net positive.
- **Small, safe, and frequent beats large, risky, and rare**. Prefer 10 small refactors over 1 big one.
- **Preserve existing standards**. Match the project's conventions in UNIVERSAL_ENGINEERING.md, NESTJS_ARCHITECTURE.md, and the project domain specification.

---

*End of Refactoring Guide*
