# Engineering Roadmap: SPY-Intel Project

**Date:** 2025-01-18
**Based on:** Engineering Report dated 2025-01-18
**Objective:** Prioritized refactoring plan to improve code quality, maintainability, and performance

---

## ROI Prioritization Framework

**ROI Calculation Factors:**
- **Impact:** Effect on code quality, maintainability, performance, and developer experience
- **Effort:** Time and complexity to implement
- **Risk:** Likelihood of introducing bugs or breaking existing functionality
- **Value:** Long-term benefit to the project

**Priority Levels:**
- **P0 (Critical):** High impact, low effort, low risk - Immediate action
- **P1 (High):** High impact, medium effort, low-medium risk - Sprint 1
- **P2 (Medium):** Medium impact, medium effort, medium risk - Sprint 2
- **P3 (Low):** Low impact, low-medium effort, low risk - Sprint 3+
- **P4 (Deferred):** High effort or high risk - Future consideration

---

## Sprint 1: Low-Risk, High-Value Refactors

**Goal:** Eliminate technical debt with minimal risk, preserving all existing behavior and API backward compatibility.

**Duration Estimate:** 2-3 days

**Risk Level:** Low

### Task 1.1: Remove Unused Abstraction Layer
**Priority:** P0
**Effort:** 15 minutes
**Risk:** Very Low
**Impact:** Low (eliminates confusion)

**Description:**
Delete `backend/app/domain/application/ports.py` which defines an unused `MarketDataProviderPort` interface. The actual interface used is `DataProvider` in `providers/base.py`.

**Files Affected:**
- Delete: `backend/app/domain/application/ports.py`

**Validation:**
- Run existing tests to ensure no imports break
- Verify no other files reference this module

**ROI:** Very High - 15 minutes to eliminate confusion and dead code

---

### Task 1.2: Extract Index Conversion Logic to Helper Function
**Priority:** P1
**Effort:** 2 hours
**Risk:** Low
**Impact:** High (eliminates 6+ code duplications)

**Description:**
Create a reusable helper function or decorator to encapsulate the repeated pattern of fetching index price and calculating ratio for SPY. This pattern appears in 6+ endpoints.

**Files Affected:**
- Create: `backend/app/routers/helpers.py` (or add to existing `analytics/index_converter.py`)
- Modify: `backend/app/routers/market.py` (6+ endpoint functions)

**Implementation Approach:**
```python
def enrich_with_index_data(response_dict: dict, ticker: str, spot: float, provider: DataProvider) -> dict:
    """Enrich response with index price and ratio if ticker is SPY."""
    if ticker != "SPY":
        return response_dict
    
    try:
        index_price = provider.get_index_price("^GSPC")
        if index_price and spot > 0:
            ratio = calculate_index_ratio(spot, index_price)
            response_dict["index_ticker"] = "^GSPC"
            response_dict["index_price"] = index_price
            response_dict["index_ratio"] = ratio
            if "spot_price" in response_dict:
                response_dict["spot_price_index"] = spot * ratio
    except Exception as e:
        logger.exception("Failed to fetch index_price for %s: %s", ticker, e)
    
    return response_dict
```

**Validation:**
- Run existing tests
- Manually test each affected endpoint to ensure index data is still returned correctly
- Verify API backward compatibility

**ROI:** High - Reduces 6+ duplications to single function, easier maintenance

---

### Task 1.3: Extract Frontend Download Handler to Shared Hook
**Priority:** P1
**Effort:** 1 hour
**Risk:** Low
**Impact:** Medium (eliminates duplication)

**Description:**
Extract the identical `handleDownloadWord` function from `Dashboard.tsx` and `GammaExposureView.tsx` into a shared custom hook.

**Files Affected:**
- Create: `frontend/src/hooks/useReportDownload.ts`
- Modify: `frontend/src/components/Dashboard.tsx`
- Modify: `frontend/src/components/GammaExposureView.tsx`

**Implementation Approach:**
```typescript
// frontend/src/hooks/useReportDownload.ts
import { useState } from "react";
import { marketApi } from "../api/client";

export function useReportDownload() {
  const [isDownloading, setIsDownloading] = useState(false);

  const handleDownloadWord = async (ticker: string, expiration: string | undefined) => {
    try {
      setIsDownloading(true);
      const blob = await marketApi.downloadReport({ ticker, expiration });
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = downloadUrl;
      link.download = `${ticker}_Report_${expiration || "Nearest"}.docx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);
    } catch (e) {
      console.error(e);
      alert("Error al descargar el reporte.");
    } finally {
      setIsDownloading(false);
    }
  };

  return { isDownloading, handleDownloadWord };
}
```

**Validation:**
- Test download functionality in both Dashboard and GammaExposureView
- Verify file naming and content remain unchanged

**ROI:** High - Eliminates duplication, centralizes download logic

---

### Task 1.4: Add Basic Router Endpoint Tests
**Priority:** P1
**Effort:** 4 hours
**Risk:** Very Low
**Impact:** High (enables confident refactoring)

**Description:**
Add basic integration tests for key router endpoints to ensure API contracts are maintained during refactoring.

**Files Affected:**
- Create: `backend/app/tests/test_market_router.py`

**Test Coverage Targets:**
- `GET /api/v1/price` - Basic price retrieval
- `GET /api/v1/expirations` - Expiration list
- `GET /api/v1/options` - Options chain
- `GET /api/v1/gex` - Exposure data

**Implementation Approach:**
Use pytest with FastAPI TestClient, mock the provider to return predictable data.

**Validation:**
- All new tests pass
- Existing tests continue to pass

**ROI:** High - Provides safety net for future refactoring

---

### Task 1.5: Remove Empty Infrastructure/Routers Directory
**Priority:** P0
**Effort:** 10 minutes
**Risk:** None
**Impact:** Low (architectural consistency)

**Description:**
Remove the empty `backend/app/infrastructure/routers/` directory since routers are in `routers/` per current architecture.

**Files Affected:**
- Delete: `backend/app/infrastructure/routers/__init__.py`
- Delete: `backend/app/infrastructure/routers/` directory

**Validation:**
- Run existing tests
- Verify application starts correctly

**ROI:** High - Eliminates architectural confusion, 10 minutes effort

---

## Sprint 1 Summary

**Total Effort Estimate:** ~7.5 hours (1 day)

**Tasks:**
1. Remove unused ports.py (15 min)
2. Extract index conversion helper (2 hours)
3. Extract download handler hook (1 hour)
4. Add router tests (4 hours)
5. Remove empty directory (10 min)

**Expected Outcomes:**
- Eliminate 6+ code duplications
- Remove 2 instances of dead code
- Add test coverage for critical paths
- Improve architectural consistency
- Zero breaking changes to API

**Risk Mitigation:**
- All changes are additive or deletive
- No changes to business logic
- Comprehensive testing before and after
- Git commits per task for easy rollback

---

## Sprint 2: Medium-Risk, Medium-Value Refactors

**Goal:** Improve performance and testability with moderate effort.

**Duration Estimate:** 3-5 days

**Risk Level:** Medium

### Task 2.1: Implement Dependency Injection for Provider
**Priority:** P1
**Effort:** 4 hours
**Risk:** Medium
**Impact:** High (better testability)

**Description:**
Replace global singleton pattern in `providers/__init__.py` with FastAPI dependency injection using `Depends`.

**Files Affected:**
- Modify: `backend/app/providers/__init__.py`
- Modify: `backend/app/routers/market.py` (all endpoints using provider)

**Validation:**
- All existing tests pass
- New tests can mock provider easily

**ROI:** High - Improves testability, removes global state

---

### Task 2.2: Add Rate Limiting
**Priority:** P2
**Effort:** 3 hours
**Risk:** Low
**Impact:** Medium (security and stability)

**Description:**
Implement rate limiting using `slowapi` to prevent abuse and protect external API quotas.

**Files Affected:**
- Add: `slowapi` to requirements.txt
- Modify: `backend/app/main.py`

**Validation:**
- Test rate limiting behavior
- Verify normal operation unaffected

**ROI:** Medium - Security improvement, protects resources

---

### Task 2.3: Consolidate OptionQuote Definitions
**Priority:** P2
**Effort:** 3 hours
**Risk:** Medium
**Impact:** Medium (single source of truth)

**Description:**
Consolidate the three `OptionQuote` definitions into a single source of truth in `domain/model/market.py` with adapters for provider and API layers.

**Files Affected:**
- Modify: `backend/app/domain/model/market.py`
- Modify: `backend/app/providers/base.py`
- Modify: `backend/app/schemas.py`
- Modify: `backend/app/infrastructure/adapters/yahoo_adapter.py`
- Update tests

**Validation:**
- All existing tests pass
- No breaking changes to API

**ROI:** Medium - Eliminates confusion, single source of truth

---

### Task 2.4: Split Large Router File
**Priority:** P2
**Effort:** 4 hours
**Risk:** Low-Medium
**Impact:** Medium (maintainability)

**Description:**
Split `routers/market.py` (557 lines) into multiple router files by domain:
- `routers/price.py` - Price and expirations
- `routers/exposure.py` - GEX, DEX, Greeks, Max Pain
- `routers/intelligence.py` - Intelligence, queries, reports

**Files Affected:**
- Create: `backend/app/routers/price.py`
- Create: `backend/app/routers/exposure.py`
- Create: `backend/app/routers/intelligence.py`
- Modify: `backend/app/main.py` (include multiple routers)
- Delete: `backend/app/routers/market.py`

**Validation:**
- All endpoints still accessible at same paths
- All existing tests pass
- Manual smoke test of all endpoints

**ROI:** Medium - Improved maintainability, easier navigation

---

## Sprint 3: Low-Priority Improvements

**Goal:** Polish and optimization.

**Duration Estimate:** 2-3 days

**Risk Level:** Low

### Task 3.1: Extract Magic Numbers to Config
**Priority:** P3
**Effort:** 2 hours
**Risk:** Low
**Impact:** Low (maintainability)

**Description:**
Extract hardcoded threshold values from analyzers to configuration constants with descriptive names.

**Files Affected:**
- Modify: `backend/app/config.py`
- Modify: Various analyzer files

**ROI:** Low - Better maintainability, easier tuning

---

### Task 3.2: Standardize Language to English
**Priority:** P3
**Effort:** 2 hours
**Risk:** Very Low
**Impact:** Low (consistency)

**Description:**
Convert Spanish comments and variable names to English throughout the codebase.

**Files Affected:**
- Multiple files with Spanish text

**ROI:** Low - Improved consistency for international team

---

### Task 3.3: Reorganize Frontend Components
**Priority:** P3
**Effort:** 1 hour
**Risk:** Very Low
**Impact:** Low (organization)

**Description:**
Reorganize frontend components into subdirectories:
- `components/charts/` - Chart components
- `components/panels/` - Panel components
- `components/views/` - Page-level components

**Files Affected:**
- Create subdirectories
- Move component files
- Update imports

**ROI:** Low - Better organization as component count grows

---

### Task 3.4: Remove or Integrate Database Module
**Priority:** P2
**Effort:** 4 hours (if integrating) or 30 minutes (if removing)
**Risk:** Low (if removing), Medium (if integrating)
**Impact:** Medium (eliminate dead code or complete feature)

**Description:**
Either:
- Option A: Remove unused `db/` module (recommended if no immediate need)
- Option B: Integrate database persistence for historical snapshots

**Decision Point:** Consult with stakeholders on whether historical data persistence is a near-term requirement.

**ROI:** Medium - Eliminate dead code or complete planned feature

---

## Deferred Tasks (P4)

### Task 4.1: Convert Synchronous I/O to Async
**Priority:** P4
**Effort:** 2-3 days
**Risk:** High
**Impact:** High (performance)

**Description:**
Convert all synchronous external API calls in `yahoo_adapter.py` to async using `aiohttp` or `httpx`. This requires significant refactoring of the data provider interface and all dependent code.

**Reason for Deferral:**
- High risk of introducing bugs
- Requires extensive testing
- Current synchronous approach works for current scale
- Should be done when performance becomes a bottleneck

**ROI:** High - But deferred due to risk and current scale

---

### Task 4.2: Implement WebSocket for Real-Time Updates
**Priority:** P4
**Effort:** 3-5 days
**Risk:** Medium-High
**Impact:** Medium (performance, UX)

**Description:**
Replace polling with WebSocket connections for real-time price and exposure updates.

**Reason for Deferral:**
- Significant frontend and backend changes
- Current polling is acceptable for current scale
- Should be considered when user base grows

**ROI:** Medium - Deferred due to effort vs current need

---

### Task 4.3: Implement React Context for Global State
**Priority:** P4
**Effort:** 4 hours
**Risk:** Low-Medium
**Impact:** Low (code quality)

**Description:**
Implement React Context for global state like selected expiration to reduce prop drilling.

**Reason for Deferral:**
- Current prop depth is manageable
- Low priority compared to other improvements

**ROI:** Low - Deferred as it's a nice-to-have improvement

---

## Implementation Order Summary

### Immediate (Sprint 1 - This Session)
1. ✅ Remove unused ports.py (15 min)
2. ✅ Extract index conversion helper (2 hours)
3. ✅ Extract download handler hook (1 hour)
4. ✅ Add router tests (4 hours)
5. ✅ Remove empty directory (10 min)

### Near-Term (Sprint 2 - Next Session)
6. Implement dependency injection for provider
7. Add rate limiting
8. Consolidate OptionQuote definitions
9. Split large router file

### Medium-Term (Sprint 3 - Future Session)
10. Extract magic numbers to config
11. Standardize language to English
12. Reorganize frontend components
13. Remove or integrate database module

### Long-Term (Deferred)
14. Convert synchronous I/O to async
15. Implement WebSocket for real-time updates
16. Implement React Context for global state

---

## Success Metrics

### Sprint 1 Success Criteria
- [ ] All 5 tasks completed
- [ ] Zero breaking changes to API
- [ ] All existing tests still pass
- [ ] New router tests added and passing
- [ ] Code duplication reduced by >50 lines
- [ ] Dead code eliminated

### Overall Success Criteria
- [ ] Technical debt reduced by 30%
- [ ] Test coverage increased to >60%
- [ ] Code duplication eliminated in high-traffic areas
- [ ] Architectural consistency improved
- [ ] Performance maintained or improved
- [ ] API backward compatibility preserved

---

## Risk Mitigation Strategy

### Before Each Sprint
1. Create feature branch from main
2. Ensure all tests pass
3. Document expected changes

### During Sprint
1. Commit after each task
2. Run tests after each commit
3. Manual smoke test of affected features

### After Sprint
1. Full test suite run
2. Manual regression testing
3. Update documentation
4. Merge to main with peer review

### Rollback Plan
- Each task is independently revertible
- Git history allows per-task rollback
- No task depends on another within Sprint 1

---

## Conclusion

This roadmap prioritizes low-risk, high-value refactors for Sprint 1, focusing on eliminating code duplication and dead code while adding test coverage. Subsequent sprints address medium-priority improvements to testability, security, and maintainability. High-risk/high-effort items like async conversion are deferred until they become necessary due to scale or performance requirements.

The phased approach ensures continuous improvement while minimizing risk to the production system.
