# Sprint 3 Implementation Plan

**Date:** 2026-07-29
**Sprint:** 3
**Goal:** Enhance query engine with dynamic responses and improve Word report generation with customization
**Duration Estimate:** 2 days
**Risk Level:** Medium

---

## Sprint 3 Tasks Overview

| Task | Description | Effort | Risk | Priority |
|------|-------------|--------|------|----------|
| 3.1 | Refactor QueryEngine for dynamic response generation | 4 hours | Medium | P1 |
| 3.2 | Add context-aware response templates | 3 hours | Low | P1 |
| 3.3 | Implement response caching with invalidation | 2 hours | Low | P2 |
| 3.4 | Add Word report customization options | 3 hours | Medium | P1 |
| 3.5 | Improve docx_generator with dynamic sections | 4 hours | Medium | P1 |

---

## Task 3.1: Refactor QueryEngine for Dynamic Response Generation

### Before Change
**File:** `backend/app/analytics/query_engine.py`

The current `QueryEngine.answer_question()` method uses hardcoded, static templates for each question. Responses are always identical regardless of market conditions, ticker, or time context. The logic is monolithic with if-elif chains and no extensibility.

**Problems Identified:**
- Responses are static strings with minimal dynamic interpolation
- No adaptation to different market regimes (bull/bear/sideways)
- No consideration of volatility levels or unusual conditions
- Hard to add new questions without modifying core logic
- No support for multi-language or personalization
- Limited to 6 predefined questions

### After Change
**Action:** Refactor `QueryEngine` to use a strategy pattern with dynamic response builders.

**File:** `backend/app/analytics/query_engine.py`

```python
from abc import ABC, abstractmethod
from typing import Any
from dataclasses import dataclass

@dataclass
class QuestionTemplate:
    key: str
    label: str
    category: str
    builder_class: type

class ResponseBuilder(ABC):
    """Base class for dynamic response generation."""
    
    @abstractmethod
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        """Generate response with dynamic content based on context."""
        pass
    
    @abstractmethod
    def get_confidence(self, context: dict[str, Any]) -> str:
        """Calculate confidence level based on data quality."""
        pass

class WhyRisingBuilder(ResponseBuilder):
    """Dynamic builder for 'why_rising' question."""
    
    def build_response(self, context: dict[str, Any]) -> dict[str, Any]:
        spot = context.get("spot", 0.0)
        gamma = context.get("gamma", {})
        delta = context.get("delta", {})
        options = context.get("options", {})
        
        # Dynamic factors based on actual market conditions
        factors = self._identify_rising_factors(spot, gamma, delta, options)
        
        # Build contextual narrative
        answer = self._build_narrative(factors, context)
        
        return {
            "question_key": "why_rising",
            "answer": answer,
            "justification_data": self._extract_justification(factors),
            "confidence": self.get_confidence(context)
        }
    
    def _identify_rising_factors(self, spot: float, gamma: Any, delta: Any, options: Any) -> list[dict]:
        """Identify and prioritize factors causing price rise."""
        factors = []
        
        # Gamma regime analysis
        if gamma.regime_type == "positive":
            factors.append({
                "type": "gamma_regime",
                "weight": 0.4,
                "description": f"Régimen Gamma Positiva con Net GEX de ${gamma.net_gamma_exposure:,.0f}",
                "impact": "high"
            })
        
        # Delta flow analysis
        if delta.regime_type == "call_dominated":
            factors.append({
                "type": "delta_flow",
                "weight": 0.3,
                "description": f"Flujo Delta positivo de ${delta.net_delta_exposure:,.0f}",
                "impact": "high"
            })
        
        # Volume ratio analysis
        if options.put_call_volume_ratio < 0.85:
            factors.append({
                "type": "volume_sentiment",
                "weight": 0.2,
                "description": f"Put/Call Volume Ratio bajo ({options.put_call_volume_ratio:.2f})",
                "impact": "medium"
            })
        
        # Max pain positioning
        max_pain = context.get("max_pain", 0.0)
        if spot > max_pain:
            distance_pct = ((spot - max_pain) / spot) * 100
            factors.append({
                "type": "max_pain_position",
                "weight": 0.1,
                "description": f"Precio {distance_pct:.1f}% sobre Max Pain",
                "impact": "low"
            })
        
        return sorted(factors, key=lambda x: x["weight"], reverse=True)
    
    def _build_narrative(self, factors: list[dict], context: dict[str, Any]) -> str:
        """Build contextual narrative based on identified factors."""
        if not factors:
            return "La estructura de opciones no muestra un sesgo alcista claro. El movimiento podría estar impulsado por flujos fuera de opciones."
        
        narrative = "La subida del precio está respaldada por:\n\n"
        for factor in factors:
            narrative += f"- **{factor['type'].replace('_', ' ').title()}**: {factor['description']}\n"
        
        # Add contextual insight
        if len(factors) >= 2:
            narrative += f"\nLa confluencia de {len(factors)} factores indica un sesgo alcista estructural."
        
        return narrative
    
    def _extract_justification(self, factors: list[dict]) -> dict[str, Any]:
        """Extract quantitative justification data."""
        return {
            "primary_factors": [f["type"] for f in factors[:3]],
            "factor_weights": {f["type"]: f["weight"] for f in factors},
            "total_weight": sum(f["weight"] for f in factors)
        }
    
    def get_confidence(self, context: dict[str, Any]) -> str:
        """Calculate confidence based on data availability and consistency."""
        confidence_score = 0.0
        
        # Check data quality
        if context.get("gamma") and context.get("delta"):
            confidence_score += 0.4
        if context.get("options"):
            confidence_score += 0.3
        if context.get("vol"):
            confidence_score += 0.3
        
        if confidence_score >= 0.8:
            return "high"
        elif confidence_score >= 0.5:
            return "medium"
        else:
            return "low"

class QueryEngine:
    _builders: dict[str, ResponseBuilder] = {}
    _templates: list[QuestionTemplate] = []
    
    @classmethod
    def register_builder(cls, template: QuestionTemplate):
        """Register a new question builder."""
        cls._builders[template.key] = template.builder_class()
        cls._templates.append(template)
    
    @classmethod
    def list_supported_questions(cls) -> list[dict[str, str]]:
        """Return list of supported questions."""
        return [
            {
                "key": t.key,
                "label": t.label,
                "category": t.category
            }
            for t in cls._templates
        ]
    
    @classmethod
    def answer_question(cls, question_key: str, context: dict[str, Any]) -> dict[str, Any]:
        """Answer a question using the registered builder."""
        builder = cls._builders.get(question_key)
        if not builder:
            return {
                "question_key": question_key,
                "answer": "Pregunta no soportada por el motor de inteligencia.",
                "justification_data": {},
                "confidence": "none"
            }
        
        return builder.build_response(context)

# Register default builders
QueryEngine.register_builder(QuestionTemplate(
    key="why_rising",
    label="¿Por qué el precio está subiendo?",
    category="Dirección",
    builder_class=WhyRisingBuilder
))
# Register other builders similarly...
```

### Rationale
- **Extensibility:** New questions can be added by creating new builder classes
- **Dynamic responses:** Responses adapt to actual market conditions
- **Maintainability:** Each question logic is isolated in its own class
- **Testability:** Each builder can be tested independently
- **Confidence scoring:** Provides transparency about response reliability

### Validation Steps
1. Test `/api/v1/questions` endpoint - should return same questions
2. Test `/api/v1/query` with existing questions - responses should be more contextual
3. Verify confidence levels are calculated correctly
4. Add unit tests for each builder class
5. Ensure backward compatibility with existing frontend

---

## Task 3.2: Add Context-Aware Response Templates

### Before Change
Response templates are hardcoded strings with minimal variable interpolation. No adaptation to:
- Market regime (bull/bear/sideways)
- Volatility levels (low/normal/high)
- Time of day or trading session
- Ticker-specific characteristics

### After Change
**Action:** Create a template system with context-aware rendering.

**File:** `backend/app/analytics/response_templates.py`

```python
from typing import Any
from enum import Enum

class MarketRegime(Enum):
    BULL = "bull"
    BEAR = "bear"
    SIDEWAYS = "sideways"

class VolatilityLevel(Enum):
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"

class ResponseTemplate:
    """Context-aware response template system."""
    
    @staticmethod
    def get_regime(context: dict[str, Any]) -> MarketRegime:
        """Determine market regime from context."""
        scores = context.get("scores", {})
        bullish = scores.get("bullish_score", 0)
        bearish = scores.get("bearish_score", 0)
        
        if bullish > bearish + 15:
            return MarketRegime.BULL
        elif bearish > bullish + 15:
            return MarketRegime.BEAR
        else:
            return MarketRegime.SIDEWAYS
    
    @staticmethod
    def get_volatility_level(context: dict[str, Any]) -> VolatilityLevel:
        """Determine volatility level from context."""
        vol = context.get("vol", {})
        vix = vol.get("vix_current", 15)
        
        if vix < 14:
            return VolatilityLevel.LOW
        elif vix < 20:
            return VolatilityLevel.NORMAL
        else:
            return VolatilityLevel.HIGH
    
    @staticmethod
    def render_template(template_key: str, context: dict[str, Any]) -> str:
        """Render template with context-aware adaptations."""
        regime = ResponseTemplate.get_regime(context)
        vol_level = ResponseTemplate.get_volatility_level(context)
        
        templates = {
            "why_rising": ResponseTemplate._why_rising_template(regime, vol_level, context),
            "why_falling_fast": ResponseTemplate._why_falling_template(regime, vol_level, context),
            # ... other templates
        }
        
        return templates.get(template_key, "Template not found")
    
    @staticmethod
    def _why_rising_template(regime: MarketRegime, vol: VolatilityLevel, context: dict[str, Any]) -> str:
        """Dynamic template for 'why_rising' question."""
        base = "La subida del precio está respaldada por:\n\n"
        
        # Regime-specific additions
        if regime == MarketRegime.BULL:
            base += "- **Sesgo Alcista Confirmado**: Los indicadores estructurales muestran un sesgo alcista consistente.\n"
        elif regime == MarketRegime.SIDEWAYS:
            base += "- **Ruptura de Lateralidad**: El precio rompe el rango lateral con fuerza.\n"
        
        # Volatility-specific additions
        if vol == VolatilityLevel.HIGH:
            base += "- **Subida en Volatilidad Alta**: El movimiento ocurre con volatilidad elevada, indicando posible cambio de régimen.\n"
        elif vol == VolatilityLevel.LOW:
            base += "- **Subida en Volatilidad Baja**: El movimiento es eficiente y sostenido, sin excesos de especulación.\n"
        
        return base
```

### Rationale
- **Context awareness:** Responses adapt to market conditions
- **Personalization:** Different narratives for different regimes
- **Transparency:** Clear indication of market context in responses
- **Flexibility:** Easy to add new context dimensions

### Validation Steps
1. Test responses in different market regimes
2. Verify volatility level detection is accurate
3. Check that templates render correctly with all context combinations
4. Add integration tests for template rendering

---

## Task 3.3: Implement Response Caching with Invalidation

### Before Change
Every call to `/api/v1/query` regenerates the full intelligence report and processes the query, even for identical questions within the same session. This causes:
- Unnecessary API calls to Yahoo Finance
- Increased latency for repeated questions
- Higher resource consumption

### After Change
**Action:** Add caching layer for query responses with intelligent invalidation.

**File:** `backend/app/analytics/query_cache.py`

```python
from functools import lru_cache
from typing import Any
from datetime import datetime, timedelta
import hashlib

class QueryCache:
    """Cache for query responses with intelligent invalidation."""
    
    def __init__(self, ttl_seconds: int = 300):
        self.ttl = ttl_seconds
        self._cache: dict[str, tuple[dict[str, Any], datetime]] = {}
    
    def _generate_key(self, question_key: str, ticker: str, expiration: str) -> str:
        """Generate cache key from query parameters."""
        key_str = f"{question_key}:{ticker}:{expiration}"
        return hashlib.md5(key_str.encode()).hexdigest()
    
    def get(self, question_key: str, ticker: str, expiration: str) -> dict[str, Any] | None:
        """Get cached response if valid."""
        key = self._generate_key(question_key, ticker, expiration)
        
        if key not in self._cache:
            return None
        
        response, timestamp = self._cache[key]
        
        # Check if cache is expired
        if datetime.now() - timestamp > timedelta(seconds=self.ttl):
            del self._cache[key]
            return None
        
        return response
    
    def set(self, question_key: str, ticker: str, expiration: str, response: dict[str, Any]):
        """Cache a response."""
        key = self._generate_key(question_key, ticker, expiration)
        self._cache[key] = (response, datetime.now())
    
    def invalidate_ticker(self, ticker: str):
        """Invalidate all cache entries for a specific ticker."""
        keys_to_delete = [
            key for key in self._cache
            if ticker in key  # Simple check - could be improved
        ]
        for key in keys_to_delete:
            del self._cache[key]
    
    def clear(self):
        """Clear all cache entries."""
        self._cache.clear()

# Global cache instance
query_cache = QueryCache(ttl_seconds=300)
```

**Update endpoint in `routers/intelligence.py`:**

```python
@router.get("/query", response_model=QueryResponse)
def get_query(
    question_key: str = Query(...),
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    exp_str = exp.strftime("%Y-%m-%d")
    
    # Check cache first
    cached_response = query_cache.get(question_key, ticker, exp_str)
    if cached_response:
        return QueryResponse(**cached_response)
    
    # Generate response
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    answer_dict = QueryEngine.answer_question(question_key, report["query_context"])
    
    response = QueryResponse(
        question_key=answer_dict["question_key"],
        answer=answer_dict["answer"],
        justification_data=answer_dict["justification_data"],
        confidence=answer_dict["confidence"]
    )
    
    # Cache the response
    query_cache.set(question_key, ticker, exp_str, answer_dict)
    
    return response
```

### Rationale
- **Reduced latency:** Repeated questions return instantly
- **Lower API usage:** Fewer calls to Yahoo Finance
- **Better UX:** Faster response times for common queries
- **Configurable TTL:** Cache duration can be adjusted per use case

### Validation Steps
1. Test cache hit for identical queries
2. Verify cache invalidation after TTL expires
3. Test that different questions generate different cache keys
4. Monitor cache hit rate in production
5. Add metrics for cache performance

---

## Task 3.4: Add Word Report Customization Options

### Before Change
**File:** `backend/app/analytics/docx_generator.py`

The Word report generation is completely static. All reports include:
- Fixed sections in fixed order
- All charts regardless of relevance
- No option to include/exclude specific sections
- No customization for different use cases (executive summary vs detailed analysis)

### After Change
**Action:** Add customization options to report generation.

**File:** `backend/app/analytics/docx_generator.py`

```python
from dataclasses import dataclass
from typing import Any

@dataclass
class ReportConfig:
    """Configuration for Word report generation."""
    include_executive_summary: bool = True
    include_asset_data: bool = True
    include_market_interpretation: bool = True
    include_gamma_exposure: bool = True
    include_delta_exposure: bool = True
    include_open_interest: bool = True
    include_volume: bool = True
    include_structural_levels: bool = True
    include_detailed_analysis: bool = True
    include_scenarios: bool = True
    include_conclusions: bool = True
    include_charts: bool = True
    chart_types: list[str] = None  # ["gex", "dex", "oi", "volume"]
    language: str = "es"  # "es" or "en"
    
    def __post_init__(self):
        if self.chart_types is None:
            self.chart_types = ["gex", "dex", "oi", "volume"]

def generate_docx_report(
    report: dict,
    analytics_exposure: dict[str, Any],
    chart_exposure: dict[str, Any],
    chart_source: str | None = None,
    chart_ratio: float | None = None,
    config: ReportConfig = None,
) -> io.BytesIO:
    """Generate Word report with customization options."""
    if config is None:
        config = ReportConfig()
    
    doc = Document()
    
    # Title and metadata
    _add_title_section(doc, report, chart_source, config)
    
    # Conditional sections based on config
    if config.include_executive_summary:
        _add_executive_summary(doc, report, analytics_exposure, chart_source, config)
    
    if config.include_asset_data:
        _add_asset_data_section(doc, report, analytics_exposure, chart_source, config)
    
    if config.include_market_interpretation:
        _add_market_interpretation(doc, report, config)
    
    if config.include_gamma_exposure:
        _add_gamma_section(doc, analytics_exposure, chart_exposure, chart_source, chart_ratio, config)
    
    if config.include_delta_exposure:
        _add_delta_section(doc, analytics_exposure, chart_exposure, chart_source, chart_ratio, config)
    
    # ... other conditional sections
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
```

**Update endpoint in `routers/intelligence.py`:**

```python
from app.analytics.docx_generator import ReportConfig

@router.get("/download-report")
def download_report(
    ticker: str = Query(default=settings.default_ticker),
    expiration: str | None = Query(default=None),
    include_sections: str | None = Query(default=None, description="Comma-separated sections to include"),
    exclude_sections: str | None = Query(default=None, description="Comma-separated sections to exclude"),
    language: str = Query(default="es", description="Report language: es or en"),
    provider: DataProvider = Depends(get_provider_dependency),
):
    exp = _resolve_expiration(ticker, expiration, provider)
    
    # Build config from query parameters
    config = ReportConfig(language=language)
    
    if include_sections:
        sections = include_sections.split(",")
        # Reset all to False, then enable only requested
        config = ReportConfig(language=language)
        for section in sections:
            setattr(config, f"include_{section.strip()}", True)
    
    if exclude_sections:
        sections = exclude_sections.split(",")
        for section in sections:
            setattr(config, f"include_{section.strip()}", False)
    
    # Generate report with config
    report = MarketAnalyzer.generate_intelligence_report(ticker, exp)
    # ... rest of the logic with config passed to generate_docx_report
```

### Rationale
- **Flexibility:** Users can customize report content
- **Use case adaptation:** Executive summary vs detailed analysis
- **Performance:** Exclude unnecessary sections for faster generation
- **Multi-language support:** Foundation for English/Spanish reports
- **Backward compatible:** Default config includes all sections

### Validation Steps
1. Test report generation with default config (should match current behavior)
2. Test with specific sections included
3. Test with sections excluded
4. Test language parameter
5. Verify file size reduction when sections are excluded
6. Add unit tests for config parsing

---

## Task 3.5: Improve docx_generator with Dynamic Sections

### Before Change
The `generate_docx_report` function is a monolithic 300+ line function with:
- Hardcoded section order
- Repeated formatting code
- No separation of concerns
- Difficult to test individual sections
- No reusability of section generators

### After Change
**Action:** Refactor into modular section generators.

**File:** `backend/app/analytics/docx_generator.py`

```python
from typing import Any

class SectionGenerator:
    """Base class for report section generators."""
    
    def __init__(self, doc: Document, config: ReportConfig):
        self.doc = doc
        self.config = config
    
    def add(self, *args, **kwargs):
        """Add section to document."""
        raise NotImplementedError

class ExecutiveSummaryGenerator(SectionGenerator):
    """Generator for executive summary section."""
    
    def add(self, report: dict, exposure: dict, display_ticker: str):
        _add_heading(self.doc, "1. Resumen Ejecutivo" if self.config.language == "es" else "1. Executive Summary")
        summary = _executive_summary(report, exposure, display_ticker)
        p = self.doc.add_paragraph(summary)
        self._format_paragraph(p)

class AssetDataGenerator(SectionGenerator):
    """Generator for asset data section."""
    
    def add(self, report: dict, exposure: dict, display_ticker: str):
        _add_heading(self.doc, "2. Datos del Activo" if self.config.language == "es" else "2. Asset Data")
        
        rows = self._build_rows(report, exposure, display_ticker)
        _add_kv_table(self.doc, rows)
    
    def _build_rows(self, report: dict, exposure: dict, display_ticker: str) -> list[tuple[str, str]]:
        return [
            ("Ticker", display_ticker),
            ("Precio Spot", f"${exposure['spot_price']:.2f}" if exposure.get('spot_price') else "N/A"),
            ("Vencimiento", _g(report, 'expiration', 'N/A')),
            ("Net GEX", _fmt_money(exposure.get("net_gamma_exposure"))),
            ("Net DEX", _fmt_money(exposure.get("net_delta_exposure"))),
            ("Put/Call OI Ratio", f"{exposure.get('put_call_oi_ratio', 0):.3f}"),
        ]

class GammaExposureGenerator(SectionGenerator):
    """Generator for gamma exposure section."""
    
    def add(self, analytics_exposure: dict, chart_exposure: dict, chart_source: str, chart_ratio: float):
        _add_heading(self.doc, "4. Gamma Exposure")
        
        # Add description
        p = self.doc.add_paragraph(
            f"Exposición gamma neta: {_fmt_money(analytics_exposure.get('net_gamma_exposure'))}. "
            f"{_g(_g(report, 'gamma_analysis', {}), 'expected_behavior', '')}"
        )
        self._format_paragraph(p)
        
        # Add chart if enabled
        if self.config.include_charts and "gex" in self.config.chart_types:
            _add_chart(self.doc, generate_gex_chart(chart_exposure), "Figura 1 — Perfil de Gamma Exposure")

def generate_docx_report(
    report: dict,
    analytics_exposure: dict[str, Any],
    chart_exposure: dict[str, Any],
    chart_source: str | None = None,
    chart_ratio: float | None = None,
    config: ReportConfig = None,
) -> io.BytesIO:
    """Generate Word report using modular section generators."""
    if config is None:
        config = ReportConfig()
    
    doc = Document()
    _setup_document(doc)
    
    display_ticker = chart_source if chart_source and chart_source != _g(report, 'ticker', '') else _g(report, 'ticker', 'UNKNOWN')
    
    # Add sections using generators
    generators = []
    
    if config.include_executive_summary:
        generators.append(ExecutiveSummaryGenerator(doc, config))
    
    if config.include_asset_data:
        generators.append(AssetDataGenerator(doc, config))
    
    if config.include_gamma_exposure:
        generators.append(GammaExposureGenerator(doc, config))
    
    # Execute generators
    for generator in generators:
        generator.add(report, analytics_exposure, display_ticker)
    
    buffer = io.BytesIO()
    doc.save(buffer)
    buffer.seek(0)
    return buffer
```

### Rationale
- **Modularity:** Each section is a separate, testable component
- **Maintainability:** Easier to modify individual sections
- **Reusability:** Section generators can be reused across different report types
- **Testability:** Each generator can be unit tested independently
- **Extensibility:** New sections can be added without modifying core logic

### Validation Steps
1. Test report generation with all generators
2. Test with selective generators (via config)
3. Verify formatting is consistent across sections
4. Add unit tests for each generator
5. Ensure backward compatibility with existing reports

---

## Execution Order

1. **Task 3.1** (4 hours) - Refactor QueryEngine (foundational change)
2. **Task 3.2** (3 hours) - Add context-aware templates (builds on 3.1)
3. **Task 3.3** (2 hours) - Implement caching (independent, low risk)
4. **Task 3.4** (3 hours) - Add report customization (independent)
5. **Task 3.5** (4 hours) - Refactor docx_generator (builds on 3.4)

---

## Pre-Execution Checklist

- [x] All Sprint 2 tasks completed and verified
- [x] Existing test suite passing (16/16)
- [x] Working on main branch
- [ ] Create feature branch from main
- [ ] Document current query responses (screenshots)
- [ ] Document current Word report structure

---

## Post-Execution Checklist

- [ ] All 5 tasks completed
- [ ] All existing tests pass
- [ ] New unit tests for QueryEngine builders
- [ ] New unit tests for section generators
- [ ] Integration tests for caching
- [ ] Manual testing of query responses with different market conditions
- [ ] Manual testing of Word report customization
- [ ] Performance benchmarks for cached vs uncached queries
- [ ] API backward compatibility verified
- [ ] Git commits per task for easy rollback

---

## Rollback Plan

Each task is independently revertible:
- Task 3.1: Restore original `query_engine.py` from git
- Task 3.2: Remove `response_templates.py`, revert `query_engine.py`
- Task 3.3: Remove caching logic from endpoint, delete `query_cache.py`
- Task 3.4: Remove config parameters from endpoint, revert `docx_generator.py`
- Task 3.5: Restore monolithic `generate_docx_report` function

```bash
git revert <commit-hash>
```

---

## Success Criteria

- [ ] Query responses are dynamic and context-aware
- [ ] At least 3 new response templates implemented
- [ ] Cache hit rate > 50% for repeated queries
- [ ] Word report generation supports section customization
- [ ] Word report generation supports language selection
- [ ] docx_generator refactored into modular generators
- [ ] All existing functionality preserved
- [ ] Zero breaking changes to API
- [ ] Response time for cached queries < 50ms
- [ ] Unit test coverage increased by > 20%

---

## Notes

- **Backward Compatibility:** All changes preserve existing API contracts
- **Performance:** Caching should significantly reduce latency for repeated queries
- **Extensibility:** New questions and report sections can be added without modifying core logic
- **Testing:** Each component should have corresponding unit tests
- **Documentation:** Update API_ROUTES.md with new customization parameters

---

## Technical Debt Identified

### Query Engine
- **Static responses:** Hardcoded templates don't adapt to market conditions
- **Limited questions:** Only 6 predefined questions
- **No learning:** No mechanism to improve responses over time
- **No context:** Doesn't consider time of day, session, or user preferences

### Word Report Generation
- **Monolithic function:** 300+ line function is hard to maintain
- **No customization:** All reports have identical structure
- **No localization:** Only Spanish language supported
- **Performance:** Always generates all sections even if not needed

### Future Improvements (Beyond Sprint 3)
- **ML-based responses:** Use machine learning to generate more sophisticated answers
- **User-specific customization:** Remember user preferences for report sections
- **Real-time updates:** WebSocket integration for live query responses
- **Multi-language support:** Full English/Spanish localization
- **Export formats:** Support PDF, Excel, and other formats
