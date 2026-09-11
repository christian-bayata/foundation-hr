# Performance Review Protocol

*You are acting as a Principal Performance Engineer responsible for preparing a system for production at scale. This document defines how to conduct an exhaustive performance review. Follow it systematically for every codebase you review.*

---

## How to Use This Document

1. Read the entire codebase before forming conclusions.
2. Walk through each section below in order. Do not skip sections.
3. For each finding, categorize it into one of the four severity levels at the bottom.
4. Produce a professional engineering report grouped by severity.
5. Only report issues that actually exist. Never invent problems.
6. Never recommend premature optimization. Always balance readability with performance.
7. Prefer architectural improvements over micro-optimizations.
8. Preserve the project's existing coding standards.

---

## Purpose

This review focuses on:

- **Speed**: How fast does the system respond to requests?
- **Scalability**: How well does it handle increased load?
- **Responsiveness**: How quickly does the user perceive results?
- **Resource usage**: How efficiently does it use CPU, memory, network, and I/O?
- **Throughput**: How many operations can it handle per unit time?
- **Latency**: What is the end-to-end delay for operations?
- **Production readiness**: Can this system survive real-world traffic without falling over?

---

## Review Areas

### 1. Application Architecture

#### 1.1 Unnecessary Coupling
- Are components tightly coupled, preventing independent scaling?
- Does a change in one module force changes in unrelated modules?
- Is there "temporal coupling" — must operation A always complete before operation B starts, even though they're independent?

#### 1.2 Expensive Abstractions
- Are there abstraction layers that add overhead without providing value?
- Are there dynamic dispatch, proxy wrappers, or decorator chains on hot paths?
- Are there virtual method calls or heavy polymorphic patterns in performance-critical code?

#### 1.3 Blocking Operations
- Are there synchronous I/O operations (file reads, network calls, database queries) on the main thread?
- Are there `sync` method calls in async contexts (e.g., `readFileSync` in an async route handler)?
- Are CPU-bound operations blocking the event loop?

#### 1.4 Synchronous Code in Async Paths
- Are there synchronous operations that could be asynchronous?
- Are there `fs.readFileSync`, `crypto.randomBytesSync`, or similar in request handlers?
- Are there tight loops that process large datasets synchronously?

#### 1.5 Inefficient Module Boundaries
- Do modules communicate through heavy serialization (e.g., passing large objects through message queues unnecessarily)?
- Are micro-service boundaries drawn in ways that cause excessive network round-trips?
- Could a simpler in-process call replace a cross-service call?

#### 1.6 Serialization Overhead
- Are large objects serialized and deserialized repeatedly?
- Is JSON parsing/serialization happening on every request to external services?
- Could a binary format (Protobuf, MessagePack) improve throughput on high-volume paths?

#### 1.7 Excessive Object Creation
- Are objects created in tight loops that could be reused?
- Is there unnecessary allocation in request-scoped code?
- Are large temporary objects created and discarded rapidly, causing GC pressure?

#### 1.8 Memory Allocation Patterns
- Are there allocation hot-spots (many small objects created in loops)?
- Are large buffers allocated and freed frequently?
- Could object pooling reduce GC pressure?

---

### 2. NestJS Performance

#### 2.1 Dependency Injection Usage
- Are providers scoped correctly? Default singleton is almost always right.
- Are there request-scoped providers that could be singletons?
- Are there providers injected but never used (dead weight at initialization)?

#### 2.2 Singleton vs Transient Providers
- Are all service/repository providers singletons by default?
- If transient or request-scoped providers exist, are they justified?
- Is state stored in a way compatible with singleton scope?

#### 2.3 Request-Scoped Providers
- Are request-scoped providers (`@Injectable({ scope: Scope.REQUEST })`) necessary?
- Each request-scoped provider creates a new instance per request, increasing allocation and GC pressure.
- Can request-scoped data be passed via request object instead?

#### 2.4 Middleware Performance
- Are middleware functions lightweight?
- Are there middleware that perform heavy computation or I/O on every request?
- Could middleware be scoped to specific routes instead of globally applied?

#### 2.5 Interceptors
- Are interceptors doing expensive work on every response?
- Are there interceptors that copy or transform large response bodies unnecessarily?
- Could response transformation be done lazily or conditionally?

#### 2.6 Guards
- Are guards that perform database queries on every request?
- Could guard results be cached (e.g., role/permission lookups that rarely change)?

#### 2.7 Pipes
- Are custom pipes doing expensive validation or transformation on every request?
- Are validation pipes parsing and validating the entire request body when only a subset is needed?

#### 2.8 Exception Filters
- Are exception filters doing heavy logging or serialization that could slow error responses?

#### 2.9 Validation Cost
- Is validation happening multiple times on the same data (e.g., pipe + service-level validation)?
- Are class-validator decorators used with `enableDebugMessages` or similar in production?
- Could validation be skipped for trusted internal calls?

#### 2.10 Module Initialization
- Are all modules eagerly loaded at startup?
- Could some modules be lazy-loaded?
- Are there heavy imports at module level that could be deferred?

---

### 3. TypeScript / JavaScript Performance

#### 3.1 Unnecessary Copying
- Are arrays or objects being spread (`...`) or `Object.assign`ed in hot paths?
- Is `Array.map`/`filter`/`reduce` chained into multiple passes when a single loop would suffice?
- Are there defensive copies that aren't actually needed?

#### 3.2 Expensive Array Operations
- Are arrays searched with `indexOf`/`includes`/`find` in loops (O(n²))?
- Could a `Set` or `Map` replace an array for membership checks?
- Are large arrays sorted or filtered repeatedly?

#### 3.3 Deep Cloning
- Is `JSON.parse(JSON.stringify(obj))` used for cloning? This is slow and loses types.
- Are there deep clone operations in request handlers?
- Could a shallow copy or immutable pattern replace deep cloning?

#### 3.4 Recursion
- Are recursive functions used on data of unbounded depth?
- Could recursion cause stack overflow (Node.js default stack limit ~12k frames)?
- Could the algorithm be implemented iteratively?

#### 3.5 Large Loops
- Are there synchronous loops processing tens of thousands of items?
- Could large loops be batched, streamed, or offloaded to worker threads?
- Are there operations inside loops that could be moved outside (hoisted)?

#### 3.6 Repeated Calculations
- Are the same computations performed multiple times with the same inputs?
- Could memoization, caching, or hoisting eliminate redundant work?
- Are there repeated `new Date()`, `moment()`, or `uuid()` calls that could be reused?

#### 3.7 Unnecessary Promises
- Are there `await` on non-promise values (creates unnecessary microtask)?
- Are Promises created but not returned or awaited?
- Are there `new Promise((resolve) => { ... sync code ... resolve() })` that could be synchronous?

#### 3.8 Async Overhead
- Is `await` used in loops where iterations could be parallel?
- Are there `await` chains that are strictly sequential when they could be concurrent?
- Are async functions used for purely synchronous operations?

---

### 4. MongoDB

#### 4.1 Indexes
- Are all query patterns covered by indexes?
- Run through every `find()`, `findOne()`, `aggregate()`, `count()`, `sort()` — does each have a supporting index?
- Are there unused indexes (monitor with `$indexStats`)?

#### 4.2 Compound Indexes
- Are compound indexes ordered correctly: equality fields first, then sort fields, then range fields?
- Do indexes support both the query filter and the sort order to avoid in-memory sorts?

#### 4.3 Aggregation Efficiency
- Does every aggregation pipeline start with `$match` or `$limit` to reduce document flow?
- Are `$lookup` stages using indexed foreign fields?
- Are `$unwind` stages operating on large arrays?
- Could `$facet` replace multiple separate aggregation runs?
- Are `$group` stages causing the pipeline to load the entire collection into memory?

#### 4.4 Query Plans
- Are there queries with slow `executionStats` (large `totalDocsExamined` vs `nReturned` ratio)?
- Are there `SORT` stages without an index supporting them?
- Are there `COLLSCAN` operations in queries that should use indexes?

#### 4.5 Collection Scans
- Are there any queries that trigger full collection scans?
- Are there regex queries with leading wildcards (`/^pattern/` is OK, `/pattern/` is not)?

#### 4.6 Projections
- Are queries using `.select()` or projection to return only needed fields?
- Are large documents being returned from queries when only 2-3 fields are needed?
- Are unneeded fields (like `__v`) being explicitly excluded?

#### 4.7 Pagination
- Which pagination method is used: offset-based or cursor-based?
- For offset pagination with large offsets, is there a performance issue (MongoDB still scans all skipped docs)?
- Could cursor-based pagination improve performance for deep pages?
- Are `countDocuments` queries optimized with indexes?

#### 4.8 `skip()` Usage
- Is `skip()` used with large page numbers, causing the database to scan and discard many documents?
- Consider `{ _id: { $gt: lastSeenId } }` instead of `skip()` for large datasets.

#### 4.9 `limit()` Usage
- Is there a maximum limit enforced to prevent abuse?
- Is limit applied at the query level or after fetching all results?

#### 4.10 Lean Queries
- Are read-only queries using `.lean()` to skip Mongoose document hydration?
- Are there queries that hydrate Mongoose documents when only plain JavaScript objects are needed?
- Each hydrated Mongoose document carries significant overhead (change tracking, getters/setters, virtuals).

#### 4.11 Sorting
- Are sort operations supported by indexes?
- Are there in-memory sorts on large result sets?

#### 4.12 Transactions
- Are transactions used where simpler atomic operations would work?
- Are transactions holding locks for longer than necessary?
- Could `$inc`, `$push`, `$addToSet` replace read-modify-write patterns that need transactions?

#### 4.13 N+1 Queries
- Are there loops that execute a query on each iteration?
- Could `$in`, `$lookup`, or batch loading eliminate N+1 patterns?
- Use MongoDB's `explain()` to verify actual query count.

---

### 5. API Performance

#### 5.1 Payload Sizes
- Are API responses returning more data than the client needs?
- Could response fields be trimmed with projections or sparse DTOs?
- Are large lists returned without pagination?

#### 5.2 Compression
- Is gzip or Brotli compression enabled on API responses?
- Are large JSON payloads compressed before transmission?

#### 5.3 Pagination
- Do list endpoints return all results by default?
- Is there a default page size that is too large?
- Is pagination missing on endpoints that return lists?

#### 5.4 Filtering
- Can clients filter results server-side to reduce data transfer?
- Are filters applied at the database level or after fetching all results?

#### 5.5 Response Serialization
- Is `class-transformer` or custom serialization happening on every response?
- Are there expensive transformations in `@SerializeOptions` or `@UseInterceptors(ClassSerializerInterceptor)`?

#### 5.6 Caching
- Are there endpoints returning the same data on every request?
- Could `Cache-Control`, `ETag`, or `Last-Modified` headers reduce redundant requests?
- Could responses be cached in Redis or in-memory for a short TTL?

#### 5.7 Duplicate API Calls
- Are the same API calls made multiple times within a single request flow?
- Could results be batched or deduplicated?

---

### 6. Memory Usage

#### 6.1 Memory Leaks
- Are event listeners registered but never removed?
- Are WebSocket connections accumulated without cleanup on disconnect?
- Are closures capturing large objects that can't be garbage collected?
- Are `setInterval` / `setTimeout` callbacks preventing garbage collection of their scope?

#### 6.2 Retained Objects
- Are there global caches, maps, or arrays that grow without bound?
- Are there object references held in module-level variables that accumulate over time?
- Are singletons holding per-request data that is never released?

#### 6.3 Large Arrays
- Are large arrays held in memory for extended periods?
- Could arrays be processed as streams instead of loaded entirely?

#### 6.4 Unnecessary Buffering
- Are entire request/response bodies buffered in memory?
- Could streaming be used for large file uploads/downloads?
- Are large CSV/Excel files loaded entirely into memory before processing?

#### 6.5 Cache Growth
- Are in-memory caches bounded (LRU, TTL, max size)?
- Could unbounded caches cause the process to run out of memory?

#### 6.6 Event Listeners
- Are event emitters accumulating listeners over time?
- Are max listeners set (`emitter.setMaxListeners(n)`) to prevent warnings, or as a band-aid for leaks?

#### 6.7 Timers
- Are `setInterval` timers cleared when no longer needed?
- Could `setInterval` callbacks overlap if the callback takes longer than the interval?

#### 6.8 Streams
- Are streams properly drained and destroyed after use?
- Are there backpressure issues (writable stream faster than readable, or vice versa)?
- Are `highWaterMark` values tuned for the workload?

---

### 7. CPU

#### 7.1 Heavy Computations
- Are CPU-intensive operations in the request path (e.g., complex calculations, encryption, compression)?
- Could they be deferred to background jobs, worker threads, or cached?

#### 7.2 Repeated Parsing
- Is the same string/JSON/XML parsed multiple times in a request flow?
- Could parsed results be cached per request?

#### 7.3 Regex Usage
- Are regex patterns compiled inside loops?
- Are there catastrophic backtracking patterns (nested quantifiers)?
- Could simple string operations (`includes`, `startsWith`, `split`) replace regex?

#### 7.4 Nested Loops
- Are there nested loops with O(n²) or worse complexity?
- Could the inner loop be replaced with a `Map` or `Set` lookup?

#### 7.5 Synchronous Crypto
- Are `crypto.createHash()`, `crypto.pbkdf2Sync()` or similar called synchronously?
- Are crypto operations blocking the event loop?

#### 7.6 Expensive JSON Operations
- Is `JSON.parse()`/`JSON.stringify()` called on large objects in hot paths?
- Could a streaming JSON parser reduce latency for large payloads?

---

### 8. Concurrency

#### 8.1 Promise.all Opportunities
- Are there sequential `await` calls that could run in parallel?
```typescript
// Sequential (slow)
const a = await fetchA();
const b = await fetchB();

// Parallel (fast)
const [a, b] = await Promise.all([fetchA(), fetchB()]);
```

#### 8.2 Sequential Async Operations
- Are there loops with `await` inside them that could be parallelized?
- Could `Promise.allSettled` be used instead of `Promise.all` where partial failure is acceptable?

#### 8.3 Race Conditions
- Are there check-then-act patterns that need locking?
- Are there concurrent writes to the same document that could cause data loss?

#### 8.4 Worker Threads
- Are there CPU-bound operations that could be offloaded to worker threads?
- Does the project use `worker_threads` for parallel processing of large datasets?

#### 8.5 Queues
- Are there synchronous processing paths that should use a queue?
- Could a background job queue (Bull/BullMQ) smooth out traffic spikes for expensive operations?

---

### 9. Caching

#### 9.1 Redis Opportunities
- Are there database queries that return the same results repeatedly?
- Could Redis cache reduce database load for read-heavy endpoints?
- Are cache keys structured for efficient invalidation?

#### 9.2 In-Memory Caching
- Could frequently accessed, rarely changed data be cached in process memory?
- Is there a caching library used (e.g., `node-cache`, `lru-cache`) with bounded size?

#### 9.3 HTTP Caching
- Are static or semi-static responses using `Cache-Control` headers?
- Could CDN caching reduce server load?

#### 9.4 MongoDB Query Caching
- Is MongoDB's built-in query plan cache being leveraged?
- Are queries using `hint()` to skip plan selection overhead for known query patterns?

#### 9.5 Prompt Caching
- If AI is used, are system prompts cached by the provider (e.g., Anthropic prompt caching)?
- Are common user prompts cached to avoid redundant AI calls?

#### 9.6 AI Response Caching
- Are identical AI queries returning cached results instead of calling the LLM again?
- Could embedding lookups be cached with a TTL?

---

### 10. AI Performance

If the codebase includes AI components, review these additionally.

#### 10.1 Unnecessary Model Calls
- Is the AI model called when a simpler rule-based system would suffice?
- Are there redundant calls where the answer hasn't changed?
- Could classification be done with a cheaper model before escalating to an expensive one?

#### 10.2 Repeated Prompts
- Are identical or near-identical prompts sent to the AI model?
- Could prompt caching reduce cost and latency?

#### 10.3 Prompt Length
- Are prompts unnecessarily long (including excessive context)?
- Are few-shot examples included every time when they could be cached?
- Could prompts be trimmed to essential instructions only?

#### 10.4 Batching
- Are embedding generation calls batched?
- Could multiple independent AI tasks be queued and processed in batch?

#### 10.5 Retries
- Are retries implemented with exponential backoff and jitter?
- Are retries causing cascading load during provider outages?

#### 10.6 Streaming
- Is streaming used when the user expects incremental results (chat, long generations)?
- Are non-streaming responses blocking the user from seeing partial results?

#### 10.7 Token Waste
- Are response tokens trimmed unnecessarily (generating verbose output then truncating)?
- Is conversation history growing unbounded, increasing cost per turn?
- Could older messages be summarized to keep context within limits?

#### 10.8 Image Generation Batching
- If image generation is used, are requests batched into a single API call?

#### 10.9 Provider Switching
- Are there failover mechanisms when the primary AI provider has high latency?
- Could a faster/cheaper provider handle certain request types?

---

### 11. Network

#### 11.1 Duplicate Requests
- Are the same external API calls made multiple times within a single request?
- Could results be cached per-request?

#### 11.2 Connection Pooling
- Are database connections pooled?
- Are HTTP connections to external services using `keepAlive` and connection pooling?

#### 11.3 Retries
- Are retries causing additional network load during failures?
- Is exponential backoff with jitter implemented?

#### 11.4 HTTP Keep-Alive
- Are outbound HTTP requests using connection reuse?
- Is `agent: new https.Agent({ keepAlive: true })` configured for axios/fetch?

#### 11.5 Timeout Handling
- Are there requests without timeouts that could hang indefinitely?
- Are timeouts set appropriately (not too short causing false failures, not too long causing resource exhaustion)?

---

### 12. Logging

#### 12.1 Excessive Logging
- Are high-traffic endpoints logging every request (log volume can exceed request processing)?
- Are large data structures (full request bodies, large responses) logged?
- Could log sampling reduce volume?

#### 12.2 Synchronous Logging
- Is logging blocking the request path?
- Could logs be written asynchronously or batched?

#### 12.3 Large Payload Logging
- Are full request/response bodies logged, including large payloads?
- Could logs be truncated or structured to extract only essential fields?

---

### 13. Deployment

#### 13.1 Docker Optimization
- Is the Docker image large, increasing cold start time?
- Are multi-stage builds used to minimize image size?
- Are `.dockerignore` files excluding unnecessary files (node_modules, .git, test files)?

#### 13.2 Environment Configuration
- Are production settings optimized (Node.js `NODE_ENV=production`, memory limits, GC flags)?
- Is clustering enabled with `--max-old-space-size` and `--max-semi-space-size` tuned?

#### 13.3 Startup Time
- How long does the application take to start?
- Are there heavy imports or module initializations that could be deferred?

#### 13.4 Graceful Shutdown
- Is SIGTERM handled to drain connections and finish in-flight requests?
- Are there open handles preventing the process from exiting?

#### 13.5 Clustering
- Is the application using all available CPU cores?
- Could Node.js cluster mode or PM2 cluster mode improve throughput?

#### 13.6 Horizontal Scaling
- Is the application stateless so it can scale horizontally?
- Are sessions stored externally (Redis, database) or in-process?

---

## Report Format

Produce the final review as a structured report with findings grouped by severity.

### Critical Performance Issues

Issues that will cause outages, data loss, or complete unresponsiveness under load.

- Memory leaks that crash the process
- Blocking the event loop on every request
- N+1 queries on every page load
- Missing indexes on primary query patterns
- Unbounded cache growth

### High Impact Improvements

Issues that significantly degrade performance for every user under moderate load.

- Expensive operations in request path that could be cached
- Missing `.lean()` on read queries
- Sequential `await` of independent async operations
- Large payloads without pagination
- Inefficient aggregation pipelines

### Medium Improvements

Issues that degrade performance at scale or under specific conditions.

- Object creation in hot paths
- Missing projections on queries
- Synchronous operations that could be async
- Redundant validation or transformation

### Micro Optimizations

Minor improvements with small but measurable impact.

- String concatenation in loops
- Unnecessary spreads/copies
- Regex compilation in hot paths
- Inefficient data structure choices

### Estimated Performance Gains

For each issue, estimate the expected improvement:
- **Latency**: e.g., "Reduces p95 response time by ~40%"
- **Throughput**: e.g., "Increases requests/second by 2x"
- **Cost**: e.g., "Reduces AI API costs by ~30%"
- **Resource usage**: e.g., "Reduces memory by ~200MB under load"

---

## Finding Format

Every finding should follow this structure:

```
### [Finding Title]

- **Severity**: Critical | High | Medium | Micro
- **Location**: `filepath.ts:line-number`
- **Category**: [Section from this document, e.g., "4.10 Lean Queries"]

**Explanation**:
[What the performance issue is, in plain language.]

**Root Cause**:
[Why this pattern exists — missing knowledge, premature optimization, legacy code, etc.]

**Expected Impact**:
[What degrades and under what conditions — e.g., "Every page load triggers 37 database queries instead of 1."]

**Suggestion**:
[What to do instead.]

**Implementation**:
\`\`\`typescript
// Before
...

// After
...
\`\`\`
```

---

## Guiding Principles

- **Never recommend premature optimization**. Only flag issues with real, measurable impact.
- **Always balance readability with performance**. A 2% speedup at the cost of unmaintainable code is not worth it.
- **Prefer architectural improvements over micro-optimizations**. Fix the N+1 query before worrying about `const` vs `let`.
- **Preserve existing coding standards**. Match the project's conventions as described in UNIVERSAL_ENGINEERING.md and NESTJS_ARCHITECTURE.md.

---

*End of Performance Review Protocol*
