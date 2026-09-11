# NestJS Architecture Guide

*Everything specific to NestJS: dependency injection, modules, DTOs, services, guards, repositories, MongoDB, logging, testing. Works for any NestJS application.*

> **See also**: [UNIVERSAL_ENGINEERING.md](./UNIVERSAL_ENGINEERING.md) for general engineering principles behind these patterns.

---

## 1. Module Structure

### 1.1 Feature Module Pattern
Every feature is an `@Module()` that imports dependencies, registers controllers and providers, and optionally exports services.

```typescript
@Module({
  imports: [
    MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }]),
    ConfigModule,
  ],
  controllers: [FeatureController],
  providers: [FeatureService, FeatureRepository],
  exports: [FeatureService],
})
export class FeatureModule {}
```

### 1.2 Dynamic Modules
Use `.forRootAsync()` for modules that need async configuration (e.g., `MongooseModule.forRootAsync()` with `ConfigService` injection).

### 1.3 Module Dependencies
- Feature modules import `MongooseModule.forFeature()` to register their schemas.
- Modules import `ConfigModule` to access config in their providers.
- Modules never import other feature modules directly — they import shared modules that export services.

### 1.4 Circular Dependencies
Resolve with `forwardRef(() => Module)`. Prefer extracting shared logic into a separate module.

---

## 2. Dependency Injection

### 2.1 Constructor Injection
All dependencies injected through constructor parameters:

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly repository: FeatureRepository,
    private readonly utility: FeatureUtility,
    private readonly configService: ConfigService,
  ) {}
}
```

### 2.2 Provider Scopes
- **Singleton** (default): one instance for the whole application. Preferred.
- **Request** scope: only when absolutely necessary (e.g., per-request state).

### 2.3 Custom Providers
```typescript
{ provide: APP_FILTER, useClass: HttpExceptionFilter }
```

---

## 3. Controllers

### 3.1 Structure
- One controller per feature module.
- Methods are lean: validate via a `JoiValidationPipe`, attach the request to the DTO, call the service, and return a standardized response.

### 3.2 Controller Method Pattern
Decorated methods receive the raw request (`@Req() req: IRequest`), run validation via `@UsePipes(new JoiValidationPipe(schema))`, attach `req` to the DTO, delegate to the service, and return `AppResponse.success(...)`:

```typescript
import { Body, Controller, Post, Req, UsePipes } from '@nestjs/common';
import { Throttle } from '@nestjs/throttler';
import { IRequest, JoiValidationPipe, AppResponse } from '../common';
import { AuthService } from './auth.service';
import { SignInDto } from './dto/sign-in.dto';
import { signInSchema } from './dto/auth.schemas';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @UsePipes(new JoiValidationPipe(signInSchema))
  async login(@Req() req: IRequest, @Body() loginDto: SignInDto) {
    loginDto.req = req;
    const data = await this.authService.login(loginDto);

    return AppResponse.success('Successfully logged in', 200, data);
  }
}
```

- Import `IRequest` with `import type` when it appears in a decorated signature (required when `isolatedModules` + `emitDecoratorMetadata` are enabled).
- Rate limiting is declared per-route via `@Throttle`; the `ThrottlerGuard` is registered globally as an `APP_GUARD`.

### 3.3 File Upload
Use `@UseInterceptors(FileInterceptor('file'))` from `@nestjs/platform-express`. The file buffer is attached to the DTO and processed by the service.

### 3.4 SSE (Server-Sent Events)
For long-running operations, set SSE headers and pass `res` to the service:

```typescript
res.setHeader('Cache-Control', 'no-cache');
res.setHeader('Connection', 'keep-alive');
res.flushHeaders();
// Service writes 'data: ...\n\n' events via the response object.
```

---

## 4. DTOs (Data Transfer Objects)

### 4.1 Location & Naming
- Live in a `dto/` directory within their module.
- Named: `{Feature}{Action}Dto` — `CreateUserDto`, `FlightAnalysisDto`.
- Multiple related DTOs may share one file.

### 4.2 Validation
Validation is performed with Joi schemas applied through a shared `JoiValidationPipe` at the controller boundary. Each module keeps its schemas in a `dto/{module}.schemas.ts` file and its DTOs in `dto/`:

```typescript
// dto/auth.schemas.ts
import * as Joi from 'joi';

export const loginSchema = Joi.object({
  email: Joi.string().email().required(),
  password: Joi.string().required(),
});
```

```typescript
// dto/sign-in.dto.ts
import { IsEmail, IsNotEmpty, IsString } from 'class-validator';
import type { IRequest } from '../../common';

export class SignInDto {
  @IsEmail()
  email: string;

  @IsString()
  @IsNotEmpty()
  password: string;

  req?: IRequest;   // request attached by the controller
}
```

```typescript
// common/pipes/joi-validation.pipe.ts
import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
import type { ObjectSchema } from 'joi';

@Injectable()
export class JoiValidationPipe implements PipeTransform {
  constructor(private readonly schema: ObjectSchema) {}
  transform(value: unknown): unknown {
    const { error, value: validated } = this.schema.validate(value, {
      abortEarly: false,
      stripUnknown: false,
    });
    if (error) throw new BadRequestException(error.details.map((d) => d.message));
    return validated;
  }
}
```

The DTOs may keep `class-validator` decorators as well; both can coexist. The Joi pipe runs at the route boundary; any global `ValidationPipe` (from `class-validator`) also remains active.

---

## 5. Services

### 5.1 Pattern
Services contain all business logic and orchestrate calls to repositories, utilities, and external services.

Every public method carries a `@Responsibility` JSDoc block explaining its role, followed by `@param` and `@returns` tags. Methods wrap logic in try/catch, attach a `location` to the error (`{ClassName}.{method.name} method`), and call `AppResponse.error(error)`.

Services return **bare data** (the raw payload — an object, array, or primitive). They do **not** wrap the response with `AppResponse.success(...)`; wrapping belongs to the controller layer. Errors are the only path that throws (via `AppResponse.error`).

DTO parameters are **destructured at the service method signature** so the body references the plain fields directly, never the DTO object. The annotation keeps the DTO type: `signUp({ email, password }: SignUpDto)`, and inside the method you use `email` / `password`, not `signUpDto?.email`. Fields are guaranteed present by the Joi validation pipe, so optional chaining is reserved for nullable references (see §5.3), not for destructured DTO fields. The JSDoc `@param` tag names the DTO type it accepts.

```typescript
@Injectable()
export class FeatureService {
  constructor(
    private readonly repository: FeatureRepository,
    private readonly logger = new Logger(FeatureService.name),
  ) {}

  /**
   * @Responsibility: dedicated service for user logout
   *
   * @param deviceFingerprint
   * @returns {Promise<string>}
   */
  async logout(deviceFingerprint: string): Promise<string> {
    try {
      const session = await this.sessionRepository.retrieveSession({
        deviceFingerprint,
      });

      await this.sessionRepository.updateSession(
        { deviceFingerprint },
        { isActive: false },
      );

      return 'logged out \u2705';
    } catch (error) {
      error.location = `UserServices.${this.logout.name} method`;
      AppResponse.error(error);
    }
  }
}
```

### 5.2 Error Propagation
Every method wraps logic in try/catch, attaches a `location` property, and calls `AppResponse.error()`. Regularly rethrow expected/explicit exceptions (`AppException`, `UnauthorizedException`) so their status codes are preserved rather than flattened to a 500.

Narrowing note: because `AppResponse.error` is accessed as a member (`AppResponse.error(...)`), TypeScript does not narrow the preceding nullable value. For references that must remain non-null after a guard, use optional chaining (`user?.field`) for reads and the `value ?? AppResponse.error(...)` rebind pattern for writes.

### 5.3 Optional Chaining
Use optional chaining (`?.`) and nullish coalescing (`??`) for object references across the codebase instead of non-null assertion (`!`). It applies to **nullable object references** — repository results, injected service results, config lookups. Destructured DTO fields are guaranteed by validation and referenced as plain locals (`email`, `password`), with no `?.`. Example:

```typescript
async signIn({ email, password }: SignInDto): Promise<unknown> {
  const existing = await this.userRepository.findByEmail(email); // destructured param → plain local
  const user = existing ?? AppResponse.error({ message: 'Account not found.', status: 404, location });
  const isVerified = user?.isEmailVerified; // optional chaining on a nullable reference
  const ttl = this.configService?.get('TTL') ?? 30; // optional chaining + nullish coalescing
}
```

### 5.4 Utility Files
Every module's utility helpers live in a single per-module `{module}.utility.ts` file colocated inside the feature module — e.g. `auth.utility.ts`, `user.utility.ts`, `flight.utility.ts`. A module gets one utility file; keep it focused on that module's helpers. Shared, cross-cutting utilities may go under `common/utils/`.

```typescript
// auth/auth.utility.ts
import { Injectable } from '@nestjs/common';
import { createHash, randomInt, randomBytes } from 'crypto';

@Injectable()
export class AuthUtility {
  generateOtp(): string {
    return String(randomInt(1000, 10000));
  }

  hash(value: string): string {
    return createHash('sha256').update(value).digest('hex');
  }

  randomToken(): string {
    return randomBytes(32).toString('hex');
  }
}
```

Use `class {Utility}` as an `@Injectable()` provider with **instance methods**, register it in the module's `providers` array, and inject it via the service constructor (e.g. `this.authUtility.hash(...)`). Never call utility methods statically or reference the class directly from a service. This keeps every unit mockable and testable in isolation.

```typescript
// auth/auth.module.ts
providers: [AuthService, TokenService, UserRepository, AuthUtility],
```

```typescript
// auth/auth.service.ts
constructor(
  // ...
  @Inject(AuthUtility) private readonly authUtility: AuthUtility,
) {}
```

---

## 6. Guards (Authentication & Authorization)

### 6.1 Guard Types
| Guard | Header | Action |
|-------|--------|--------|
| `JwtAuthGuard` | `Authorization: Bearer <token>` | Validates token, attaches decoded payload to `request.user` |
| `WorkspaceGuard` | `workspace` (JWT token) | Decodes workspace context → `request.workspace` |
| `RoleGuard` | — | Reads `@Roles()` metadata, checks against `request.user.role` |
| `ApiKeyGuard` | `?apiKey=<base64>` | Base64-decodes API key, used for external integrations |

### 6.2 Composing Guards
```typescript
@UseGuards(JwtAuthGuard, WorkspaceGuard, RoleGuard)
@Roles(Role.RWX_ADMIN, Role.RWX_SUPER_ADMIN)
@Get('/admin-only')
```

### 6.3 Role Decorator
```typescript
export const Roles = (...roles: string[]) => SetMetadata('roles', roles);
```

---

## 7. Repositories

### 7.1 Pattern
Repositories abstract all database interactions. Services never use Mongoose models directly.

```typescript
@Injectable()
export class FeatureRepository {
  constructor(
    @InjectModel(Entity.name) private model: Model<EntityDocument>,
  ) {}

  async create(data: any): Promise<EntityDocument> {
    return this.model.create(data);
  }

  async find(where: PropDataInput): Promise<EntityDocument[]> {
    return this.model.find(where).sort({ createdAt: -1 }).exec();
  }
}
```

### 7.2 Aggregation Pipelines
Complex MongoDB aggregations live in repository methods. They accept parameters and return typed results.

### 7.3 Pagination
```typescript
async paginatedQuery(where: object, batch: number, limit: number) {
  const data = await this.model.find(where)
    .skip((batch - 1) * limit).limit(limit).exec();
  const count = await this.model.countDocuments(where).exec();
  return { data, count };
}
```

---

## 8. MongoDB with Mongoose

### 8.1 Schema Definition
```typescript
@Schema()
export class Entity {
  @Prop({ type: String, required: true }) name: string;
  @Prop({ default: () => moment().utc().toDate(), type: Date }) createdAt: Moment;
}
export const EntitySchema = SchemaFactory.createForClass(Entity);
export type EntityDocument = Entity & Document;
```

### 8.2 Indexes
```typescript
EntitySchema.index({ field1: 1, field2: 1 }, { name: 'my_index' });
```

### 8.3 Registration & Connection
```typescript
// Module registration
MongooseModule.forFeature([{ name: Entity.name, schema: EntitySchema }])

// Root connection (AppModule)
MongooseModule.forRootAsync({
  imports: [ConfigModule],
  inject: [ConfigService],
  useFactory: (config: ConfigService) => ({ uri: config.get('DATABASE_URL') }),
})
```

### 8.4 Timestamps
Use `moment().utc().toDate()` for `createdAt` defaults rather than Mongoose's built-in timestamps.

---

## 9. Logging

### 9.1 Logger Usage
```typescript
private readonly logger = new Logger(ServiceName.name);
```

### 9.2 HTTP Request Logging (Middleware)
Logs method, URL, status, response time, user-agent, and IP on every request.

### 9.3 Exception Logging (Global Filter)
Registered in `AppModule`:
```typescript
{ provide: APP_FILTER, useClass: HttpExceptionFilter }
```

---

## 10. Exception Handling & Response

### 10.1 AppResponse
Centralized response helper:

```typescript
export const AppResponse = {
  success: (message, statusCode, data = {}) => ({
    message, status: true, statusCode, data,
  }),
  error: (err: ErrorResponseI) => {
    throw new AppException(err.message, err.status ?? 500);
  },
};
```

### 10.2 Controller Response Pattern
Controllers wrap the service's bare data payload in `AppResponse.success` and return it (Nest serializes it to JSON):

```typescript
const data = await this.authService.login(loginDto);
return AppResponse.success('Successfully logged in', 200, data);
```

The resulting JSON body is shaped as `{ message, status: true, statusCode, data }`. Errors are thrown via `AppResponse.error(...)` and rendered by the global `HttpExceptionFilter`.

---

## 11. WebSockets

### 11.1 Gateway Setup
```typescript
@WebSocketGateway({ namespace: 'events', cors: { origin: [...], credentials: true } })
export class EventGateway { ... }
```

### 11.2 Authentication
Apply middleware in `afterInit()` using the same JWT service as HTTP guards.

### 11.3 Events
- `@SubscribeMessage('eventName')` for client-to-server.
- `this.server.emit('eventName', payload)` for broadcasts.

---

## 12. Testing

### 12.1 Jest Configuration
```json
{ "testRegex": ".*\\.spec\\.ts$", "testEnvironment": "node",
  "forceExit": true, "detectOpenHandles": true }
```

### 12.2 Unit Tests
- Files named `{module}.service.spec.ts` or `{module}.controller.spec.ts`.
- Mock all injected repositories and utilities.

```typescript
describe('FeatureService', () => {
  let service: FeatureService;
  let mockRepo: { find: jest.Mock };

  beforeEach(async () => {
    mockRepo = { find: jest.fn() };
    const module = await Test.createTestingModule({
      providers: [
        FeatureService,
        { provide: FeatureRepository, useValue: mockRepo },
      ],
    }).compile();
    service = module.get(FeatureService);
  });

  it('should return data when found', async () => {
    mockRepo.find.mockResolvedValue([{ id: '1' }]);
    expect(await service.getData()).toEqual([{ id: '1' }]);
  });
});
```

### 12.3 E2E Tests
Located in `test/`, use `supertest` and a test database.

---

## 13. Task Scheduling (Cron)

```typescript
@Cron(CronExpression.EVERY_HOUR)
async myJob() { ... }
```

Import `ScheduleModule.forRoot()` in `AppModule`. Consider idempotency — jobs may overlap if they run longer than their interval.

---

## 14. Standard Project Setup

### 14.1 Bootstrap
```typescript
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.enableCors();
  app.setGlobalPrefix('api/v2');
  app.use(new HttpLogger().use);
  await app.listen(configService.get('PORT'));
}
```

### 14.2 Config Files
**nest-cli.json**: `{ "sourceRoot": "src", "compilerOptions": { "deleteOutDir": true } }`

**tsconfig.json**: `target: ES2021`, `module: commonjs`, `emitDecoratorMetadata: true`, `experimentalDecorators: true`, `baseUrl: "./"`

### 14.3 ESLint + Prettier
```typescript
// .eslintrc.ts
extends: ['plugin:@typescript-eslint/recommended', 'plugin:prettier/recommended']
rules: { '@typescript-eslint/no-explicit-any': 'off',
         '@typescript-eslint/explicit-function-return-type': 'off' }
```

---

## 15. Integration Patterns

### 15.1 External HTTP Calls
Use `@nestjs/axios` `HttpService`. The `axiosRef` property gives direct Axios access.

### 15.2 File Storage (S3)
Inject S3 client (from `aws-sdk`) into a utility class. Expose `uploadS3()` and `deleteS3()` methods.

### 15.3 Email
Use `nodemailer` with SMTP config from env vars. Store templates as functions returning HTML strings.

### 15.4 SMS
Use `@nestjs/axios` `HttpService` with the provider's API (e.g., Dotgo/Kirusa).
