---
agent: devin-local
session: spiritual-timer
created: 2026-08-03T13:50:06Z
---
# Plan: Update SPRINT_6_PLAN.md with Gamma Module Technical Specification

## Summary
Update the existing SPRINT_6_PLAN.md to incorporate the comprehensive Gamma Module technical specification, focusing on gaps and enhancements needed to transform the existing Gamma implementation into an institutional-grade trading terminal that meets all specification requirements.

## Current State Analysis

**Existing Gamma Implementation (Already Complete):**
- ✅ Alert engine (`frontend/src/gamma/alerts/alertEngine.ts`) - spot crossing detection, cooldown system
- ✅ Replay engine (`frontend/src/gamma/history/replayEngine.ts`) - pause/resume, speed controls, navigation
- ✅ Lookback dots (`frontend/src/gamma/charts/LookbackDots.tsx`) - historical evolution visualization
- ✅ Gamma calculations (`frontend/src/gamma/calculation/gammaExposure.ts`) - basic exposure calculations
- ✅ Histogram with PixiJS (`frontend/src/gamma/charts/GammaHistogram.tsx`) - canvas-based rendering
- ✅ Type definitions (`frontend/src/gamma/types/gammaTypes.ts`) - comprehensive data models
- ✅ Store management (`frontend/src/gamma/store/gammaStore.ts`, `replayStore.ts`) - Zustand state
- ✅ Configuration system (`frontend/src/gamma/config/`) - colors, chart config
- ✅ Data providers (`frontend/src/gamma/providers/`) - SPY options, Yahoo Finance, synchronization
- ✅ Synchronization provider (`frontend/src/gamma/providers/synchronizationProvider.ts`) - SPY/^GSPC sync

**Gaps Identified (Missing or Incomplete per Specification):**
- ❌ Complete domain layer with pure business logic (calculations mixed with UI logic)
- ❌ Backend TimescaleDB implementation for historical storage
- ❌ Complete zero gamma interpolation (current implementation basic)
- ❌ Major positive/negative gamma calculations need enhancement
- ❌ Dealer bias calculation missing
- ❌ Gamma flip detection missing
- ❌ Net gamma aggregation across all strikes
- ❌ Complete sidebar with all specified metrics
- ❌ Max change calculations (1m, 5m, 10m, 15m, 30m intervals)
- ❌ Comprehensive user settings system
- ❌ Performance optimization to achieve 60 FPS consistently
- ❌ Complete testing infrastructure for gamma components
- ❌ Proper hexagonal architecture separation (domain/application/infrastructure)

## Implementation Steps

### Step 1: Update SPRINT_6_PLAN.md Structure
- Review and reorganize existing SPRINT_6_PLAN.md sections
- Add dedicated Gamma Module Enhancement section
- Update sprint timeline to account for Gamma improvements
- Adjust task priorities based on gap analysis

### Step 2: Create Gamma Enhancement Tasks

**Task 6.1: Domain Layer - Complete Business Logic Separation**
**Priority:** P0 | **Complexity:** High | **Risk:** Medium

**Current State:** Calculations exist but are mixed with UI logic in some components.

**Required Changes:**
- Extract pure business logic from UI components to domain layer
- Implement missing calculations: dealer bias, gamma flip, max change
- Enhance zero gamma interpolation with proper algorithms
- Add net gamma aggregation across all strikes
- Ensure all calculations are deterministic and testable

**Files to Modify:**
- Create: `backend/app/domain/gamma/calculations.py` (pure business logic)
- Create: `backend/app/domain/gamma/aggregations.py`
- Modify: `frontend/src/gamma/calculation/gammaExposure.ts` (enhance existing)
- Create: `frontend/src/gamma/calculation/dealerBias.ts`
- Create: `frontend/src/gamma/calculation/gammaFlip.ts`
- Create: `frontend/src/gamma/calculation/maxChange.ts`

**Acceptance Criteria:**
- All gamma calculations are pure functions with no side effects
- Zero gamma uses proper interpolation between strikes
- Dealer bias calculation implemented
- Gamma flip detection functional
- Max change calculations for all time intervals
- Unit tests achieve 90%+ coverage

---

**Task 6.2: Infrastructure Layer - TimescaleDB Historical Storage**
**Priority:** P0 | **Complexity:** High | **Risk:** Medium

**Current State:** Frontend has snapshot storage but no backend persistence.

**Required Changes:**
- Implement TimescaleDB extension for PostgreSQL
- Create time-series models for gamma snapshots
- Implement efficient data ingestion pipeline
- Add retention policies and archiving
- Create query optimization for historical access patterns

**Files to Modify:**
- Create: `backend/app/db/timescale_models.py`
- Create: `backend/app/db/timescale_repository.py`
- Create: `backend/app/db/timescale_setup.py`
- Modify: `backend/app/config.py` (add TimescaleDB config)
- Modify: `backend/requirements.txt` (add timescaledb dependencies)

**Acceptance Criteria:**
- Historical gamma data stored efficiently in TimescaleDB
- Query performance < 100ms for typical historical queries
- Data retention policies implemented and automated
- Backfill process for initial historical data
- Integration with existing snapshot system

---

**Task 6.3: Application Layer - Enhanced Gamma Pipeline**
**Priority:** P0 | **Complexity:** Medium | **Risk:** Low

**Current State:** Basic pipeline exists but needs enhancement per specification.

**Required Changes:**
- Enhance option chain normalization
- Improve caching strategy with configurable TTL
- Add comprehensive error handling and retry logic
- Implement data validation and quality checks
- Add circuit breaker for external API failures

**Files to Modify:**
- Modify: `frontend/src/gamma/providers/spyOptionsProvider.ts`
- Modify: `frontend/src/gamma/providers/synchronizationProvider.ts`
- Create: `frontend/src/gamma/utils/cacheManager.ts`
- Create: `frontend/src/gamma/utils/dataValidator.ts`

**Acceptance Criteria:**
- Option chain normalization handles edge cases
- Cache invalidation is configurable and reliable
- External API failures handled gracefully with fallbacks
- Data quality checks prevent corruption
- Synchronization within 30-second tolerance consistently

---

**Task 6.4: Presentation Layer - Complete Sidebar Implementation**
**Priority:** P1 | **Complexity:** Medium | **Risk:** Low

**Current State:** Basic metrics exist but incomplete per specification.

**Required Changes:**
- Implement always-visible sidebar with all specified metrics
- Add real-time updates for spot, time, zero gamma, major levels
- Add net gamma display with proper formatting
- Add dealer bias indicator
- Add historical date selector for replay mode
- Add expiration mode selector (LATEST, NEXT, 90 DAY AGGREGATE)

**Files to Modify:**
- Create: `frontend/src/gamma/charts/GammaSidebar.tsx`
- Modify: `frontend/src/pages/GammaGexbot.tsx` (integrate sidebar)
- Modify: `frontend/src/gamma/store/gammaStore.ts` (add sidebar state)

**Acceptance Criteria:**
- Sidebar displays all metrics specified in technical specification
- Real-time updates without performance degradation
- Historical date selector enables replay navigation
- Expiration mode switching works correctly
- Responsive design for desktop/tablet/mobile

---

**Task 6.5: Presentation Layer - Enhanced Tooltip System**
**Priority:** P1 | **Complexity:** Low | **Risk:** Low

**Current State:** Basic tooltip exists but incomplete per specification.

**Required Changes:**
- Enhance tooltip to show all specified information
- Add: strike, expiration, call/put gamma, call/put OI, call/put volume
- Add: net gamma, volume gamma, OI gamma, dealer bias, timestamp
- Implement viewport-aware positioning to prevent overflow
- Add smooth animations and proper z-index

**Files to Modify:**
- Modify: `frontend/src/gamma/charts/EnhancedTooltip.tsx`
- Modify: `frontend/src/gamma/charts/GammaHistogram.tsx` (integrate enhanced tooltip)

**Acceptance Criteria:**
- Tooltip displays all 12 data points specified
- No viewport overflow on any screen size
- Smooth animations without layout shift
- Performance impact < 1ms per tooltip render

---

**Task 6.6: Performance Optimization - 60 FPS Target**
**Priority:** P0 | **Complexity:** High | **Risk:** Medium

**Current State:** PixiJS used but not fully optimized.

**Required Changes:**
- Implement comprehensive memoization strategy
- Add React.memo to all histogram components
- Use useMemo/useCallback for expensive computations
- Implement virtual rendering for large strike datasets
- Optimize canvas rendering pipeline
- Add performance monitoring and profiling

**Files to Modify:**
- Modify: `frontend/src/gamma/charts/GammaHistogram.tsx` (add memoization)
- Modify: `frontend/src/gamma/charts/LookbackDots.tsx` (optimize rendering)
- Create: `frontend/src/gamma/utils/performanceMonitor.ts`
- Create: `frontend/src/gamma/hooks/useMemoizedGamma.ts`

**Acceptance Criteria:**
- Consistent 60 FPS during real-time updates
- Render latency < 16ms per frame
- Memory usage stable during extended sessions
- No jank or frame drops during data updates
- Performance dashboard shows metrics in real-time

---

**Task 6.7: User Settings System**
**Priority:** P2 | **Complexity:** Medium | **Risk:** Low

**Current State:** Basic config exists but incomplete user-facing settings.

**Required Changes:**
- Implement comprehensive settings panel
- Add color configuration (positive, negative, spot, background, grid)
- Add line width and dash style settings
- Add dot size configuration
- Add animation speed controls
- Add replay speed settings
- Add visibility toggles for levels, labels, tooltips
- Persist settings to localStorage

**Files to Modify:**
- Create: `frontend/src/gamma/settings/GammaSettings.tsx`
- Modify: `frontend/src/gamma/config/chartConfig.ts` (make dynamic)
- Create: `frontend/src/gamma/store/settingsStore.ts`

**Acceptance Criteria:**
- All specification-defined settings are configurable
- Settings persist across sessions
- Real-time preview of setting changes
- Reset to defaults functionality
- Responsive settings panel design

---

**Task 6.8: Complete Testing Infrastructure**
**Priority:** P0 | **Complexity:** High | **Risk:** Low

**Current State:** Minimal test coverage for gamma components.

**Required Changes:**
- Implement unit tests for all gamma calculations
- Add integration tests for synchronization
- Add rendering tests for histogram components
- Add replay engine tests
- Add snapshot tests for UI regression
- Configure coverage targets: 80% components, 90% calculations

**Files to Modify:**
- Create: `frontend/src/gamma/calculation/__tests__/`
- Create: `frontend/src/gamma/charts/__tests__/`
- Create: `frontend/src/gamma/history/__tests__/`
- Create: `frontend/src/gamma/providers/__tests__/`
- Modify: `frontend/jest.config.js` (add gamma test paths)

**Acceptance Criteria:**
- 80%+ code coverage for gamma components
- 90%+ coverage for calculation functions
- All critical user flows tested
- CI pipeline runs tests automatically
- Test execution time < 2 minutes

---

**Task 6.9: Architecture Compliance - Hexagonal Pattern**
**Priority:** P1 | **Complexity:** Medium | **Risk:** Medium

**Current State:** Some mixing of concerns between layers.

**Required Changes:**
- Ensure strict separation: Domain (pure logic), Application (coordination), Infrastructure (external), Presentation (UI)
- Remove business logic from React components
- Remove UI logic from calculation functions
- Implement dependency injection for providers
- Add interfaces for all layer boundaries

**Files to Modify:**
- Refactor: `frontend/src/gamma/calculation/` (ensure pure functions)
- Refactor: `frontend/src/gamma/charts/` (remove calculations)
- Create: `frontend/src/gamma/interfaces/` (layer boundaries)
- Modify: `frontend/src/gamma/providers/` (implement DI pattern)

**Acceptance Criteria:**
- Zero business logic in presentation layer
- Zero UI logic in domain layer
- All layer dependencies are interfaces
- Dependency injection implemented for all providers
- Architecture review passes all checks

---

**Task 6.10: Max Change Analysis Feature**
**Priority:** P2 | **Complexity:** Medium | **Risk:** Low

**Current State:** Not implemented.

**Required Changes:**
- Implement max change calculations for specified intervals
- Add display of strike, previous gamma, current gamma, difference, percentage
- Create visualization component for max changes
- Add to sidebar and tooltip

**Files to Modify:**
- Create: `frontend/src/gamma/calculation/maxChange.ts`
- Create: `frontend/src/gamma/charts/MaxChangePanel.tsx`
- Modify: `frontend/src/gamma/types/gammaTypes.ts` (add MaxChangeData)

**Acceptance Criteria:**
- Max change calculated for 1m, 5m, 10m, 15m, 30m intervals
- Display shows all required data points
- Real-time updates during market hours
- Historical max change analysis in replay mode

### Step 4: Update Sprint Organization and Timeline
- Reorganize SPRINT_6_PLAN.md to integrate Gamma enhancements alongside existing intelligence work
- Adjust timeline: Gamma enhancements estimated 4-6 weeks (not 6-8, since 60% of features already exist)
- Update sprint phases to include Gamma tasks in parallel with intelligence tasks
- Add dependencies between Gamma tasks and existing Sprint 6 tasks (e.g., TimescaleDB for both gamma and intelligence historical data)
- Rebalance team allocation: 1 engineer on Gamma, 1-2 on intelligence work

### Step 5: Add Technical Specifications Section
Add comprehensive technical specifications to SPRINT_6_PLAN.md:
- Complete architecture diagram showing hexagonal layers with existing components mapped
- Data model documentation mapping existing types to specification requirements
- Color scheme specification (implementing spec colors: positive green, negative red, spot cyan, zero gamma orange, etc.)
- Performance requirements matrix (60 FPS target, <16ms render latency, <100ms query times)
- Configuration parameter documentation (all spec-defined settings)
- API specification for gamma endpoints (enhance existing market API)

### Step 6: Update Acceptance Criteria
Add comprehensive Gamma-specific acceptance criteria to SPRINT_6_PLAN.md:
- ✓ Gamma updates correctly with real-time data (existing, verify and enhance)
- ✓ Replay reproduces historical sessions accurately (existing, enhance with TimescaleDB)
- ✓ Zero gamma calculation uses proper interpolation (enhance existing implementation)
- ✓ Major positive/negative gamma levels are correct (enhance existing calculations)
- ✓ Histogram animates smoothly at 60 FPS (optimize existing PixiJS implementation)
- ✓ Tooltips show complete strike information (enhance existing tooltip)
- ✓ Synchronization with ^GSPC is within 30-second tolerance (verify existing sync provider)
- ✓ No duplicated code exists (refactor as needed)
- ✓ Architecture remains modular (hexagonal compliance - enforce separation)
- ✓ Business logic stays isolated from rendering (extract logic from components)
- ✓ Every feature is configurable via settings (implement complete settings system)
- ✓ Interface feels comparable to institutional trading platforms (UX polish)
- ✓ Historical data persisted in TimescaleDB (implement backend storage)
- ✓ Max change analysis functional (implement new feature)
- ✓ Dealer bias calculation implemented (implement new feature)
- ✓ Gamma flip detection working (implement new feature)
- ✓ Sidebar displays all specified metrics (implement complete sidebar)
- ✓ Settings system complete and functional (implement user settings)
- ✓ Test coverage meets targets (80% components, 90% calculations)

### Step 7: Add Risk Assessment and Mitigation
Add Gamma-specific risks and mitigation strategies to SPRINT_6_PLAN.md:
- **Performance Risk**: 60 FPS target may not be achievable with complex calculations
  - *Mitigation*: Implement aggressive memoization, virtual rendering, canvas optimization, performance monitoring
- **Synchronization Risk**: 30-second tolerance may be difficult during market volatility
  - *Mitigation*: Enhance existing retry logic, improve caching, add fallback to last known good state
- **Architecture Risk**: Hexagonal separation may require significant refactoring of existing code
  - *Mitigation*: Incremental refactoring, start with new features, gradual migration of existing code
- **Data Quality Risk**: Historical data backfill may be incomplete or inaccurate
  - *Mitigation*: Implement data validation, quality checks, manual verification of sample data
- **Storage Risk**: TimescaleDB may require significant resources for historical data
  - *Mitigation*: Implement retention policies, archiving, query optimization, estimate 1-2GB/day
- **Integration Risk**: Gamma enhancements may break existing functionality
  - *Mitigation*: Comprehensive testing, feature flags, gradual rollout, maintain backward compatibility

### Step 8: Update Dependencies and Resources
Add to SPRINT_6_PLAN.md:
- **New Dependencies**: TimescaleDB (backend), additional PixiJS plugins (frontend), performance monitoring tools
- **Storage Requirements**: Estimate 1-2GB per day for historical gamma data with TimescaleDB compression
- **Compute Requirements**: Additional CPU for real-time calculations, GPU optimization for canvas rendering
- **API Dependencies**: Verify Yahoo Finance rate limits, option data provider SLA, ^GSPC data availability
- **Team Resources**: 1 engineer dedicated to Gamma enhancements during sprint, can work in parallel with intelligence team

## Files to Modify
- `Planes/planes/SPRINT_6_PLAN.md` - Main sprint plan document (primary target)

**New Files to Create (as part of Gamma enhancements):**
- `backend/app/domain/gamma/calculations.py` - Pure business logic for gamma calculations
- `backend/app/domain/gamma/aggregations.py` - Aggregation functions for gamma data
- `backend/app/db/timescale_models.py` - TimescaleDB models for historical storage
- `backend/app/db/timescale_repository.py` - Repository for time-series data access
- `backend/app/db/timescale_setup.py` - TimescaleDB setup and configuration
- `frontend/src/gamma/calculation/dealerBias.ts` - Dealer bias calculation
- `frontend/src/gamma/calculation/gammaFlip.ts` - Gamma flip detection
- `frontend/src/gamma/calculation/maxChange.ts` - Max change analysis
- `frontend/src/gamma/charts/GammaSidebar.tsx` - Complete sidebar component
- `frontend/src/gamma/charts/MaxChangePanel.tsx` - Max change visualization
- `frontend/src/gamma/settings/GammaSettings.tsx` - User settings panel
- `frontend/src/gamma/store/settingsStore.ts` - Settings state management
- `frontend/src/gamma/utils/cacheManager.ts` - Enhanced cache management
- `frontend/src/gamma/utils/dataValidator.ts` - Data validation utilities
- `frontend/src/gamma/utils/performanceMonitor.ts` - Performance monitoring
- `frontend/src/gamma/hooks/useMemoizedGamma.ts` - Memoized gamma data hook
- `frontend/src/gamma/interfaces/` - Layer boundary interfaces

**Existing Files to Modify:**
- `backend/app/config.py` - Add TimescaleDB configuration
- `backend/requirements.txt` - Add TimescaleDB dependencies
- `frontend/src/gamma/calculation/gammaExposure.ts` - Enhance calculations
- `frontend/src/gamma/charts/GammaHistogram.tsx` - Add memoization, optimize
- `frontend/src/gamma/charts/LookbackDots.tsx` - Optimize rendering
- `frontend/src/gamma/charts/EnhancedTooltip.tsx` - Add all specification fields
- `frontend/src/gamma/providers/spyOptionsProvider.ts` - Enhance normalization
- `frontend/src/gamma/providers/synchronizationProvider.ts` - Improve sync reliability
- `frontend/src/gamma/config/chartConfig.ts` - Make dynamic for user settings
- `frontend/src/gamma/store/gammaStore.ts` - Add sidebar state
- `frontend/src/pages/GammaGexbot.tsx` - Integrate complete sidebar
- `frontend/jest.config.js` - Add gamma test paths
- Multiple test files in `frontend/src/gamma/**/__tests__/`

## Verification
- [ ] Plan document includes all Gamma specification requirements
- [ ] Task estimates are realistic (4-6 weeks for enhancements, not 6-8 for complete rewrite)
- [ ] Architecture diagrams reflect hexagonal design with existing components
- [ ] Acceptance criteria match specification exactly
- [ ] Performance requirements are clearly stated (60 FPS, <16ms render latency)
- [ ] Testing strategy covers all Gamma components (80% components, 90% calculations)
- [ ] Timeline accounts for Gamma module complexity (parallel with intelligence work)
- [ ] Dependencies between Gamma and existing Sprint 6 tasks are identified
- [ ] Resource allocation is realistic (1 engineer on Gamma, 1-2 on intelligence)
- [ ] Risk mitigation strategies are comprehensive
- [ ] Backward compatibility is maintained for existing features

## Risks/Considerations
- **Reduced Complexity**: Gamma module is 60% complete, so risk is lower than full implementation
- **Performance**: 60 FPS target requires careful optimization but PixiJS foundation exists
- **Data Synchronization**: Existing sync provider works, needs enhancement for 30-second tolerance
- **Historical Data**: TimescaleDB implementation needed but architecture is well-understood
- **Backward Compatibility**: Must preserve existing Gamma features while adding enhancements
- **Testing Coverage**: Comprehensive testing required but test infrastructure exists from Sprint 6
- **Team Allocation**: Can work in parallel with intelligence team, not blocking other sprint goals
- **Timeline Risk**: 4-6 weeks may be optimistic if architecture refactoring takes longer than expected
- **Integration Risk**: TimescaleDB integration may impact other parts of the system using historical data

## Next Steps After Plan Approval
1. Begin with Task 6.1 (Domain Layer) as it enables all other tasks
2. Implement Task 6.2 (TimescaleDB) in parallel with Task 6.1 if resources allow
3. Follow with Task 6.3 (Application Layer) to enhance data pipeline
4. Implement presentation layer tasks (6.4, 6.5) in parallel
5. Performance optimization (6.6) should be ongoing throughout
6. Testing (6.8) should accompany each task, not be left to the end
7. Architecture compliance (6.9) should be verified after each major change
8. User settings (6.7) and max change (6.10) can be implemented later in sprint