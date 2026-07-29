# Sprint 4 Implementation Plan

**Date:** 2026-07-29
**Sprint:** 4
**Goal:** First production deployment of SPY-Intel web application
**Duration Estimate:** 1 day
**Risk Level:** Medium

---

## Sprint 4 Tasks Overview

| Task | Description | Effort | Risk | Priority |
|------|-------------|--------|------|----------|
| 4.1 | Create Docker configuration for backend | 2 hours | Low | P1 |
| 4.2 | Configure environment variables for production | 1 hour | Low | P1 |
| 4.3 | Deploy backend to Railway | 2 hours | Medium | P1 |
| 4.4 | Configure frontend for production API URL | 1 hour | Low | P1 |
| 4.5 | Deploy frontend to Vercel | 2 hours | Medium | P1 |
| 4.6 | Test production deployment end-to-end | 1 hour | Medium | P1 |

---

## Task 4.1: Create Docker Configuration for Backend

### Before Change
**Current State:**
- No Dockerfile exists
- Backend runs locally with `uvicorn app.main:app`
- Dependencies in `requirements.txt`
- No containerization strategy

### After Change
**Action:** Create Dockerfile and docker-compose.yml for backend.

**File:** `backend/Dockerfile`
```dockerfile
FROM python:3.13-slim

WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements first for caching
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code
COPY . .

# Expose port
EXPOSE 8000

# Run with uvicorn
CMD ["uvicorn", "app.main:app", "--host", "0.0.0.0", "--port", "8000"]
```

**File:** `backend/.dockerignore`
```
__pycache__
*.pyc
*.pyo
*.pyd
.Python
env
venv
.venv
.env
*.egg-info
dist
build
.pytest_cache
.git
.gitignore
logs/
*.log
```

**File:** `docker-compose.yml` (for local development)
```yaml
version: '3.8'

services:
  backend:
    build: ./backend
    ports:
      - "8000:8000"
    environment:
      - DATABASE_URL=postgresql+psycopg2://spy_user:spy_pass@db:5432/spy_intel
    depends_on:
      - db
    volumes:
      - ./backend:/app
      - /app/venv

  db:
    image: postgres:15-alpine
    environment:
      - POSTGRES_USER=spy_user
      - POSTGRES_PASSWORD=spy_pass
      - POSTGRES_DB=spy_intel
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data

volumes:
  postgres_data:
```

### Rationale
- **Containerization:** Docker ensures consistent environment across development and production
- **Portability:** Backend can run anywhere Docker is supported
- **Isolation:** Dependencies are isolated from host system
- **Scalability:** Easy to scale horizontally if needed

### Validation Steps
1. Build Docker image locally: `docker build -t spy-intel-backend ./backend`
2. Run container: `docker run -p 8000:8000 spy-intel-backend`
3. Test health endpoint: `curl http://localhost:8000/health`
4. Verify API docs accessible at `http://localhost:8000/docs`

---

## Task 4.2: Configure Environment Variables for Production

### Before Change
**Current State:**
- `config.py` has hardcoded defaults
- CORS origins hardcoded to localhost
- Database URL hardcoded
- No `.env.example` file

### After Change
**Action:** Create `.env.example` and update config for production.

**File:** `backend/.env.example`
```bash
# --- Application Identity ---
APP_NAME=SPY Market Intelligence API
API_PREFIX=/api/v1

# --- Data Provider ---
DATA_PROVIDER=yahoo

# --- Default Ticker ---
DEFAULT_TICKER=SPY

# --- Database (Optional - set if using PostgreSQL) ---
DATABASE_URL=postgresql+psycopg2://spy_user:spy_pass@localhost:5432/spy_intel

# --- Cache TTL (seconds) ---
CACHE_TTL_PRICE=15
CACHE_TTL_OPTIONS_CHAIN=60
CACHE_TTL_EXPIRATIONS=3600

# --- Black-Scholes Model ---
RISK_FREE_RATE=0.045
DIVIDEND_YIELD_SPY=0.013

# --- CORS Origins (comma-separated for production) ---
CORS_ORIGINS=https://spy-intel.vercel.app,https://spy-intel.com

# --- Rate Limiting ---
RATE_LIMIT_ENABLED=true
RATE_LIMIT_PER_MINUTE=60
```

**Update:** `backend/app/config.py`
```python
from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import List

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    # --- Identity ---
    app_name: str = "SPY Market Intelligence API"
    api_prefix: str = "/api/v1"

    # --- Data Provider ---
    data_provider: str = "yahoo"

    # --- Default Ticker ---
    default_ticker: str = "SPY"

    # --- Database ---
    database_url: str = "postgresql+psycopg2://spy_user:spy_pass@localhost:5432/spy_intel"

    # --- Cache TTL ---
    cache_ttl_price: int = 15
    cache_ttl_options_chain: int = 60
    cache_ttl_expirations: int = 3600

    # --- Black-Scholes ---
    risk_free_rate: float = 0.045
    dividend_yield_spy: float = 0.013

    # --- CORS ---
    cors_origins: str = "http://localhost:5173,http://localhost:3000"
    
    @property
    def cors_origins_list(self) -> List[str]:
        return [origin.strip() for origin in self.cors_origins.split(",")]

    # --- Rate Limiting ---
    rate_limit_enabled: bool = True
    rate_limit_per_minute: int = 60

settings = Settings()
```

**Update:** `backend/app/main.py`
```python
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins_list,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Rationale
- **Security:** Sensitive values not hardcoded
- **Flexibility:** Easy to change between environments
- **Documentation:** `.env.example` shows required variables
- **Production-ready:** CORS configured for production domains

### Validation Steps
1. Copy `.env.example` to `.env` locally
2. Test with production-like CORS origins
3. Verify environment variables load correctly
4. Test rate limiting configuration

---

## Task 4.3: Deploy Backend to Railway

### Before Change
**Current State:**
- Backend only runs locally on port 8000
- No production deployment
- No CI/CD pipeline

### After Change
**Action:** Deploy backend to Railway (or Render) using Docker.

**Steps:**

1. **Create Railway Account:**
   - Sign up at railway.app
   - Install Railway CLI: `npm install -g @railway/cli`
   - Login: `railway login`

2. **Initialize Railway Project:**
   ```bash
   cd backend
   railway init
   railway add --service backend
   ```

3. **Configure Railway Service:**
   - Set build command: `docker build -t backend .`
   - Set start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Add environment variables via Railway dashboard:
     - `DATA_PROVIDER=yahoo`
     - `DEFAULT_TICKER=SPY`
     - `CORS_ORIGINS=https://spy-intel.vercel.app`
     - `RATE_LIMIT_PER_MINUTE=60`

4. **Deploy:**
   ```bash
   railway up
   railway deploy
   ```

5. **Get Production URL:**
   - Railway will provide a URL like `https://spy-intel-backend.railway.app`
   - Test health endpoint: `curl https://spy-intel-backend.railway.app/health`

**Alternative: Render**

If using Render instead:
1. Create account at render.com
2. Create new "Web Service"
3. Connect GitHub repository
4. Configure:
   - Build Command: `pip install -r requirements.txt`
   - Start Command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Environment variables in Render dashboard
5. Deploy automatically on push to main branch

### Rationale
- **Free Tier:** Both Railway and Render offer free tiers suitable for MVP
- **Easy Setup:** Minimal configuration required
- **Auto-scaling:** Scales automatically with traffic
- **HTTPS:** Automatic SSL certificates
- **Logs:** Built-in logging and monitoring

### Validation Steps
1. Verify backend deploys successfully
2. Test health endpoint in production
3. Test API endpoints (price, expirations, options)
4. Verify rate limiting works
5. Check logs for any errors

---

## Task 4.4: Configure Frontend for Production API URL

### Before Change
**Current State:**
- `vite.config.ts` proxies `/api` to `localhost:8000`
- Frontend only works in development
- No production API URL configuration

### After Change
**Action:** Update frontend to use production API URL in production builds.

**File:** `frontend/src/api/client.ts`
```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
  baseURL: API_URL,
  headers: {
    "Content-Type": "application/json",
  },
});

export const marketApi = {
  // ... existing methods
};
```

**File:** `frontend/.env.example`
```bash
VITE_API_URL=http://localhost:8000
```

**File:** `frontend/.env.production`
```bash
VITE_API_URL=https://spy-intel-backend.railway.app
```

**Update:** `frontend/vite.config.ts`
```typescript
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      "/api": {
        target: "http://localhost:8000",
        changeOrigin: true,
      },
    },
  },
  // Remove proxy in production - use direct API calls
  build: {
    outDir: "dist",
    sourcemap: true,
  },
});
```

### Rationale
- **Environment-specific:** Different API URLs for dev/prod
- **No proxy in production:** Direct API calls in production builds
- **Flexibility:** Easy to change API URL without code changes
- **Vite convention:** Uses VITE_ prefix for client-side env vars

### Validation Steps
1. Test locally with dev API (localhost:8000)
2. Build for production: `npm run build`
3. Preview production build: `npm run preview`
4. Verify API calls work with production URL

---

## Task 4.5: Deploy Frontend to Vercel

### Before Change
**Current State:**
- Frontend only runs locally with `npm run dev`
- No production deployment
- No CI/CD pipeline

### After Change
**Action:** Deploy frontend to Vercel.

**Steps:**

1. **Create Vercel Account:**
   - Sign up at vercel.com
   - Install Vercel CLI: `npm install -g vercel`
   - Login: `vercel login`

2. **Initialize Vercel Project:**
   ```bash
   cd frontend
   vercel
   ```
   - Follow prompts to configure
   - Set project name: `spy-intel`
   - Framework preset: Vite
   - Build command: `npm run build`
   - Output directory: `dist`

3. **Add Environment Variables:**
   - In Vercel dashboard, add:
     - `VITE_API_URL=https://spy-intel-backend.railway.app`

4. **Deploy:**
   ```bash
   vercel --prod
   ```

5. **Get Production URL:**
   - Vercel will provide URL like `https://spy-intel.vercel.app`
   - Access at the provided URL

**Alternative: GitHub Integration**

For automatic deployments on push:
1. Connect Vercel to GitHub repository
2. Configure:
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Environment variables in Vercel dashboard
3. Deploy automatically on push to main branch

### Rationale
- **Free Tier:** Vercel offers generous free tier
- **Automatic HTTPS:** SSL certificates included
- **CDN:** Global CDN for fast loading
- **Preview Deployments:** Automatic preview URLs for PRs
- **Easy Setup:** Minimal configuration required

### Validation Steps
1. Verify frontend deploys successfully
2. Access production URL in browser
3. Test all pages load correctly
4. Verify API calls work with backend
5. Check console for any errors

---

## Task 4.6: Test Production Deployment End-to-End

### Before Change
**Current State:**
- No production environment
- No end-to-end testing in production

### After Change
**Action:** Comprehensive testing of production deployment.

**Test Checklist:**

**Backend Tests:**
- [ ] Health endpoint returns 200: `curl https://spy-intel-backend.railway.app/health`
- [ ] API docs accessible: `https://spy-intel-backend.railway.app/docs`
- [ ] Price endpoint works: `https://spy-intel-backend.railway.app/api/v1/price?ticker=SPY`
- [ ] Expirations endpoint works
- [ ] Options endpoint works
- [ ] Greeks endpoint works
- [ ] GEX endpoint works
- [ ] Intelligence endpoint works
- [ ] Query endpoint works
- [ ] Download report endpoint works
- [ ] Rate limiting enforced (test with >60 requests/min)

**Frontend Tests:**
- [ ] Homepage loads at `https://spy-intel.vercel.app`
- [ ] All navigation links work
- [ ] Charts render correctly
- [ ] API calls succeed (check network tab)
- [ ] Download report button works
- [ ] Responsive design on mobile
- [ ] No console errors

**Integration Tests:**
- [ ] Frontend successfully calls backend API
- [ ] CORS configured correctly
- [ ] Data displays correctly in UI
- [ ] Report download generates and downloads file
- [ ] Error handling works (e.g., invalid ticker)

**Performance Tests:**
- [ ] Page load time < 3 seconds
- [ ] API response time < 2 seconds
- [ ] No memory leaks in backend
- [ ] Frontend bundle size reasonable

### Rationale
- **Quality Assurance:** Ensure production deployment works end-to-end
- **User Experience:** Verify actual user experience in production
- **Risk Mitigation:** Catch issues before public launch
- **Performance:** Ensure acceptable performance

### Validation Steps
1. Document all test results
2. Fix any issues found
3. Re-test after fixes
4. Prepare for public launch

---

## Execution Order

1. **Task 4.1** (2 hours) - Create Docker configuration
2. **Task 4.2** (1 hour) - Configure environment variables
3. **Task 4.3** (2 hours) - Deploy backend to Railway
4. **Task 4.4** (1 hour) - Configure frontend for production
5. **Task 4.5** (2 hours) - Deploy frontend to Vercel
6. **Task 4.6** (1 hour) - Test production deployment

---

## Pre-Execution Checklist

- [x] All Sprint 3 tasks completed and verified
- [x] All tests passing locally (16/16)
- [x] Working on main branch
- [ ] Create feature branch for deployment changes
- [ ] Document current local setup (screenshots, configs)
- [ ] Prepare Railway account
- [ ] Prepare Vercel account

---

## Post-Execution Checklist

- [ ] All 6 tasks completed
- [ ] Backend deployed successfully to Railway
- [ ] Frontend deployed successfully to Vercel
- [ ] All end-to-end tests passing
- [ ] Production URLs documented
- [ ] Environment variables documented
- [ ] Deployment process documented
- [ ] Rollback plan documented
- [ ] Monitoring/logging configured
- [ ] Git commits per task for easy rollback

---

## Rollback Plan

Each deployment can be rolled back independently:

**Backend Rollback:**
```bash
# Railway CLI
railway rollback

# Or via Railway dashboard:
# Select deployment -> Rollback
```

**Frontend Rollback:**
```bash
# Vercel CLI
vercel rollback

# Or via Vercel dashboard:
# Select deployment -> Rollback
```

**Code Rollback:**
```bash
git revert <commit-hash>
git push origin main
# Triggers automatic redeploy (if using GitHub integration)
```

---

## Success Criteria

- [ ] Backend accessible at production URL
- [ ] Frontend accessible at production URL
- [ ] All API endpoints functional in production
- [ ] Frontend successfully calls backend API
- [ ] Report download works end-to-end
- [ ] HTTPS enabled on both frontend and backend
- [ ] CORS configured correctly
- [ ] Rate limiting enforced
- [ ] No console errors in production
- [ ] Page load time < 3 seconds
- [ ] API response time < 2 seconds

---

## Production URLs

After deployment, document URLs here:

- **Frontend:** `https://spy-intel.vercel.app`
- **Backend:** `https://spy-intel-backend.railway.app`
- **API Docs:** `https://spy-intel-backend.railway.app/docs`

---

## Monitoring and Logging

**Railway:**
- Built-in logs in Railway dashboard
- Metrics for CPU, memory, requests
- Error tracking

**Vercel:**
- Built-in analytics dashboard
- Real-time logs
- Performance metrics
- Error tracking

**Recommendations:**
- Set up uptime monitoring (e.g., UptimeRobot)
- Monitor API response times
- Track error rates
- Set up alerts for failures

---

## Security Considerations

**Implemented:**
- [x] Rate limiting (60 req/min)
- [x] CORS configured
- [x] HTTPS enabled (automatic on Railway/Vercel)
- [ ] API authentication (future enhancement)
- [ ] Input validation (already implemented with Pydantic)
- [ ] SQL injection protection (using SQLAlchemy)

**Future Enhancements:**
- Add API key authentication
- Implement request signing
- Add CSRF protection
- Set up WAF rules
- Regular security audits

---

## Cost Analysis

**Railway (Free Tier):**
- $0/month for first deployment
- 512MB RAM
- 1 vCPU
- 1GB storage
- Sufficient for MVP traffic

**Vercel (Hobby Tier):**
- $0/month
- 100GB bandwidth/month
- Unlimited deployments
- Sufficient for MVP traffic

**Total Cost:** $0/month for MVP

**Estimated Scale-up Costs:**
- Railway: $5-20/month for higher tiers
- Vercel: $20/month for Pro tier
- Database: $0-15/month (Railway PostgreSQL)

---

## Notes

- **First Deployment:** This is the first production deployment, start simple
- **Database:** PostgreSQL is configured but not required for MVP (Yahoo Finance provides data)
- **Caching:** In-memory cache sufficient for MVP, consider Redis for scale
- **Monitoring:** Start with built-in tools, add external monitoring if needed
- **Domain:** Can add custom domain later (e.g., spy-intel.com)
- **CI/CD:** GitHub integration for automatic deployments recommended

---

## Future Enhancements (Beyond Sprint 4)

- **Custom Domain:** Configure spy-intel.com
- **CDN:** Add Cloudflare for additional caching
- **Database:** Implement PostgreSQL for historical data
- **Redis:** Add Redis for distributed caching
- **Monitoring:** Add Sentry for error tracking
- **Analytics:** Add Google Analytics or Plausible
- **Authentication:** Add user accounts and API keys
- **Multi-region:** Deploy to multiple regions for latency
- **Load Testing:** Perform load testing before scaling
