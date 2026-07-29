# Sprint 2 Implementation Plan

**Date:** 2026-07-29
**Sprint:** 2
**Goal:** Modularity, schema consolidation, dependency injection, and rate limiting
**Duration Estimate:** 1 day
**Risk Level:** Medium

---

## Sprint 2 Tasks Overview

| Task | Description | Effort | Risk | Priority |
|------|-------------|--------|------|----------|
| 2.1 | Dependency Injection for Provider | 2 hours | Low | P1 |
| 2.2 | Consolidate duplicate `OptionQuote` schema | 30 min | Low | P1 |
| 2.3 | Split `market.py` into modular routers | 3 hours | Medium | P1 |
| 2.4 | Add `slowapi` rate limiting | 30 min | Low | P2 |

---

## Task 2.1: Dependency Injection for Provider

### Before Change
The entire backend used a global singleton via `get_provider()` directly called inside each endpoint function body. This made testing fragile and tightly coupled to global state.

```python
# Before: direct call to global
def get_price(ticker: str = ...):
    provider = get_provider()  # ← global singleton
    ...
```

### After Change
**Action:** Added `get_provider_dependency()` to `backend/app/providers/__init__.py` and updated all endpoints to declare `provider: DataProvider = Depends(get_provider_dependency)`.

```python
# After: injected via FastAPI Depends
def get_price(
    ticker: str = ...,
    provider: DataProvider = Depends(get_provider_dependency)
):
    ...
```

**File affected:**
- `backend/app/providers/__init__.py` — added `get_provider_dependency()`
- `backend/app/routers/price.py` — all endpoints use `Depends`
- `backend/app/routers/exposure.py` — all endpoints use `Depends`
- `backend/app/routers/intelligence.py` — all endpoints use `Depends`

### Rationale
- Removes global state from endpoint logic
- Makes mocking trivial during testing
- Sets foundation for multi-provider support in the future
- Follows FastAPI official best practices

### Validation Steps
1. Run existing tests — all should pass
2. Verify each endpoint still responds correctly

---

## Task 2.2: Consolidate Duplicate `OptionQuote` Schema

### Before Change
`OptionQuote` was defined **twice** as a dataclass:
- `backend/app/domain/model/market.py` (frozen=True)
- `backend/app/providers/base.py` (non-frozen)

Both definitions were identical in fields, creating two separate types that could diverge without warning.

### After Change
**Action:** Deleted the `OptionQuote` dataclass from `backend/app/providers/base.py` and replaced it with an import from the domain model:

```python
# backend/app/providers/base.py
from app.domain.model.market import OptionQuote  # ← single source of truth
```

**Files affected:**
- `backend/app/providers/base.py` — removed duplicate class, imports from domain

### Rationale
- Single source of truth for core domain types
- Follows hexagonal architecture principles
- Prevents schema drift between the domain layer and the provider interface

### Validation Steps
1. Verify `yahoo_adapter.py` continues to use `OptionQuote` correctly (it imports from `providers.base`)
2. Run existing tests — all should pass

---

## Task 2.3: Split Large Router File

### Before Change
**File:** `backend/app/routers/market.py` — 522 lines, mixing three distinct domain concerns:
- Price and expiration data
- Options chain calculations (Greeks, GEX, DEX, Max Pain, Heatmap)
- Market intelligence, narrative analysis, and report downloads

### After Change
**Action:** Deleted `market.py` and created three focused router modules:

#### `backend/app/routers/price.py`
Endpoints:
- `GET /api/v1/price`
- `GET /api/v1/expirations`

#### `backend/app/routers/exposure.py`
Endpoints:
- `GET /api/v1/options`
- `GET /api/v1/greeks`
- `GET /api/v1/gex`
- `GET /api/v1/dex`
- `GET /api/v1/maxpain`
- `GET /api/v1/heatmap`

#### `backend/app/routers/intelligence.py`
Endpoints:
- `GET /api/v1/intelligence`
- `GET /api/v1/questions`
- `GET /api/v1/query`
- `GET /api/v1/download-report`
- `GET /api/v1/hedging-strength`
- `GET /api/v1/yield-anomaly`

**Files affected:**
- **Deleted:** `backend/app/routers/market.py`
- **Created:** `backend/app/routers/price.py`
- **Created:** `backend/app/routers/exposure.py`
- **Created:** `backend/app/routers/intelligence.py`
- **Modified:** `backend/app/main.py` — replaced `market_router` with three separate routers

### Rationale
- Clear separation of concerns by domain boundary
- Each file is readable in isolation
- Future additions (e.g., new heatmap metrics) go to the correct module
- Follows the Single Responsibility Principle

### Validation Steps
1. Verify all endpoints accessible at the same API paths
2. Run all existing tests — should pass with no changes to test code

---

## Task 2.4: Rate Limiting with slowapi

### Before Change
No rate limiting existed. Any client could flood the backend with hundreds of requests, exhausting Yahoo Finance API quotas or causing service degradation.

### After Change
**Action:** Added `slowapi==0.1.10` and registered global rate limiting middleware.

```python
# backend/app/main.py
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded
from slowapi.middleware import SlowAPIMiddleware

limiter = Limiter(key_func=get_remote_address, default_limits=["60/minute"])
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)
app.add_middleware(SlowAPIMiddleware)
```

**Files affected:**
- `backend/requirements.txt` — added `slowapi==0.1.10`
- `backend/app/main.py` — added limiter and middleware

### Rationale
- Protects Yahoo Finance quota from client abuse
- Standard protection for any public-facing API
- Low effort, high security value

### Validation Steps
1. Run existing tests — all should pass
2. Confirm `429 Too Many Requests` is returned after exceeding limit

---

## Execution Order

1. **Task 2.2** (30 min) — Consolidate `OptionQuote` (zero-risk, immediate win)
2. **Task 2.1** (2 hours) — Dependency Injection (prerequisite for modular routers)
3. **Task 2.3** (3 hours) — Split router file (core refactoring)
4. **Task 2.4** (30 min) — Add rate limiting (low-risk, independent)

---

## Pre-Execution Checklist

- [x] All Sprint 1 tasks completed and verified
- [x] Existing test suite passing (16/16)
- [x] Working on main branch

---

## Post-Execution Checklist

- [x] All 4 tasks completed
- [x] All existing tests pass (16/16)
- [x] `market.py` deleted — no orphan references
- [x] New routers accessible at same API paths
- [x] `OptionQuote` single definition confirmed
- [x] Rate limiter active in middleware stack

---

## Rollback Plan

Each task is independently revertible:
- Task 2.1: Remove `Depends` usages, revert to `get_provider()` calls
- Task 2.2: Re-add `OptionQuote` dataclass to `base.py`
- Task 2.3: Restore `market.py` from git, revert `main.py` router imports
- Task 2.4: Remove `slowapi` imports and middleware from `main.py`

```bash
git revert <commit-hash>
```

---

## Success Criteria

- [x] Single `OptionQuote` definition across the codebase
- [x] `market.py` eliminated — replaced by three domain-focused modules
- [x] All endpoints inject `provider` via `Depends` instead of global call
- [x] Rate limiting active (60 req/min per IP)
- [x] Zero breaking changes to the API surface
- [x] All 16 tests passing

---

## Notes

- API paths are fully preserved — no breaking changes
- No new features introduced in this sprint
- Focus is on code quality, modularity, and infrastructure hardening
- Each task follows the Single Responsibility Principle
