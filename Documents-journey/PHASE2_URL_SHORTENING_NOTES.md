# LinkFlow — Phase 2: URL Shortening Implementation & Manual Testing Guide

Welcome to the **Phase 2 URL Shortening** implementation guide for **LinkFlow**. This document explains the system design concepts, database decisions, cryptographic Base62 short-code generation algorithm, API usage, and includes a step-by-step Postman testing guide.

---

## 1. System Design & Architectural Concepts

### 1.1 How a Long URL Becomes a Short Code
In a production URL shortener, the system maps long target URLs (e.g. `https://example.com/very/long/path?param=123`) to compact identifiers called **short codes** (e.g. `aB31xZ`). When appended to the server's domain, this creates a short URL: `http://localhost:3000/aB31xZ`.

The lifecycle of creating a shortened URL follows these steps:
1. **Authentication:** The client sends a JWT Bearer token in the `Authorization` header.
2. **Input Validation:** The backend checks that `originalUrl` is an absolute HTTP/HTTPS URL and that any optional `expiresAt` date is strictly in the future.
3. **Short Code Generation:** The service generates a 6-character URL-safe alphanumeric code using cryptographic randomness and Base62 encoding.
4. **Collision Handling & Persistence:** The service attempts to persist the record to PostgreSQL. If another link already holds that short code (triggering Prisma's `P2002` unique constraint error), the service catches the collision and retries with a new code up to a bounded limit (5 attempts).
5. **Ownership Association:** The link is linked via `userId` foreign key to the authenticated user from the verified JWT.
6. **Response Formatting:** The service assembles the complete short URL using the configured `APP_BASE_URL` (defaulting to `http://localhost:3000`) and returns the response.

### 1.2 Base62 Encoding & Alphabet
A short code must be safely transportable inside URLs without percent-encoding (`%20`, `%2F`, etc.).
Base62 uses the 62 alphanumeric ASCII characters:
- Digits `0-9` (10 characters)
- Lowercase English letters `a-z` (26 characters)
- Uppercase English letters `A-Z` (26 characters)

**Combinatorial Capacity:**
For a code length of $L = 6$:
$$\text{Total Combinations} = 62^6 = 56,800,235,584 \approx 56.8 \text{ billion}$$

With $56.8$ billion unique combinations, the collision probability for the first million records is infinitesimal ($\approx 0.00088\%$). Using Node.js's native `crypto.randomBytes()`, we ensure unpredictable codes that cannot be systematically enumerated by attackers.

### 1.3 Why the Database Unique Constraint is Mandatory
In high-concurrency systems, two simultaneous requests could potentially generate the same random code. Checking uniqueness in memory or through a separate `SELECT` query introduces a **Time-of-Check to Time-of-Use (TOCTOU)** race condition.
PostgreSQL enforces uniqueness at the database engine level via `CREATE UNIQUE INDEX "Link_shortCode_key" ON "Link"("shortCode")`. When a conflict occurs:
1. PostgreSQL rejects the second write transaction.
2. Prisma throws a `PrismaClientKnownRequestError` with error code `P2002`.
3. Our `LinksService` catches `P2002`, logs a warning, and immediately attempts another generation up to a max limit of 5 retries.

### 1.4 How JWT Authentication Determines Link Ownership
LinkFlow **never** trusts client-supplied ownership fields like `{ "userId": "..." }` in request bodies. Any unrecognized fields are rejected with `400 Bad Request` by NestJS's `ValidationPipe` with `forbidNonWhitelisted: true`.
Instead:
1. `JwtAuthGuard` intercepts incoming requests and invokes `JwtStrategy`.
2. `JwtStrategy` verifies the JWT signature and extracts `payload.sub` (the user ID).
3. `UsersService.findById(payload.sub)` confirms that the user exists and attaches the sanitized `SafeUser` object to `req.user`.
4. In `LinksController`, `@Request() req` delivers `req.user.id` directly to `LinksService.createLink(req.user.id, dto)`.

### 1.5 Database Schema & The User–Link Relationship
In PostgreSQL via Prisma:
- **One User to Many Links:** A user can own multiple shortened URLs (`links Link[]`).
- **Foreign Key (`userId`):** The `Link` table has a `userId TEXT` column referencing `User(id)` with `onDelete: Cascade`.
- **Index (`Link_userId_idx`):** An index is maintained on `Link(userId)` so querying a user's links (`WHERE "userId" = $1 ORDER BY "createdAt" DESC`) is fast ($O(\log N)$) even with millions of total links.
- **Safe Nullable Migration:** To maintain data integrity without dropping existing records, `userId` is nullable at the database level (`userId String?`), allowing existing links to be preserved safely while requiring authentication for all new Phase 2 creations.

### 1.6 Why Redirect Handling Belongs to Phase 3
Phase 2 strictly implements link management (creation, listing, single-record retrieval, ownership isolation).
The public redirection endpoint (`GET /:shortCode`) involves:
- Public (unauthenticated) routing
- Expiration check logic (returning `410 Gone` if expired)
- High-throughput Redis caching to prevent database overload
- Click count incrementation and asynchronous analytics pipelines (BullMQ)
Separating creation (Phase 2) from redirection and analytics (Phase 3) follows single-responsibility and progressive delivery principles.

---

## 2. API Endpoints Specification

### 2.1 Configuration
- `APP_BASE_URL`: Base URL used to construct the full `shortUrl`. Defaults to `http://localhost:3000`.

### 2.2 Endpoints Summary
| Method | Endpoint | Auth Required | Description |
|---|---|---|---|
| `POST` | `/links` | Yes (Bearer JWT) | Creates a short code for a long URL |
| `GET` | `/links` | Yes (Bearer JWT) | Returns paginated list of user's links |
| `GET` | `/links/:id` | Yes (Bearer JWT) | Retrieves one link by ID (owner only) |
| `DELETE` | `/links/:id` | Yes (Bearer JWT) | Deletes one link by ID (owner only), returns `204 No Content` |

---

## 3. Step-by-Step Manual Postman Testing Guide

### Prerequisites
1. Ensure the backend server is running:
   ```bash
   cd backend
   npm run dev
   ```
2. Note your base URL: `http://localhost:3000`

---

### Step 1: Register and Login Two Test Users

#### Request 1.1: Register User A
- **Method:** `POST`
- **URL:** `http://localhost:3000/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "userA@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Status:** `201 Created`
- **Save:** Copy the returned `accessToken` as `TOKEN_A`.

#### Request 1.2: Register User B
- **Method:** `POST`
- **URL:** `http://localhost:3000/auth/register`
- **Headers:** `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "email": "userB@example.com",
    "password": "Password123!"
  }
  ```
- **Expected Status:** `201 Created`
- **Save:** Copy the returned `accessToken` as `TOKEN_B`.

---

### Step 2: Create a Short Link with Valid URL and Expiration Date
- **What it proves:** Link creation generates a short code, assembles `shortUrl`, records `expiresAt`, and stores ownership.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
  - `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "originalUrl": "https://example.com/products/phones?model=pro",
    "expiresAt": "2028-01-01T00:00:00.000Z"
  }
  ```
- **Expected Status:** `201 Created`
- **Example Response:**
  ```json
  {
    "id": "cm25abcde0001xyz123456789",
    "shortCode": "k9Xp2M",
    "shortUrl": "http://localhost:3000/k9Xp2M",
    "originalUrl": "https://example.com/products/phones?model=pro",
    "clickCount": 0,
    "createdAt": "2026-10-12T18:10:00.000Z",
    "expiresAt": "2028-01-01T00:00:00.000Z"
  }
  ```
- **Save:** Copy the returned `id` as `LINK_ID_A`.

---

### Step 3: Create a Short Link Without Expiration Date
- **What it proves:** Expiration is optional; links can be created with `expiresAt: null`.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
  - `Content-Type: application/json`
- **Body (raw JSON):**
  ```json
  {
    "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript"
  }
  ```
- **Expected Status:** `201 Created`
- **Example Response:**
  ```json
  {
    "id": "cm25abcde0002xyz123456789",
    "shortCode": "8mQ1zW",
    "shortUrl": "http://localhost:3000/8mQ1zW",
    "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
    "clickCount": 0,
    "createdAt": "2026-10-12T18:12:00.000Z",
    "expiresAt": null
  }
  ```

---

### Step 4: Validation Tests (Error Handling)

#### Test 4.1: Reject Invalid / Malformed URL
- **What it proves:** Ensures syntactically invalid URLs are rejected without calling database or external network.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "originalUrl": "not-a-valid-url"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Response:**
  ```json
  {
    "message": ["originalUrl must be an absolute URL with http or https protocol"],
    "error": "Bad Request",
    "statusCode": 400
  }
  ```

#### Test 4.2: Reject Unsupported Protocol (`javascript:`)
- **What it proves:** Prevents XSS vector URLs and arbitrary URI schemes like `javascript:`, `ftp:`, `data:`.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "originalUrl": "javascript:alert(document.cookie)"
  }
  ```
- **Expected Status:** `400 Bad Request`

#### Test 4.3: Reject Past Expiration Date
- **What it proves:** The custom validator `IsFutureDateConstraint` rejects dates in the past.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
  - `Content-Type: application/json`
- **Body:**
  ```json
  {
    "originalUrl": "https://example.com",
    "expiresAt": "2020-01-01T00:00:00.000Z"
  }
  ```
- **Expected Status:** `400 Bad Request`
- **Response:**
  ```json
  {
    "message": ["expiresAt must be a valid future ISO-8601 date string"],
    "error": "Bad Request",
    "statusCode": 400
  }
  ```

#### Test 4.4: Reject Link Creation Without Authentication
- **What it proves:** Endpoints are protected by `JwtAuthGuard`.
- **Method:** `POST`
- **URL:** `http://localhost:3000/links`
- **Headers:** (No `Authorization` header)
- **Body:**
  ```json
  {
    "originalUrl": "https://example.com"
  }
  ```
- **Expected Status:** `401 Unauthorized`

---

### Step 5: List Authenticated User's Links
- **What it proves:** Returns only links owned by the caller, sorted newest first, with pagination metadata.
- **Method:** `GET`
- **URL:** `http://localhost:3000/links?page=1&limit=10`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
- **Expected Status:** `200 OK`
- **Example Response:**
  ```json
  {
    "data": [
      {
        "id": "cm25abcde0002xyz123456789",
        "shortCode": "8mQ1zW",
        "shortUrl": "http://localhost:3000/8mQ1zW",
        "originalUrl": "https://developer.mozilla.org/en-US/docs/Web/JavaScript",
        "clickCount": 0,
        "createdAt": "2026-10-12T18:12:00.000Z",
        "expiresAt": null
      },
      {
        "id": "cm25abcde0001xyz123456789",
        "shortCode": "k9Xp2M",
        "shortUrl": "http://localhost:3000/k9Xp2M",
        "originalUrl": "https://example.com/products/phones?model=pro",
        "clickCount": 0,
        "createdAt": "2026-10-12T18:10:00.000Z",
        "expiresAt": "2028-01-01T00:00:00.000Z"
      }
    ],
    "meta": {
      "total": 2,
      "page": 1,
      "limit": 10,
      "totalPages": 1
    }
  }
  ```

---

### Step 6: Retrieve One Link by ID
- **What it proves:** Retrieves specific link details when requested by its owner.
- **Method:** `GET`
- **URL:** `http://localhost:3000/links/<LINK_ID_A>`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
- **Expected Status:** `200 OK`
- **Example Response:**
  ```json
  {
    "id": "cm25abcde0001xyz123456789",
    "shortCode": "k9Xp2M",
    "shortUrl": "http://localhost:3000/k9Xp2M",
    "originalUrl": "https://example.com/products/phones?model=pro",
    "clickCount": 0,
    "createdAt": "2026-10-12T18:10:00.000Z",
    "expiresAt": "2028-01-01T00:00:00.000Z"
  }
  ```

---

### Step 7: Verify User Ownership Isolation (Cross-User Access Prevention)
- **What it proves:** User B cannot read User A's links. The backend returns `404 Not Found` without disclosing whether the link exists.
- **Method:** `GET`
- **URL:** `http://localhost:3000/links/<LINK_ID_A>`
- **Headers:**
  - `Authorization: Bearer <TOKEN_B>`  *(Token from User B!)*
- **Expected Status:** `404 Not Found`
- **Example Response:**
  ```json
  {
    "message": "Link not found",
    "error": "Not Found",
    "statusCode": 404
  }
  ```

---

### Step 8: Verify User B's List Does Not Leak User A's Links
- **What it proves:** User B's list is completely isolated.
- **Method:** `GET`
- **URL:** `http://localhost:3000/links`
- **Headers:**
  - `Authorization: Bearer <TOKEN_B>`
- **Expected Status:** `200 OK`
- **Example Response:**
  ```json
  {
    "data": [],
    "meta": {
      "total": 0,
      "page": 1,
      "limit": 20,
      "totalPages": 0
    }
  }
  ```

---

### Step 9: Delete a Link (Owner Only)
- **What it proves:** Deletes a link owned by the caller with no response body, returns `404` when attempted by another user.
- **Method:** `DELETE`
- **URL:** `http://localhost:3000/links/<LINK_ID_A>`
- **Headers:**
  - `Authorization: Bearer <TOKEN_A>`
- **Expected Status:** `204 No Content`
- **Body:** Empty

#### Test 9.1: Verify Deletion Prevents Re-access
- **Method:** `GET`
- **URL:** `http://localhost:3000/links/<LINK_ID_A>`
- **Headers:** `Authorization: Bearer <TOKEN_A>`
- **Expected Status:** `404 Not Found`

#### Test 9.2: Verify Cross-User Delete is Rejected
- **Method:** `DELETE`
- **URL:** `http://localhost:3000/links/<LINK_ID_A>`
- **Headers:** `Authorization: Bearer <TOKEN_B>`
- **Expected Status:** `404 Not Found`

---

## 4. Phase 2 Completion Status

| Deliverable | Status |
|---|---|
| Base62 encoding utility (encodeBase62, decodeBase62, generateShortCode, isValidShortCode) | Complete |
| Cryptographically secure short code generation via crypto.randomBytes | Complete |
| Unique constraint collision handling with 5-retry bounded loop | Complete |
| POST /links - create short link with ownership | Complete |
| GET /links - paginated user link listing | Complete |
| GET /links/:id - single link retrieval (owner-isolated) | Complete |
| DELETE /links/:id - owner-isolated deletion, 204 No Content | Complete |
| Input validation: IsUrl (http/https only), IsFutureDateConstraint | Complete |
| Frontend linksService (create, getMyLinks, getLinkById, deleteLink) | Complete |
| Unit tests: short-code.generator.spec.ts (20 tests) | 20 passing |
| Unit tests: links.service.spec.ts (9 tests) | 9 passing |
| Unit tests: links.controller.spec.ts (4 tests) | 4 passing |
| TypeScript compilation: backend npx tsc --noEmit | Clean (0 errors) |
| TypeScript compilation: frontend npx tsc --noEmit | Clean (0 errors) |
| Total backend tests passing | 49/49 |

**Next:** Phase 3 - Redirect system (GET /:shortCode), expiry checks, click counting.
