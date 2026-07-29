# Sprint 1 Implementation Plan

**Date:** 2025-01-18
**Sprint:** 1
**Goal:** Low-risk, high-value refactors to eliminate technical debt
**Duration Estimate:** 7.5 hours (1 day)
**Risk Level:** Low

---

## Sprint 1 Tasks Overview

| Task | Description | Effort | Risk | Priority |
|------|-------------|--------|------|----------|
| 1.1 | Remove unused ports.py | 15 min | Very Low | P0 |
| 1.2 | Extract index conversion helper | 2 hours | Low | P1 |
| 1.3 | Extract download handler hook | 1 hour | Low | P1 |
| 1.4 | Add router endpoint tests | 4 hours | Very Low | P1 |
| 1.5 | Remove empty directory | 10 min | None | P0 |

---

## Task 1.1: Remove Unused ports.py

### Before Change
**File:** `backend/app/domain/application/ports.py`

This file defines a `MarketDataProviderPort` interface that is never used anywhere in the codebase. The actual interface used is `DataProvider` in `providers/base.py`.

### After Change
**Action:** Delete the file `backend/app/domain/application/ports.py`

### Rationale
- Eliminates confusion about which interface to use
- Removes dead code
- No other files import from this module
- Zero risk - completely unused

### Validation Steps
1. Search codebase for imports from `app.domain.application.ports` - should find none
2. Run existing tests - all should pass
3. Verify application starts correctly

---

## Task 1.2: Extract Index Conversion Logic to Helper Function

### Before Change
The pattern of fetching index price and calculating ratio for SPY is duplicated 6+ times across endpoints in `routers/market.py`:

```python
if ticker == "SPY":
    try:
        index_price = provider.get_index_price("^GSPC")
        if index_price and spot > 0:
            ratio = calculate_index_ratio(spot, index_price)
            resp["index_ticker"] = "^GSPC"
            resp["index_price"] = index_price
            resp["index_ratio"] = ratio
            # ... additional fields
    except Exception as e:
        logger.exception(...)
```

### After Change
**Action:** Create a reusable helper function in `backend/app/routers/helpers.py`

```python
from app.analytics.index_converter import calculate_index_ratio
from app.providers.base import DataProvider
from loguru import logger
from typing import Any

def enrich_with_index_data(
    response_dict: dict[str, Any], 
    ticker: str, 
    spot: float, 
    provider: DataProvider
) -> dict[str, Any]:
    """
    Enrich response dictionary with index price and ratio if ticker is SPY.
    
    This function encapsulates the common pattern of fetching ^GSPC index data
    and adding it to API responses for SPY ticker requests.
    """
    if ticker != "SPY":
        return response_dict
    
    try:
        index_price = provider.get_index_price("^GSPC")
        if index_price and spot > 0:
            ratio = calculate_index_ratio(spot, index_price)
            response_dict["index_ticker"] = "^GSPC"
            response_dict["index_price"] = index_price
            response_dict["index_ratio"] = ratio
            
            # Add spot_price_index if spot_price exists in response
            if "spot_price" in response_dict:
                response_dict["spot_price_index"] = spot * ratio
    except Exception as e:
        logger.exception("Failed to fetch index_price for %s: %s", ticker, e)
    
    return response_dict
```

Then replace the duplicated pattern in each endpoint with calls to this helper.

### Affected Endpoints in routers/market.py
1. `get_price` (lines ~119-141)
2. `get_options` (lines ~177-187)
3. `get_greeks` (lines ~226-236)
4. `get_exposure` (lines ~271-278)
5. `get_max_pain` (lines ~305-316)
6. `get_heatmap` (lines ~333-348)
7. `get_intelligence` (lines ~389-409)

### Rationale
- Eliminates 6+ code duplications
- Single source of truth for index enrichment logic
- Easier to maintain and modify
- Reduces risk of inconsistencies

### Validation Steps
1. Run existing tests
2. Manually test each affected endpoint with SPY ticker
3. Verify index data is still returned correctly
4. Verify API backward compatibility - response structure unchanged

---

## Task 1.3: Extract Frontend Download Handler to Shared Hook

### Before Change
The `handleDownloadWord` function is duplicated in:
- `frontend/src/components/Dashboard.tsx` (lines 72-90)
- `frontend/src/components/GammaExposureView.tsx` (lines 57-75)

### After Change
**Action:** Create `frontend/src/hooks/useReportDownload.ts`

```typescript
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

Then update both components to use the hook:

```typescript
// In Dashboard.tsx and GammaExposureView.tsx
const { isDownloading, handleDownloadWord } = useReportDownload();

// Replace the local handleDownloadWord function
// Update button onClick to call handleDownloadWord(TICKER, selectedExp)
```

### Rationale
- Eliminates code duplication
- Centralizes download logic
- Easier to maintain and test
- Follows React best practices

### Validation Steps
1. Test download functionality in Dashboard
2. Test download functionality in GammaExposureView
3. Verify file naming and content remain unchanged
4. Verify loading state works correctly

---

## Task 1.4: Add Basic Router Endpoint Tests

### Before Change
Limited test coverage for router endpoints. Only integration test exists for analytics pipeline.

### After Change
**Action:** Create `backend/app/tests/test_market_router.py`

```python
import pytest
from fastapi.testclient import TestClient
from unittest.mock import Mock, patch
from datetime import date
from app.main import app

client = TestClient(app)

@pytest.fixture
def mock_provider():
    """Mock provider for testing."""
    provider = Mock()
    provider.get_spot_price.return_value = 550.0
    provider.get_expirations.return_value = [date(2025, 1, 24), date(2025, 1, 31)]
    return provider

def test_get_price(mock_provider):
    """Test price endpoint."""
    with patch('app.routers.market.get_provider', return_value=mock_provider):
        response = client.get("/api/v1/price?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert data["ticker"] == "SPY"
        assert data["price"] == 550.0
        assert "fetched_at" in data

def test_get_expirations(mock_provider):
    """Test expirations endpoint."""
    with patch('app.routers.market.get_provider', return_value=mock_provider):
        response = client.get("/api/v1/expirations?ticker=SPY")
        assert response.status_code == 200
        data = response.json()
        assert "expirations" in data
        assert len(data["expirations"]) > 0

# Add more tests for other key endpoints...
```

### Rationale
- Provides safety net for refactoring
- Ensures API contracts are maintained
- Enables confident future changes
- Improves overall code quality

### Validation Steps
1. All new tests pass
2. All existing tests continue to pass
3. Tests cover happy path for key endpoints

---

## Task 1.5: Remove Empty Infrastructure/Routers Directory

### Before Change
Empty directory `backend/app/infrastructure/routers/` with only an empty `__init__.py` file. Routers are actually in `routers/` directory.

### After Change
**Action:** Delete the empty directory and file

### Rationale
- Eliminates architectural confusion
- Removes dead code
- Aligns with actual implementation
- Zero risk - completely unused

### Validation Steps
1. Run existing tests
2. Verify application starts correctly
3. No imports reference this directory

---

## Execution Order

1. **Task 1.5** (10 min) - Remove empty directory (lowest risk, quick win)
2. **Task 1.1** (15 min) - Remove unused ports.py (low risk, quick win)
3. **Task 1.2** (2 hours) - Extract index conversion helper (core refactoring)
4. **Task 1.3** (1 hour) - Extract download handler hook (frontend refactoring)
5. **Task 1.4** (4 hours) - Add router tests (safety net)

---

## Pre-Execution Checklist

- [ ] Create feature branch from main
- [ ] Ensure all existing tests pass
- [ ] Document current state (screenshots of working app)
- [ ] Commit current state as "pre-sprint-1"

---

## Post-Execution Checklist

- [ ] All 5 tasks completed
- [ ] All existing tests pass
- [ ] New tests pass (Task 1.4)
- [ ] Manual smoke test of all endpoints
- [ ] Manual smoke test of frontend (Dashboard, GammaExposureView)
- [ ] Download functionality tested in both views
- [ ] API backward compatibility verified
- [ ] Git commits per task for easy rollback
- [ ] Update documentation if needed
- [ ] Merge to main with peer review

---

## Rollback Plan

Each task is independently revertible:
- Task 1.1: Restore deleted file from git
- Task 1.2: Revert changes to routers/market.py, delete helpers.py
- Task 1.3: Revert changes to components, delete hook file
- Task 1.4: Delete test file
- Task 1.5: Restore deleted directory from git

Git history allows per-task rollback using:
```bash
git revert <commit-hash>
```

---

## Success Criteria

- [ ] Code duplication reduced by >50 lines
- [ ] Dead code eliminated (2 files)
- [ ] Test coverage increased for router endpoints
- [ ] Architectural consistency improved
- [ ] Zero breaking changes to API
- [ ] All existing functionality preserved
- [ ] Application runs without errors
- [ ] Frontend displays correctly
- [ ] Download functionality works

---

## Notes

- All changes preserve existing behavior
- API backward compatibility is maintained
- No new features are introduced
- Focus is on code quality and maintainability
- Each task will be explained before and after implementation
