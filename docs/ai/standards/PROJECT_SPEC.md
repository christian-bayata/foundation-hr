# Project Spec: [Project Name]

> **Prerequisite reading**: [UNIVERSAL_ENGINEERING.md](./UNIVERSAL_ENGINEERING.md), [NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md) (if using NestJS)
>
> **Status**: Draft | In Review | Approved
> **Last updated**: [Date]

---

## 1. Project Overview

### 1.1 Project Name

[What is the product called?]

### 1.2 Vision (One Sentence)

[The north star. What does the world look like when this project succeeds?]

## 2 Non-Functional Requirements

### 2.1 Performance

| Requirement             | Target                 | Notes         |
| ----------------------- | ---------------------- | ------------- |
| API response time (p95) | [e.g., < 500ms]        | [Exceptions?] |
| Page load time          | [e.g., < 2s]           |               |
| Concurrent users        | [Number]               |               |
| Data export throughput  | [e.g., 1000 records/s] |               |

### 2.2 Scalability

- [e.g., Horizontal scaling via stateless services]
- [e.g., Database read replicas for analytics queries]
- [e.g., Queued background jobs for heavy processing]

### 2.3 Security

- [e.g., All traffic over TLS]
- [e.g., JWT-based authentication with refresh tokens]
- [e.g., Role-based access control (RBAC)]
- [e.g., Rate limiting on public endpoints]
- [e.g., Secrets managed via environment variables, never in code]

### 2.4 Reliability

- [e.g., Uptime target: 99.9%]
- [e.g., Graceful degradation when external APIs are down]
- [e.g., Automated rollback on failed deployments]
- [e.g., Database backups: daily snapshots, point-in-time recovery]

### 2.5 Maintainability

- [e.g., Logging: structured JSON logs with correlation IDs]
- [e.g., Monitoring: health check endpoint, business metric dashboards]
- [e.g., Code: linting, formatting, type checking enforced in CI]
- [e.g., Documentation: updated alongside code changes]

---

## 3. Technical Stack

### 3.1 Backend

| Concern   | Choice                 | Rationale |
| --------- | ---------------------- | --------- |
| Runtime   | [e.g., Node.js 20 LTS] |           |
| Framework | [e.g., NestJS]         |           |
| Language  | TypeScript             |           |
| API style | REST / GraphQL / gRPC  |           |

### 3.2 Database

| Concern      | Choice                             | Rationale |
| ------------ | ---------------------------------- | --------- |
| Primary      | [e.g., PostgreSQL, MongoDB]        |           |
| Read replica | [if needed]                        |           |
| Migrations   | [e.g., TypeORM migrations, Prisma] |           |

### 3.3 Cache

| Concern        | Choice                             | Rationale |
| -------------- | ---------------------------------- | --------- |
| In-memory      | [e.g., Redis]                      |           |
| Cache strategy | [e.g., cache-aside, write-through] |           |

### 3.4 Queue / Background Jobs

| Concern        | Choice                             | Rationale |
| -------------- | ---------------------------------- | --------- |
| Message broker | [e.g., Bull/BullMQ, RabbitMQ, SQS] |           |
| Job scheduler  | [e.g., @nestjs/schedule, cron]     |           |

### 3.5 Storage

| Concern      | Choice                          | Rationale |
| ------------ | ------------------------------- | --------- |
| File storage | [e.g., S3, DigitalOcean Spaces] |           |
| CDN          | [e.g., CloudFront, Cloudflare]  |           |

### 3.6 AI Providers

| Provider          | Purpose              | Model                          |
| ----------------- | -------------------- | ------------------------------ |
| [e.g., Anthropic] | [e.g., Primary chat] | [e.g., Claude Sonnet]          |
| [e.g., OpenAI]    | [e.g., Embeddings]   | [e.g., text-embedding-3-small] |

### 3.7 Authentication

| Concern          | Choice                                          | Rationale |
| ---------------- | ----------------------------------------------- | --------- |
| Auth provider    | [e.g., Auth0, Clerk, Firebase Auth, custom JWT] |           |
| Session strategy | [e.g., JWT in HttpOnly cookies, Bearer tokens]  |           |
| Social login     | [e.g., Google, GitHub, Apple]                   |           |

### 3.8 Deployment

| Concern          | Choice                                                       | Rationale |
| ---------------- | ------------------------------------------------------------ | --------- |
| Host             | [e.g., Digital Ocean, AWS EC2, Railway, Vercel, self-hosted] |           |
| Containerization | [e.g., Docker, not needed]                                   |           |
| CI/CD            | [e.g., GitHub Actions]                                       |           |
| Infra as code    | [e.g., Terraform, Pulumi, manual]                            |           |

---

## 4. Architecture

### 4.1 Architectural Style

[Choose one and explain: Monolithic (modular), Microservices, Serverless, Event-driven, Hexagonal/Clean Architecture]

### 4.2 Major Modules

```
src/
  apis/
    module-a/       # [Purpose of this module]
    module-b/       # [Purpose of this module]
  common/         # Shared utilities, constants, middleware
  config/         # Configuration
  email/
  exception/
  file-upload/
  guard/
  job/
  pipes/

```

### 4.3 Folder Organization

[Describe or link to the per-module file structure convention — see UNIVERSAL_ENGINEERING.md §4.1]

### 4.4 Data Flow (Core Path)

```
[Client] → [Gateway/API layer/Controller] → [Service] → [Repository] → [Database]
                                     ↕
                              [External APIs / AI / Queue]
```

[Describe the request lifecycle for a typical mutation and a typical query]

### 4.5 API Strategy

- **Versioning**: [e.g., URL prefix: /api/v1/, /api/v2/]
- **Naming**: [e.g., RESTful plural nouns: /users, /users/:id]
- **Response format**: [e.g., `{ success: boolean, data: T, error?: string }`]
- **HTTP methods**: [e.g., GET for reads, POST for creates, PATCH for partial updates]

### 4.6 Background Jobs

| Job        | Trigger                 | Processing                | Notes               |
| ---------- | ----------------------- | ------------------------- | ------------------- |
| [Job name] | [e.g., Cron every hour] | [e.g., Batch aggregation] | [Idempotency notes] |
| [Job name] | [e.g., Queue on event]  | [e.g., Send email]        |                     |

### 4.7 Event Handling

- **In-process events**: [e.g., NestJS EventEmitter for synchronous domain events]
- **WebSocket events**: [e.g., Socket.IO namespace for real-time UI updates]
- **External events**: [e.g., Webhook receivers, webhook dispatchers]

---

## 5. AI Integration

### 5.1 AI Provider Strategy

| Provider          | Model         | Responsibility                               |
| ----------------- | ------------- | -------------------------------------------- |
| [e.g., Anthropic] | Claude Sonnet | Primary conversational AI, complex reasoning |
| [e.g., OpenAI]    | GPT-4o        | Image analysis, structured output            |
| [e.g., Voyage AI] | voyage-3      | Text embeddings for RAG                      |

### 5.2 Cost Optimization

| Strategy        | Detail                                                                              |
| --------------- | ----------------------------------------------------------------------------------- |
| Caching         | [e.g., Cache identical queries in Redis with 5-min TTL]                             |
| Token budgeting | [e.g., Limit max tokens per response, truncate long context]                        |
| Model tiering   | [e.g., Use cheap model for classification/ routing, expensive model for generation] |
| Batching        | [e.g., Batch embedding generation calls]                                            |

### 5.3 Fallback Strategy

- [e.g., If primary AI provider is down, fall back to secondary provider]
- [e.g., If RAG returns no results, respond based on model's general knowledge with a caveat]
- [e.g., If tool execution fails, return an error message to the AI and let it decide how to respond]
- [e.g., If streaming fails, fall back to non-streaming response]

---

## 6. Database Design

### 6.1 Main Entities

| Entity        | Key Fields                  | Purpose                |
| ------------- | --------------------------- | ---------------------- |
| [Entity name] | [PK, FKs, critical columns] | [What this represents] |
| [Entity name] | [PK, FKs, critical columns] | [What this represents] |

### 6.2 Relationships

```
[Entity A] ──1:N── [Entity B]   # [Explain relationship]
[Entity A] ──N:M── [Entity C]   # [via join table]
```

### 6.3 Indexing Strategy

| Table   | Index                      | Reason                                    |
| ------- | -------------------------- | ----------------------------------------- |
| [Table] | `{ field1: 1, field2: 1 }` | [e.g., Supports the primary lookup query] |
| [Table] | `{ createdAt: -1 }`        | [e.g., Sorting by recency]                |

---

## 7. API Design

### 7.1 REST Conventions

| Pattern | Convention                        | Example                                 |
| ------- | --------------------------------- | --------------------------------------- |
| List    | `GET /resource`                   | `GET /users?page=1&limit=20`            |
| Get     | `GET /resource?resourceId=`       | `GET /users?resourceId=abc-123`         |
| Create  | `POST /resource`                  | `POST /users`                           |
| Update  | `PATCH /resource?resourceId=`     | `PATCH /users?resourceId=abc-123`       |
| Delete  | `DELETE /resource?resourceId=`    | `DELETE /users?resourceId=abc-123`      |
| Action  | `POST /resource/action?actionId=` | `POST /users/archive? actionId=abc-123` |

### 7.2 Authentication

- [e.g., Protected routes use `Authorization: Bearer <token>` header]
- [e.g., Public routes require no auth but may be rate-limited]
- [e.g., API keys used for service-to-service or external integration access]

### 7.3 Standard Error Response Shape

```json
{
  "statusCode": 400,
  "message": "Human-readable error description",
  "error": "Bad Request"
}
```

### 7.4 Pagination

| Parameter | Default | Description             |
| --------- | ------- | ----------------------- |
| `batch`   | 1       | Page number (1-indexed) |
| `limit`   | 10      | Items per page          |

Response includes `{ data: [...], total: number, page: number, limit: number }`.

### 7.5 Validation

- [e.g., Input validated at the controller boundary via pipe/validator]
- [e.g., DTOs define validation rules (Joi schemas, class-validator decorators, Zod)]
- [e.g., Sanitize strings — strip leading/trailing whitespace, reject HTML in text fields]

---

## 8. Coding Standards

This project follows the conventions in:

- **[UNIVERSAL_ENGINEERING.md](./UNIVERSAL_ENGINEERING.md)** — Coding philosophy, design principles, naming conventions, code organization, reusable patterns, engineering standards
- **[NESTJS_ARCHITECTURE.md](./NESTJS_ARCHITECTURE.md)** — NestJS-specific patterns: modules, DI, controllers, services, guards, repositories, MongoDB, testing, cron (omit if another framework is used)

---

## 10. Risks

### 10.1 Technical Risks

| Risk                                        | Likelihood | Impact | Mitigation                                           |
| ------------------------------------------- | ---------- | ------ | ---------------------------------------------------- |
| [e.g., AI provider API rate limits]         | Medium     | High   | Cache aggressively, queue requests, fallback model   |
| [e.g., Database query performance at scale] | Low        | High   | Index early, use read replicas, monitor slow queries |
| [e.g., Third-party API deprecation]         | Low        | Medium | Wrap in abstraction layer, have migration plan       |

### 10.2 Business Risks

| Risk                                        | Likelihood | Impact | Mitigation                                |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------- |
| [e.g., Low user adoption]                   | Medium     | High   | Early access program, user feedback loops |
| [e.g., Competitor launches similar product] | Medium     | Medium | Focus on unique differentiator            |

### 10.3 AI Risks

| Risk                                        | Likelihood | Impact | Mitigation                                                                    |
| ------------------------------------------- | ---------- | ------ | ----------------------------------------------------------------------------- |
| [e.g., Hallucination in critical responses] | Medium     | High   | RAG with citations, human review for sensitive outputs, confidence thresholds |
| [e.g., Prompt injection]                    | Medium     | High   | Input sanitization, separation of instructions from user input                |
| [e.g., High AI cost scaling with users]     | Medium     | Medium | Model tiering, caching, token limits                                          |

---

_End of Project Spec_
