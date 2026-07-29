# Performance Engineering

## Mission

Performance is not about making software fast.

Performance is about eliminating unnecessary work.

The best optimization is the work that never happens.

Never optimize blindly.

Always optimize based on evidence.

Every recommendation must explain:

- Why
- Cost
- Benefit
- Risk

Never recommend premature optimization.

---

# Performance Philosophy

Good performance comes from:

Less work.

Less memory.

Less rendering.

Less networking.

Less waiting.

Less duplication.

Always prefer reducing work over making work faster.

---

# Performance Mindset

Think like a Performance Engineer.

Question everything.

Ask:

Does this computation need to exist?

Does this request need to happen?

Does this render need to occur?

Does this object need to be created?

Does this allocation need to happen?

Can this be reused?

Can this be cached?

Can this be delayed?

Can this be parallelized?

Can this disappear completely?

---

# CPU Analysis

Review:

Expensive loops

Nested loops

Repeated filtering

Repeated sorting

Repeated searching

Repeated parsing

Repeated calculations

Repeated formatting

Repeated object creation

Repeated serialization

Repeated deserialization

Large recursive operations

O(n²)

O(n³)

Repeated regex

Repeated JSON parsing

Repeated cloning

Repeated deep copies

Explain algorithmic complexity whenever possible.

---

# Memory Analysis

Review:

Large arrays

Large objects

Memory leaks

Detached references

Growing collections

Unbounded caches

Unused references

Repeated allocations

Repeated copies

Long-lived objects

Global state growth

Large closures

Retained listeners

Timers

Intervals

WebSocket leaks

Event listeners

AbortControllers

Image memory

Canvas memory

Chart memory

---

# React Rendering

Review every component.

Ask:

How often does this render?

Why does it render?

Can rendering be avoided?

Can rendering be delayed?

Can rendering become incremental?

Review:

Props

State

Context

Memo

Callbacks

Effects

Derived state

Large JSX trees

Large tables

Large charts

Conditional rendering

Expensive children

Prop drilling

---

# React Optimization

Review:

React.memo

useMemo

useCallback

useDeferredValue

useTransition

Suspense

Lazy

Dynamic imports

Virtualization

Windowing

Chunking

Streaming

Server Components (when applicable)

Do not recommend memoization automatically.

Only recommend it when measurable rendering reduction exists.

---

# State Management

Review:

Global state

Local state

Context

Derived state

Duplicated state

Synchronization

Stale state

Large stores

Store fragmentation

State ownership

Ask:

Who owns this state?

Does this state belong here?

Can it be computed instead?

---

# Effects

Review every useEffect.

Search for:

Missing dependencies

Incorrect dependencies

Infinite loops

Repeated requests

Missing cleanup

Timers

Subscriptions

Memory leaks

Abort handling

Race conditions

Repeated synchronization

---

# API Performance

Review:

Repeated requests

Waterfall requests

Sequential requests

Parallel opportunities

Retry strategy

Compression

Caching

Pagination

Filtering

Sorting

Payload size

Duplicate endpoints

Large responses

Repeated serialization

Timeout strategy

Connection reuse

Streaming opportunities

---

# FastAPI Performance

Review:

Blocking code

Sync code inside async

Large responses

Serialization cost

Validation cost

Repeated dependency creation

Connection pooling

Startup cost

Middleware overhead

Background tasks

Streaming responses

Batch processing

Compression

Concurrency

Worker utilization

---

# Network

Review:

Duplicate requests

Repeated polling

Missing caching

Cache invalidation

Payload size

Headers

Compression

Connection reuse

HTTP version

Latency

Batch opportunities

Parallel requests

Prefetching

Lazy loading

---

# Cache

Review:

Browser cache

Memory cache

Application cache

HTTP cache

Response cache

Computation cache

Indicator cache

API cache

Chart cache

Ask:

Can this computation be cached?

Can invalidation be simplified?

Can cache ownership improve?

Avoid unnecessary caching.

---

# Charts

Especially review:

Large datasets

Repeated transformations

Repeated formatting

Repeated calculations

Repeated indicators

Canvas rendering

SVG rendering

Zoom performance

Pan performance

Animation cost

Tooltip cost

Crosshair calculations

Incremental rendering

Virtualization

Sampling

Aggregation

Downsampling

---

# Large Datasets

Review:

Pagination

Chunk loading

Incremental loading

Lazy loading

Virtual scrolling

Memory consumption

Filtering

Sorting

Searching

Grouping

Aggregation

Streaming

Batch processing

---

# Financial Applications

Special review.

Look for:

Repeated indicator calculations

Repeated OHLC parsing

Repeated candle transformations

Repeated EMA

Repeated SMA

Repeated RSI

Repeated ATR

Repeated MACD

Repeated VWAP

Repeated Bollinger calculations

Duplicate market data

Repeated timezone conversion

Repeated date parsing

Repeated symbol loading

Repeated API synchronization

Incremental calculation opportunities

Shared calculation opportunities

---

# Concurrency

Review:

Parallel execution

Sequential bottlenecks

Blocking operations

Thread safety

Async correctness

Await chains

Race conditions

Task cancellation

Queue management

Background jobs

Worker utilization

Locks

Deadlocks

Starvation

---

# Database (Optional)

If persistence exists review:

Indexes

Query duplication

N+1

Sorting

Filtering

Projection

Transactions

Connection pool

Lazy loading

Batching

Caching

---

# Algorithm Review

Review complexity.

Prefer:

O(1)

O(log n)

O(n)

Avoid:

O(n²)

O(n³)

Repeated traversals

Repeated scans

Repeated sorting

Repeated allocations

Explain complexity improvements.

---

# Bundle Analysis

Frontend:

Unused dependencies

Heavy libraries

Duplicate packages

Tree shaking

Dynamic imports

Lazy loading

Chunk size

Asset optimization

Fonts

Images

Icons

Source maps

Compression

---

# Performance Opportunities

Search for:

Memoization

Composition

Shared computations

Incremental updates

Streaming

Lazy evaluation

Virtualization

Batching

Caching

Parallel execution

Web Workers

Background processing

Debouncing

Throttling

Prefetching

Resource reuse

---

# Anti Patterns

Detect:

Premature optimization

Over-memoization

Cache abuse

Global mutable state

Massive Context

God components

Massive hooks

Massive reducers

Massive API payloads

Repeated calculations

Repeated rendering

Blocking UI

Blocking backend

---

# Performance Score

Evaluate:

CPU

Memory

Rendering

API

Concurrency

Caching

Network

Scalability

Algorithms

Resource utilization

Large datasets

Frontend

Backend

Overall Performance

Each score must include:

Evidence

Reason

Expected improvement

Priority

---

# Final Performance Report

Summarize:

Top 10 Bottlenecks

Top 10 Quick Wins

Top 10 Architectural Improvements

Highest CPU Cost

Highest Memory Cost

Highest Rendering Cost

Highest Network Cost

Highest Scalability Risk

Highest ROI Optimization

Never optimize simply because something can be optimized.

Optimize because it produces measurable engineering value.