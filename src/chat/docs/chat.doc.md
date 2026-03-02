# Chat Module Documentation

## Overview

The Chat Module provides an AI warehouse assistant with:

- Authenticated chat interactions
- Streaming responses over SSE (token-by-token)
- Non-streaming JSON responses
- Session history and session management
- Tool-driven answers from real warehouse data (products, inventory, transactions, dashboard, analytics, suppliers, customers, etc.)

Base route: `/chat`

Authentication: **Required** for all endpoints (`Authorization: Bearer <access_token>`)

---

## Table of Contents

1. [Files & Architecture](#files--architecture)
2. [Data Contract](#data-contract)
3. [API Endpoints](#api-endpoints)
4. [Streaming (SSE) Integration](#streaming-sse-integration)
5. [Frontend Integration Guide](#frontend-integration-guide)
6. [AI Output Blocks (table/chart/metric)](#ai-output-blocks-tablechartmetric)
7. [Error Handling & Edge Cases](#error-handling--edge-cases)
8. [Quick Integration Checklist](#quick-integration-checklist)

---

## Files & Architecture

```
src/chat/
├── chat.module.ts
├── chat.controller.ts
├── chat.service.ts
├── dto/
│   └── chat-message.dto.ts
├── entities/
│   └── chat-session.entity.ts
└── tools/
    ├── product.tools.ts
    ├── inventory.tools.ts
    ├── transaction.tools.ts
    ├── dashboard.tools.ts
    ├── analytics.tools.ts
    └── entity.tools.ts
```

### Runtime Flow

1. Frontend sends user message to `/chat/stream` or `/chat/message`
2. Backend authenticates user via `AuthGuard`
3. Backend loads/creates `ChatSession`
4. Backend saves user message
5. AI model runs with tool access and user/warehouse context
6. Backend returns response (SSE stream or JSON)
7. Backend persists assistant message

---

## Data Contract

### Request DTO: `ChatMessageDto`

```ts
{
  message: string;           // required
  sessionId?: string;        // optional, continue existing chat
  warehouseId?: string;      // optional Mongo ObjectId for scoped context
}
```

Validation behavior:

- `message` is required and must be string
- `warehouseId`, when passed, must be valid Mongo ObjectId
- unknown fields are stripped/rejected by global validation pipe

### Chat Session Entity (Stored)

```ts
{
  _id: ObjectId,
  userId: ObjectId,
  title: string,             // first message truncated to 60 chars
  warehouseContext?: ObjectId,
  messages: [
    {
      role: 'system' | 'user' | 'assistant' | 'tool',
      content: string,
      name?: string,
      toolCallId?: string,
      timestamp: Date
    }
  ],
  createdAt: Date,
  updatedAt: Date
}
```

---

## API Endpoints

## 1) Stream Chat Response

**Endpoint:** `POST /chat/stream`

**Purpose:** Send a user message and receive streaming text chunks via SSE.

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:**

```json
{
  "message": "Show low stock products in warehouse A",
  "sessionId": "65f...optional",
  "warehouseId": "65f...optional"
}
```

**Response:**

- Content type: `text/event-stream`
- Important response header: `X-Session-Id: <sessionId>`
- Stream body: text chunks from the model

Use `X-Session-Id` to persist/continue the same conversation in future calls.

---

## 2) Non-Streaming Chat Response

**Endpoint:** `POST /chat/message`

**Purpose:** Send a user message and receive full response JSON.

**Headers:**

- `Authorization: Bearer <token>`
- `Content-Type: application/json`

**Body:** same as `/chat/stream`

**Success Response (200):**

```json
{
  "success": true,
  "message": "Chat response generated",
  "data": {
    "reply": "Here are the low-stock products...",
    "sessionId": "65f..."
  }
}
```

---

## 3) Get User Sessions

**Endpoint:** `GET /chat/sessions`

**Purpose:** List all chat sessions for current authenticated user.

**Success Response (200):**

```json
{
  "success": true,
  "message": "Chat sessions retrieved",
  "data": [
    {
      "_id": "65f...",
      "title": "Show low stock products...",
      "warehouseContext": "65f...",
      "createdAt": "2026-03-02T09:30:00.000Z",
      "updatedAt": "2026-03-02T09:32:00.000Z"
    }
  ]
}
```

---

## 4) Get Session History

**Endpoint:** `GET /chat/sessions/:sessionId`

**Purpose:** Fetch full conversation and metadata for one session.

**Success Response:**

```json
{
  "success": true,
  "message": "Session retrieved",
  "data": {
    "_id": "65f...",
    "userId": "65e...",
    "title": "Show low stock products...",
    "warehouseContext": "65f...",
    "messages": [
      {
        "role": "user",
        "content": "Show low stock products",
        "timestamp": "2026-03-02T09:31:00.000Z"
      },
      {
        "role": "assistant",
        "content": "Here are the low stock products...",
        "timestamp": "2026-03-02T09:31:02.000Z"
      }
    ],
    "createdAt": "2026-03-02T09:30:00.000Z",
    "updatedAt": "2026-03-02T09:32:00.000Z"
  }
}
```

**Not Found Response:**

```json
{
  "success": false,
  "message": "Session not found",
  "data": null
}
```

---

## 5) Delete Session

**Endpoint:** `DELETE /chat/sessions/:sessionId`

**Purpose:** Delete one session belonging to current user.

**Success (deleted):**

```json
{
  "success": true,
  "message": "Session deleted",
  "data": null
}
```

**Not found/already deleted:**

```json
{
  "success": false,
  "message": "Session not found",
  "data": null
}
```

---

## Streaming (SSE) Integration

This endpoint is POST + authenticated + SSE text stream. Browser `EventSource` cannot be used directly because:

- `EventSource` only supports GET
- cannot set Bearer Authorization header in standard `EventSource`

Use `fetch()` + stream reader.

### Frontend Example (TypeScript)

```ts
type StreamChatInput = {
  message: string;
  sessionId?: string;
  warehouseId?: string;
};

type StreamChatOptions = {
  token: string;
  baseUrl: string;
  onToken: (chunk: string) => void;
  onSessionId?: (sessionId: string) => void;
};

export async function streamChat(
  payload: StreamChatInput,
  options: StreamChatOptions,
) {
  const res = await fetch(`${options.baseUrl}/chat/stream`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  });

  if (!res.ok || !res.body) {
    const text = await res.text();
    throw new Error(`Stream failed: ${res.status} ${text}`);
  }

  const sessionId = res.headers.get('X-Session-Id');
  if (sessionId && options.onSessionId) options.onSessionId(sessionId);

  const reader = res.body.getReader();
  const decoder = new TextDecoder();

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;

    const chunk = decoder.decode(value, { stream: true });
    options.onToken(chunk);
  }
}
```

### UI Behavior Recommendation

- Create optimistic user message bubble immediately
- Append streamed assistant text incrementally to one in-progress assistant bubble
- When stream ends, mark assistant message complete
- Store `X-Session-Id` from first call and reuse it for subsequent messages

---

## Frontend Integration Guide

## 1) Suggested API Client Layer

Create one chat API module with methods:

- `streamMessage(payload)` -> streaming text + session header
- `sendMessage(payload)` -> full JSON response
- `getSessions()`
- `getSession(sessionId)`
- `deleteSession(sessionId)`

### Non-Streaming request example

```ts
export async function sendMessage(
  baseUrl: string,
  token: string,
  body: {
    message: string;
    sessionId?: string;
    warehouseId?: string;
  },
) {
  const res = await fetch(`${baseUrl}/chat/message`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
  });

  if (!res.ok) throw new Error(await res.text());
  return res.json();
}
```

## 2) Suggested Frontend State

```ts
type ChatUIMessage = {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  status?: 'streaming' | 'done' | 'error';
  createdAt: string;
};

type ChatState = {
  sessionId?: string;
  warehouseId?: string;
  messages: ChatUIMessage[];
  loading: boolean;
  error?: string;
};
```

## 3) Session Flow

- First message: call `/chat/stream` or `/chat/message` without `sessionId`
- Save returned session id (`X-Session-Id` or `data.sessionId`)
- Next messages: include `sessionId`
- Sidebar session list: call `GET /chat/sessions`
- Click session: call `GET /chat/sessions/:sessionId`

## 4) Warehouse Context Flow

- If chat is opened from a warehouse-specific screen, pass that `warehouseId`
- Keep same `warehouseId` in ongoing session messages unless user switches warehouse
- If user switches warehouse intentionally, either:
  - start new session, or
  - continue same session with new `warehouseId` (depends on product decision)

## 5) Auth & Refresh

- All chat APIs require valid access token
- If backend returns 401/403, trigger your existing token refresh/login flow
- Retry request after token refresh

---

## AI Output Blocks (table/chart/metric)

The assistant is prompted to return structured blocks for rich UI.

### Table block

````text
```table
{"title":"...","columns":[{"key":"name","label":"Name","type":"string"}],"rows":[{"name":"..."}]}
```
````

### Chart block

````text
```chart
{"chartType":"bar|line|pie|doughnut|area","title":"...","labels":["..."],"datasets":[{"label":"...","data":[1,2,3]}]}
```
````

### Metric block

````text
```metric
{"label":"Total Revenue","value":"$45,230","change":"+12%","icon":"trending-up"}
```
````

### Frontend parsing strategy

1. Render raw assistant text as markdown/text
2. Detect fenced blocks: `table`, `chart`, `metric`
3. Parse JSON safely with try/catch
4. If parse succeeds, render custom UI widgets
5. If parse fails, fallback to plain text view

---

## Tool Capability Summary (for Product/UX)

The AI can call tools in these groups:

- Products: search, details, archived products
- Inventory: total quantity, warehouse stock, stock breakdown, products with stock
- Transactions: global search, per-warehouse transactions (with filters)
- Dashboard: KPIs, top products, low stock, activity, profit/loss, adjustments, cancellations
- Analytics: compare two products (current quantity + 7-day history)
- Entities: warehouses, suppliers, customers, managers, batches, audit logs

This means frontend can support prompts like:

- "Show low stock products in Dhaka warehouse"
- "Compare product A and B in warehouse X"
- "Give me last 7 days IN/OUT trend"
- "List top selling products this month"

---

## Error Handling & Edge Cases

- `400`: invalid payload (e.g., malformed `warehouseId`)
- `401/403`: token missing/invalid/user blocked
- `404`-style business response for sessions is returned in payload (`success: false`, not HTTP 404)
- Stream interruptions: keep partial assistant text and mark message as error/retryable

Recommended UI fallback messages:

- "Connection interrupted. Please retry."
- "Session no longer exists. Start a new chat."
- "You are not authorized. Please sign in again."

---

## Quick Integration Checklist

- [ ] Add chat API client functions for 5 endpoints
- [ ] Implement `fetch` streaming reader for `/chat/stream`
- [ ] Capture and persist `X-Session-Id`
- [ ] Store/render session list and session history
- [ ] Handle auth errors with refresh/login flow
- [ ] Parse and render `table/chart/metric` blocks
- [ ] Add retry UX for streaming failures

---

## Optional cURL Examples

### Stream

```bash
curl -N -X POST http://localhost:3030/chat/stream \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show dashboard stats","warehouseId":"65f..."}'
```

### Non-stream

```bash
curl -X POST http://localhost:3030/chat/message \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"message":"Show top selling products","sessionId":"65f..."}'
```

### Sessions

```bash
curl -X GET http://localhost:3030/chat/sessions \
  -H "Authorization: Bearer <token>"
```
