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
4. [Parsed Response Format](#parsed-response-format)
5. [Streaming (SSE) Integration](#streaming-sse-integration)
6. [Frontend Integration Guide](#frontend-integration-guide)
7. [Vercel AI SDK Integration](#vercel-ai-sdk-integration)
8. [AI Output Blocks (table/chart/metric)](#ai-output-blocks-tablechartmetric)
9. [Error Handling & Edge Cases](#error-handling--edge-cases)
10. [Quick Integration Checklist](#quick-integration-checklist)

---

## Files & Architecture

```
src/chat/
├── chat.module.ts
├── chat.controller.ts
├── chat.service.ts
├── chat-response.parser.ts    # Parses AI markdown into structured format
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

````json
{
  "success": true,
  "message": "Chat response generated",
  "data": {
    "reply": "# Summary\nThere are 2 products in stock...\n\n# Insights\n* Product A has quantity 12...\n\n# Data\n```table\n{...}\n```",
    "parsed": {
      "summary": "There are 2 products in stock in this warehouse.",
      "insights": ["Product A has quantity 12.", "Product B has quantity 18."],
      "data": [
        {
          "type": "table",
          "content": {
            "title": "Products in Stock",
            "columns": [{ "key": "name", "label": "Product" }],
            "rows": [{ "name": "Product A" }]
          }
        }
      ],
      "raw": "..."
    },
    "sessionId": "65f..."
  }
}
````

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

## Parsed Response Format

The `/chat/message` endpoint returns a `parsed` object that structures the AI response for easy frontend rendering.

### ParsedChatResponse Structure

```ts
interface ParsedChatResponse {
  summary: string; // Plain text summary (from # Summary section)
  insights: string[]; // Array of bullet points (from # Insights section)
  data: ChatSection[]; // Structured data blocks (tables, charts, metrics)
  raw: string; // Original markdown string
}

interface ChatSection {
  type: 'text' | 'table' | 'chart' | 'metric';
  content: string | TableBlock | ChartBlock | MetricBlock;
}
```

### Block Types

```ts
interface MetricBlock {
  label: string;
  value: string;
  change?: string;
  icon?: string;
}

interface TableBlock {
  title?: string;
  columns: { key: string; label: string }[];
  rows: Record<string, unknown>[];
}

interface ChartBlock {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  title?: string;
  labels: string[];
  datasets: { label: string; data: number[] }[];
}
```

### Example Parsed Response

```json
{
  "summary": "There are 2 products in stock in this warehouse.",
  "insights": [
    "The T-Shirt has a quantity of 12.",
    "The Leather Chair has a quantity of 18."
  ],
  "data": [
    {
      "type": "table",
      "content": {
        "title": "Products in Stock",
        "columns": [
          { "key": "name", "label": "Product" },
          { "key": "quantity", "label": "Quantity" }
        ],
        "rows": [
          { "name": "T-Shirt", "quantity": 12 },
          { "name": "Leather Chair", "quantity": 18 }
        ]
      }
    }
  ],
  "raw": "# Summary\n..."
}
```

### Handling Conversational Responses

When the AI returns conversational text without the structured format:

```json
{
  "summary": "",
  "insights": [],
  "data": [],
  "raw": "I'm a helpful assistant..."
}
```

**Frontend logic:**

1. If `summary` is empty and `insights` is empty, render `raw` as plain markdown
2. Otherwise, render structured sections: summary → insights → data blocks

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

## Vercel AI SDK Integration

You can use Vercel AI SDK (`ai` package) on the frontend for streaming support. However, since your backend returns **custom structured responses** (with `parsed` field), you have two approaches:

### Approach 1: Use Native Fetch (Recommended for Non-Streaming)

For the `/chat/message` endpoint, use regular fetch since you need the full `parsed` response:

```tsx
// hooks/use-chat-message.ts
import { useState } from 'react';

interface ParsedResponse {
  summary: string;
  insights: string[];
  data: Array<{
    type: 'text' | 'table' | 'chart' | 'metric';
    content: unknown;
  }>;
  raw: string;
}

interface ChatResponse {
  reply: string;
  parsed: ParsedResponse;
  sessionId: string;
}

export function useChatMessage(baseUrl: string, token: string) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sendMessage = async (
    message: string,
    sessionId?: string,
    warehouseId?: string,
  ): Promise<ChatResponse | null> => {
    setLoading(true);
    setError(null);

    try {
      const res = await fetch(`${baseUrl}/chat/message`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ message, sessionId, warehouseId }),
      });

      if (!res.ok) throw new Error(`Request failed: ${res.status}`);

      const json = await res.json();
      return json.data as ChatResponse;
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Unknown error');
      return null;
    } finally {
      setLoading(false);
    }
  };

  return { sendMessage, loading, error };
}
```

### Approach 2: Use Vercel AI SDK for Streaming

For the `/chat/stream` endpoint, you can use `useChat` or manual streaming:

```bash
npm install ai
```

#### Option A: Manual Streaming with useCompletion-like Pattern

```tsx
// hooks/use-chat-stream.ts
import { useState, useCallback } from 'react';

export function useChatStream(baseUrl: string, token: string) {
  const [content, setContent] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);

  const streamMessage = useCallback(
    async (
      message: string,
      existingSessionId?: string,
      warehouseId?: string,
    ) => {
      setIsLoading(true);
      setContent('');

      try {
        const res = await fetch(`${baseUrl}/chat/stream`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            message,
            sessionId: existingSessionId,
            warehouseId,
          }),
        });

        if (!res.ok || !res.body) {
          throw new Error(`Stream failed: ${res.status}`);
        }

        // Capture session ID from header
        const newSessionId = res.headers.get('X-Session-Id');
        if (newSessionId) setSessionId(newSessionId);

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let accumulated = '';

        while (true) {
          const { value, done } = await reader.read();
          if (done) break;

          const chunk = decoder.decode(value, { stream: true });
          accumulated += chunk;
          setContent(accumulated);
        }

        return accumulated;
      } finally {
        setIsLoading(false);
      }
    },
    [baseUrl, token],
  );

  return { content, isLoading, sessionId, streamMessage };
}
```

#### Option B: Parse Streamed Content After Completion

````tsx
// utils/parse-chat-response.ts
import { parseChatResponse, ParsedChatResponse } from './types';

// Client-side parser (mirrors backend logic)
export function parseChatResponse(markdown: string): ParsedChatResponse {
  const result: ParsedChatResponse = {
    summary: '',
    insights: [],
    data: [],
    raw: markdown,
  };

  const lines = markdown.split('\n');
  let section: 'none' | 'summary' | 'insights' | 'data' = 'none';
  let codeBlock: { type: string; content: string } | null = null;
  let textBuffer: string[] = [];

  for (const line of lines) {
    const trimmed = line.trim();

    // Section headers
    if (/^#+\s*summary$/i.test(trimmed)) {
      flushText();
      section = 'summary';
      continue;
    }
    if (/^#+\s*insights?$/i.test(trimmed)) {
      flushText();
      section = 'insights';
      continue;
    }
    if (/^#+\s*data$/i.test(trimmed)) {
      flushText();
      section = 'data';
      continue;
    }

    // Code block start
    const blockMatch = trimmed.match(/^```(table|chart|metric)\s*$/i);
    if (blockMatch) {
      flushText();
      codeBlock = { type: blockMatch[1].toLowerCase(), content: '' };
      continue;
    }

    // Code block end
    if (codeBlock && trimmed === '```') {
      parseBlock();
      codeBlock = null;
      continue;
    }

    // Inside code block
    if (codeBlock) {
      codeBlock.content += line + '\n';
      continue;
    }

    // Regular content
    if (section === 'summary' && trimmed) {
      textBuffer.push(trimmed);
    } else if (section === 'insights') {
      const bullet = trimmed.match(/^[*\-•]\s*(.+)$/);
      if (bullet) result.insights.push(bullet[1].trim());
    } else if (section === 'data' && trimmed && !trimmed.startsWith('#')) {
      textBuffer.push(trimmed);
    }
  }

  flushText();
  if (codeBlock) parseBlock();

  return result;

  function flushText() {
    const text = textBuffer.join(' ').trim();
    textBuffer = [];
    if (!text) return;
    if (section === 'summary') result.summary = text;
    else if (section === 'data') {
      result.data.push({ type: 'text', content: text });
    }
  }

  function parseBlock() {
    if (!codeBlock) return;
    try {
      const parsed = JSON.parse(codeBlock.content.trim());
      result.data.push({
        type: codeBlock.type as 'table' | 'chart' | 'metric',
        content: parsed,
      });
    } catch {
      result.data.push({
        type: 'text',
        content: '```' + codeBlock.type + '\n' + codeBlock.content + '```',
      });
    }
  }
}
````

### Rendering the Parsed Response

```tsx
// components/ChatMessage.tsx
import { ParsedChatResponse } from '../types';
import { MetricCard } from './MetricCard';
import { DataTable } from './DataTable';
import { Chart } from './Chart';
import ReactMarkdown from 'react-markdown';

interface Props {
  parsed: ParsedChatResponse;
}

export function ChatMessage({ parsed }: Props) {
  // Conversational response (no structured sections)
  if (!parsed.summary && parsed.insights.length === 0) {
    return <ReactMarkdown>{parsed.raw}</ReactMarkdown>;
  }

  return (
    <div className="space-y-4">
      {/* Summary */}
      {parsed.summary && (
        <p className="text-lg font-medium">{parsed.summary}</p>
      )}

      {/* Insights */}
      {parsed.insights.length > 0 && (
        <ul className="list-disc pl-5 space-y-1">
          {parsed.insights.map((insight, i) => (
            <li key={i}>{insight}</li>
          ))}
        </ul>
      )}

      {/* Data blocks */}
      {parsed.data.map((block, i) => {
        switch (block.type) {
          case 'metric':
            return <MetricCard key={i} data={block.content} />;
          case 'table':
            return <DataTable key={i} data={block.content} />;
          case 'chart':
            return <Chart key={i} data={block.content} />;
          case 'text':
            return <p key={i}>{block.content as string}</p>;
          default:
            return null;
        }
      })}
    </div>
  );
}
```

### Complete React Example

```tsx
// ChatPage.tsx
import { useState } from 'react';
import { useChatMessage } from '../hooks/use-chat-message';
import { ChatMessage } from '../components/ChatMessage';

export function ChatPage() {
  const [input, setInput] = useState('');
  const [messages, setMessages] = useState<
    Array<{
      role: 'user' | 'assistant';
      content: string;
      parsed?: ParsedChatResponse;
    }>
  >([]);
  const [sessionId, setSessionId] = useState<string>();

  const { sendMessage, loading } = useChatMessage(
    process.env.NEXT_PUBLIC_API_URL!,
    yourAuthToken,
  );

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMessage = input;
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMessage }]);

    const response = await sendMessage(userMessage, sessionId, warehouseId);

    if (response) {
      setSessionId(response.sessionId);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: response.reply,
          parsed: response.parsed,
        },
      ]);
    }
  };

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {messages.map((msg, i) => (
          <div key={i} className={msg.role === 'user' ? 'text-right' : ''}>
            {msg.role === 'assistant' && msg.parsed ? (
              <ChatMessage parsed={msg.parsed} />
            ) : (
              <p>{msg.content}</p>
            )}
          </div>
        ))}
      </div>

      <form onSubmit={handleSubmit} className="p-4 border-t">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          placeholder="Ask about your warehouse..."
          disabled={loading}
          className="w-full p-2 border rounded"
        />
      </form>
    </div>
  );
}
```

---

## AI Output Blocks (table/chart/metric)

The assistant is prompted to return structured blocks for rich UI.

### Assistant output contract (important)

- Assistant replies must be user-facing only.
- Assistant must NOT expose internal function-calling steps (for example: "I will call...", "Please wait...", or raw function-call JSON).
- Assistant must NOT fabricate placeholder rows such as "Product A/B/C".
- If data is empty, assistant should say no records were found (instead of creating fake examples).
- Preferred format: short narrative summary first, then optional table/chart/metric blocks.

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
6. If model output accidentally contains internal tool-call text/JSON, hide those fragments in UI as a defensive fallback

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
