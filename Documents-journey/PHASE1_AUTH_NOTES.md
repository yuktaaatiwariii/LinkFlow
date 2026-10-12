# LinkFlow — Phase 1: Authentication + Users Notes

## A. What Was Implemented

In this phase, we completed **Phase 1: Authentication + Users** for the LinkFlow backend:
- **User Persistence Model**: Added a Prisma `User` model with `id` (CUID), unique `email`, `passwordHash`, `createdAt`, and `updatedAt`.
- **Database Migration**: Created and applied migration `20261012143402_add_user_authentication` to the Neon PostgreSQL database without disturbing the existing `Link` table or data.
- **Password Hashing**: Implemented secure password hashing with `bcrypt` (10 salt rounds). Plaintext passwords are never persisted or returned.
- **Email Normalization**: Automated trimming and lowercase normalization on all incoming emails (in both validation DTOs and service business logic).
- **User Registration (`POST /auth/register`)**: Validates input syntax (email format, password min length 8, max length 100), prevents duplicate accounts with HTTP 409 Conflict responses, creates the user, issues a signed JWT, and returns a safe user profile (without `passwordHash`).
- **User Login (`POST /auth/login`)**: Authenticates users using normalized email and bcrypt hash comparison. Rejects incorrect credentials with generic HTTP 401 Unauthorized messages to avoid enumeration attacks. Returns a signed JWT.
- **Current User Profile (`GET /auth/me`)**: Protected with Passport JWT Strategy and `JwtAuthGuard`. Validates Bearer token signature and expiry, returning the authenticated user's safe public profile (`id`, `email`, `createdAt`, `updatedAt`).
- **Configuration & Security Guardrails**: Global `ValidationPipe` with whitelist and payload transformation; fails fast if `JWT_SECRET` is missing.
- **Preserved Existing Endpoints**: Verified that existing root (`GET /`) and database health check (`GET /health`) routes remain fully functional.

---

## B. Files Created

| File Path | Purpose |
| :--- | :--- |
| `backend/prisma/migrations/20261012143402_add_user_authentication/migration.sql` | SQL migration that creates the `"User"` table and its unique email index on Neon PostgreSQL. |
| `backend/src/users/users.service.ts` | Service handling database operations for the `User` model (`create`, `findByEmail`, `findById`). |
| `backend/src/users/users.module.ts` | NestJS module exporting `UsersService` and importing `PrismaModule`. |
| `backend/src/users/users.service.spec.ts` | Unit tests for `UsersService` with mocked `PrismaService`. |
| `backend/src/auth/dto/register.dto.ts` | DTO validating registration requests (valid email, minimum 8 characters password, normalization). |
| `backend/src/auth/dto/login.dto.ts` | DTO validating login requests (valid email, required password, normalization). |
| `backend/src/auth/guards/jwt-auth.guard.ts` | NestJS guard extending Passport's JWT authentication guard to protect private routes. |
| `backend/src/auth/strategies/jwt.strategy.ts` | Passport JWT strategy to extract Bearer tokens, verify signatures using `JWT_SECRET`, and validate user identity. |
| `backend/src/auth/strategies/jwt.strategy.spec.ts` | Unit tests for `JwtStrategy` verifying token validation, missing secret safety, and user lookup. |
| `backend/src/auth/auth.service.ts` | Business logic for password hashing, credential verification, duplicate prevention, and JWT issuance. |
| `backend/src/auth/auth.service.spec.ts` | Unit tests for `AuthService` covering registration, duplicate rejection, login, and error safety. |
| `backend/src/auth/auth.controller.ts` | HTTP controller routing `/auth/register`, `/auth/login`, and `/auth/me`. |
| `backend/src/auth/auth.controller.spec.ts` | Unit tests for `AuthController`. |
| `backend/src/auth/auth.module.ts` | NestJS module integrating `UsersModule`, `PassportModule`, `JwtModule`, and authentication providers. |
| `backend/test/auth.e2e-spec.ts` | End-to-end integration test suite verifying live endpoints, database integrity, and security policies. |
| `backend/PHASE1_AUTH_NOTES.md` | This documentation file. |

---

## C. Files Modified

| File Path | Description of Changes | Rationale |
| :--- | :--- | :--- |
| `backend/prisma/schema.prisma` | Added `User` model with `id`, `email`, `passwordHash`, `createdAt`, `updatedAt`. | Defines user authentication schema while keeping the existing `Link` model untouched. |
| `backend/src/app.module.ts` | Added `UsersModule` and `AuthModule` to imports. | Wires the new authentication sub-systems into the root NestJS application context. |
| `backend/src/main.ts` | Registered global `ValidationPipe` with `{ whitelist: true, forbidNonWhitelisted: true, transform: true }`. | Ensures DTO validation, striping of unexpected payload properties, and automatic email transformations. |
| `backend/jest.config.ts` | Configured `preset: 'ts-jest/presets/default-esm'` and `useESM: true` with `module: 'ESNext'`. | Resolved Jest Node ESM module resolution when executing TypeScript tests with NestJS 12. |
| `backend/test/jest-e2e.json` | Configured `preset: 'ts-jest/presets/default-esm'` and `useESM: true` with `module: 'ESNext'`. | Enables Jest ESM test runner for end-to-end tests. |
| `backend/src/app.controller.spec.ts` | Provided mock `PrismaService` for `AppController` root test. | Fixed dependency injection in existing controller unit test which broke after `/health` was added previously. |
| `backend/.env` | Added `JWT_SECRET` and `JWT_EXPIRES_IN=7d`. | Provides cryptographically strong secret and explicit token expiry (gitignored). |

---

## D. Dependencies

Added the following production and development packages:
- `bcrypt` & `@types/bcrypt`: Industry-standard password hashing library using Blowfish cipher with configurable work factor.
- `@nestjs/jwt`: NestJS wrapper around jsonwebtoken to issue and verify JWTs asynchronously.
- `@nestjs/passport` & `passport`: Authentication middleware framework for Node.js.
- `passport-jwt` & `@types/passport-jwt`: Passport strategy for authenticating with a JSON Web Token.
- `class-validator`: Decorator-based property validation for request DTOs.
- `class-transformer`: Allows deserializing and normalizing incoming request objects (e.g. trimming and lowercasing email).

All packages are compatible with Node.js 22, NestJS 12, and TypeScript.

---

## E. Database Changes

### New User Model
```prisma
model User {
  id           String   @id @default(cuid())
  email        String   @unique
  passwordHash String
  createdAt    DateTime @default(now())
  updatedAt    DateTime @updatedAt
}
```

### Applied Migration
- **Migration Name**: `20261012143402_add_user_authentication`
- **Generated SQL**:
  ```sql
  -- CreateTable
  CREATE TABLE "User" (
      "id" TEXT NOT NULL,
      "email" TEXT NOT NULL,
      "passwordHash" TEXT NOT NULL,
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL,

      CONSTRAINT "User_pkey" PRIMARY KEY ("id")
  );

  -- CreateIndex
  CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
  ```
- **Preservation of Existing Data**: The migration solely executed `CREATE TABLE "User"` and `CREATE UNIQUE INDEX "User_email_key"`. The existing `"Link"` table was completely untouched and no data was deleted or altered.

---

## F. API Reference

### 1. Register User
- **Method & Path**: `POST /auth/register`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "student@example.com",
    "password": "StrongPassword123"
  }
  ```
- **Success Response (`201 Created`)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cmv5dj0g40000tm7gcs7yl97m",
      "email": "student@example.com",
      "createdAt": "2026-10-12T14:55:15.459Z",
      "updatedAt": "2026-10-12T14:55:15.459Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Invalid email format, password shorter than 8 characters, or unexpected fields.
  - `409 Conflict`: Email is already registered (`{"message": "An account with this email already exists."}`).

### 2. Login
- **Method & Path**: `POST /auth/login`
- **Authentication**: None (Public)
- **Request Body**:
  ```json
  {
    "email": "student@example.com",
    "password": "StrongPassword123"
  }
  ```
- **Success Response (`200 OK`)**:
  ```json
  {
    "accessToken": "eyJhbGciOiJIUzI1NiIsIn...",
    "user": {
      "id": "cmv5dj0g40000tm7gcs7yl97m",
      "email": "student@example.com",
      "createdAt": "2026-10-12T14:55:15.459Z",
      "updatedAt": "2026-10-12T14:55:15.459Z"
    }
  }
  ```
- **Error Responses**:
  - `400 Bad Request`: Missing email or password.
  - `401 Unauthorized`: Invalid email or password (`{"message": "Invalid email or password."}`).

### 3. Get Current User Profile
- **Method & Path**: `GET /auth/me`
- **Authentication**: Bearer Token required (`Authorization: Bearer <token>`)
- **Request Body**: None
- **Success Response (`200 OK`)**:
  ```json
  {
    "id": "cmv5dj0g40000tm7gcs7yl97m",
    "email": "student@example.com",
    "createdAt": "2026-10-12T14:55:15.459Z",
    "updatedAt": "2026-10-12T14:55:15.459Z"
  }
  ```
- **Error Responses**:
  - `401 Unauthorized`: Missing, expired, malformed, or forged JWT.

---

## G. Test Report

### Automated Test Results: 38/38 Passed (100%)

| Test Category | Test Case | Status | Evidence / Notes |
| :--- | :--- | :--- | :--- |
| **Build & Tooling** | TypeScript compilation (`nest build`) | **PASS** | Exited 0 with zero compile errors. |
| | Prisma schema validation (`prisma validate`) | **PASS** | Valid schema reported. |
| | Prisma migration (`prisma migrate dev`) | **PASS** | Migration `20261012143402_add_user_authentication` applied. |
| | Prisma Client generation (`prisma generate`) | **PASS** | Client generated to `.node_modules/@prisma/client`. |
| | Linter check (`oxlint`) | **PASS** | 0 errors, 0 warnings across 22 files. |
| **Route Preservation** | Existing `GET /` route returns 200 "Hello World!" | **PASS** | Verified in both unit and e2e test suites. |
| | Existing `GET /health` route returns 200 `{ status: 'ok', database: 'connected' }` | **PASS** | Live query verified in e2e tests and manual call. |
| **Registration** | Valid registration returns 201 + safe user + token | **PASS** | Verified in unit and e2e tests. |
| | Password stored in DB is hashed with bcrypt, not plaintext | **PASS** | Verified in `test/auth.e2e-spec.ts` (starts with `$2`). |
| | Duplicate email rejected with 409 Conflict | **PASS** | Verified in unit and e2e tests. |
| | Email normalization (trim & lowercase) prevents casing duplicates | **PASS** | `TEST.USER@example.com` correctly conflicts with `test.user@example.com`. |
| | Invalid email syntax rejected with 400 Bad Request | **PASS** | Verified with class-validator `@IsEmail()`. |
| | Missing password rejected with 400 Bad Request | **PASS** | Verified with class-validator `@IsNotEmpty()`. |
| | Password shorter than 8 chars rejected with 400 Bad Request | **PASS** | Verified with class-validator `@MinLength(8)`. |
| | Response payload never leaks password or passwordHash | **PASS** | Verified: both omitted from response objects. |
| **Login** | Valid credentials return 200 + safe user + valid JWT | **PASS** | Verified in unit and e2e tests. |
| | Incorrect password returns 401 Unauthorized | **PASS** | Verified in unit and e2e tests. |
| | Non-existent email returns identical 401 message | **PASS** | Verified: same generic message prevents account enumeration. |
| | Missing credentials rejected with 400 Bad Request | **PASS** | Verified in e2e test suite. |
| **Current User (`/auth/me`)** | Request with valid token returns safe user | **PASS** | Verified in unit and e2e tests. |
| | Request without token returns 401 Unauthorized | **PASS** | Verified in e2e test suite. |
| | Request with malformed token returns 401 Unauthorized | **PASS** | Verified in e2e test suite. |
| | Request with forged / modified signature returns 401 | **PASS** | Verified with forged token in e2e test suite. |
| | Request with expired token returns 401 | **PASS** | Verified with negative expiry token in e2e test suite. |

---

## H. Commands Executed

1. `npm test` — Succeeded (5 test suites passed, 20 unit tests passed).
2. `npm run test:e2e` — Succeeded (2 test suites passed, 18 integration tests passed).
3. `npm run lint` — Succeeded (0 warnings, 0 errors).
4. `npm run build` — Succeeded (zero compilation errors).
5. `npx prisma validate` — Succeeded.
6. `npx prisma migrate dev --name add_user_authentication` — Succeeded.
7. `npx prisma generate` — Succeeded.

---

## I. Security Review

1. **Password Storage**: Passwords are never stored in plaintext. Passwords are salted and hashed using `bcrypt` with 10 salt rounds before hitting the database.
2. **Timing & Enumeration Attacks**: Login failures for both non-existent users and incorrect passwords return the identical HTTP 401 response: `"Invalid email or password."`. This prevents attackers from enumerating valid registered emails.
3. **Payload Sanitization**: Global `ValidationPipe` is configured with `whitelist: true` and `forbidNonWhitelisted: true`, preventing mass assignment attacks and ignoring/rejecting malicious payload injection.
4. **Secret Management**:
   - `JWT_SECRET` is read exclusively from environment variables via `ConfigService`.
   - The application fails safely at startup if `JWT_SECRET` is missing.
   - `.env` is ignored by `.gitignore` at both repository root and backend directory levels.
   - No database URLs, passwords, hashes, or secrets are printed to output or returned by endpoints.
5. **Token Claims**: JWT payload contains only public claims (`sub`: userId, `email`: normalized email). No sensitive credentials or hashes are included in token claims.

---

## J. What I Learned (Student Guide)

### 1. What Authentication Means
Authentication is the process of verifying **who a user is**. When a user provides credentials (such as an email and password), the server verifies that the claim of identity is authentic.

### 2. What Password Hashing Does & Why Plaintext is Forbidden
- A password hash is a one-way mathematical transformation. You can convert `"Secret123"` into `"$2b$10$xyz..."`, but it is mathematically infeasible to reverse that hash back into `"Secret123"`.
- If a database storing plaintext passwords is breached, every user's password is stolen immediately. Users often reuse passwords across multiple services (email, banking, etc.). By storing only salted cryptographic hashes (like bcrypt), attackers cannot recover the raw passwords.

### 3. What JSON Web Tokens (JWTs) Are
A JWT is a compact, URL-safe token with three parts:
- **Header**: Algorithm and token type.
- **Payload**: Public data (claims) such as `sub` (the user ID) and `email`.
- **Signature**: A cryptographic signature generated by hashing the header and payload with a secret key (`JWT_SECRET`) that only our server knows.
The server can verify that the token was not altered by anyone without having to look up a session in a session store on every request.

### 4. How Protected Routes Work
1. When a client sends a request to `/auth/me`, it includes `Authorization: Bearer <token>`.
2. The `JwtAuthGuard` intercepts the request before it reaches the controller handler.
3. Passport's `JwtStrategy` verifies the cryptographic signature and expiration time.
4. If valid, `JwtStrategy.validate()` looks up the user and attaches the user object to `req.user`.
5. If invalid or missing, it immediately rejects the request with HTTP 401 Unauthorized.

### 5. What Prisma Does During Registration
1. Prisma translates our TypeScript calls (`prisma.user.create(...)`) into parameterized SQL (`INSERT INTO "User" ...`). Parameterized queries prevent SQL Injection vulnerabilities.
2. By using Prisma's `select` option, we explicitly specify that only `{ id: true, email: true, createdAt: true, updatedAt: true }` are selected and returned from the query, ensuring `passwordHash` never leaves the database layer during registration.

### 6. How NestJS Controllers, Services, DTOs, and Guards Work Together
- **DTO (Data Transfer Object)**: Defines the incoming contract and validates types and lengths (`@IsEmail()`, `@MinLength(8)`).
- **Controller**: Listens for HTTP requests, maps routes (`/auth/register`, `/auth/login`), and sends back HTTP responses.
- **Guard**: Gatekeeper that checks authorization and permissions before letting requests proceed.
- **Service**: Handles business logic (hashing passwords, token issuance, database queries) so that controllers remain lightweight and reusable.

---

## K. Remaining Work (Future Phases)

The following features were intentionally excluded from Phase 1 per project specifications:
- **Phase 2**: URL shortening functionality, short code generation, click counting, and expiration logic.
- **Relationship between User and Link**: Associating links with their creator user (`userId` foreign key).
- **Advanced Auth Features**: Refresh tokens, email verification, password reset workflows, OAuth (Google/GitHub), two-factor authentication (2FA).
- **Rate Limiting**: Throttling login/register endpoints with Redis/Throttler against brute-force attacks.

---

## L. Git Checkpoint

### Git Status
```
Changes not staged for commit:
	modified:   backend/jest.config.ts
	modified:   backend/package-lock.json
	modified:   backend/package.json
	modified:   backend/prisma/schema.prisma
	modified:   backend/src/app.controller.spec.ts
	modified:   backend/src/app.module.ts
	modified:   backend/src/main.ts
	modified:   backend/test/jest-e2e.json

Untracked files:
	backend/PHASE1_AUTH_NOTES.md
	backend/prisma/migrations/20261012143402_add_user_authentication/
	backend/src/auth/
	backend/src/users/
	backend/test/auth.e2e-spec.ts
```

### Suggested Commit Message
```bash
git add backend/
git commit -m "feat(auth): implement Phase 1 authentication and user management"
```
*(No git commit or push was executed, awaiting explicit user instruction).*
