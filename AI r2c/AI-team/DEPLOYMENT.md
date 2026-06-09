# SUTRA AI Agents API - Deployment Guide

Complete deployment guide for the SUTRA AI Agents API with environment variable setup, platform-specific instructions, and API provider recommendations.

## Deployment Readiness Checklist

- ✅ Dependencies defined in `requirements.txt`
- ✅ Environment variables configured in `.env.example`
- ✅ Database migrations setup with Alembic
- ✅ Tests passing (34/34 tests)
- ✅ Configuration uses environment variables
- ⚠️ CORS set to allow all origins (restrict for production)
- ✅ No hardcoded secrets
- ✅ Health check endpoint available

**Status:** Ready for deployment with minor security considerations.

---

## Quick Start

### 1. Environment Variables Setup

```bash
# Copy environment example
cp .env.example .env

# Edit .env with your actual values
```

**Required Variables:**
```bash
# Server
SERVER_HOST=0.0.0.0
SERVER_PORT=8000
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO

# Database (Supabase PostgreSQL)
DATABASE_URL=postgresql://user:password@aws-0-ap-south-1.pooler.supabase.com:5432/postgres

# LLM Provider Selection
LLM_PROVIDER=openai  # or gemini

# OpenAI Configuration
OPENAI_API_KEY=sk-proj-your_actual_openai_api_key_here
OPENAI_MODEL=gpt-5.5

# Gemini Configuration (Alternative)
GEMINI_API_KEY=your_actual_gemini_api_key_here
GEMINI_MODEL=gemini-3.5-flash
```

### 2. Database Setup

```bash
# Run migrations
alembic upgrade head
```

### 3. Start the Server

```bash
python run.py
```

---

## LLM Provider Comparison

**Choose OpenAI for best accuracy and reliability; choose Gemini for cost efficiency and speed.**

| Provider | Model | Speed | Accuracy | Cost | Best For |
|----------|-------|-------|----------|------|----------|
| **OpenAI** | GPT-5.5 | 16s | ⭐⭐⭐⭐⭐ | Higher | Complex reasoning, accuracy-critical tasks |
| **OpenAI** | GPT-4o | 1.0s | ⭐⭐⭐⭐ | Medium | Fast responses, good quality |
| **Gemini** | Gemini 3.5 Flash | 6.2s | ⭐⭐⭐⭐ | Lower | Cost-effective, high-volume usage |
| **Gemini** | Gemini 2.5 Pro | 14.8s | ⭐⭐⭐⭐ | Medium | Balanced performance |

**Recommendation:** Use OpenAI GPT-5.5 for production (best accuracy), Gemini 3.5 Flash for development/testing (cost-effective).

---

## Deployment Platforms

### Option 1: Render (Recommended)

**Best for:** Easy setup, automatic SSL, built-in monitoring

**Steps:**

1. **Prepare Repository**
   ```bash
   git init
   git add .
   git commit -m "Initial commit"
   git push origin main
   ```

2. **Create Web Service**
   - Go to [render.com](https://render.com)
   - Click "New +" → "Web Service"
   - Connect GitHub repository
   - Configure:
     ```
     Build Command: pip install -r requirements.txt
     Start Command: python run.py
     Runtime: Python 3.14
     ```

3. **Environment Variables**
   Set in Render dashboard → Settings → Environment Variables:
   ```
   DATABASE_URL=your_supabase_connection_string
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_actual_key
   OPENAI_MODEL=gpt-5.5
   ENVIRONMENT=production
   DEBUG=false
   SERVER_PORT=8000
   ```

4. **Release Command**
   ```
   alembic upgrade head
   ```

5. **Deploy**
   - Click "Create Web Service"
   - Auto-deploys on push to main

**Cost:** Free tier available, $7/month for production

---

### Option 2: Railway

**Best for:** Easy database management, generous free tier

**Steps:**

1. **Create Project**
   - Go to [railway.app](https://railway.app)
   - Click "New Project" → "Deploy from GitHub repo"

2. **Configure Service**
   - Railway auto-detects Python
   - Set start command: `python run.py`

3. **Environment Variables**
   Set in Railway dashboard → Variables:
   ```
   DATABASE_URL=your_supabase_url
   LLM_PROVIDER=openai
   OPENAI_API_KEY=your_actual_key
   OPENAI_MODEL=gpt-5.5
   ENVIRONMENT=production
   DEBUG=false
   ```

4. **Deploy**
   - Railway auto-deploys on git push

**Cost:** $5 credit/month, paid plans from $5/month

---

### Option 3: Fly.io

**Best for:** Global deployment, Docker support

**Steps:**

1. **Install Fly CLI**
   ```bash
   # Windows (PowerShell)
   irm https://fly.io/install.ps1 | iex
   ```

2. **Login**
   ```bash
   fly auth login
   ```

3. **Initialize**
   ```bash
   fly launch
   ```

4. **Set Environment Variables**
   ```bash
   fly secrets set DATABASE_URL="your_supabase_url"
   fly secrets set OPENAI_API_KEY="your_actual_key"
   fly secrets set LLM_PROVIDER="openai"
   fly secrets set OPENAI_MODEL="gpt-5.5"
   fly secrets set ENVIRONMENT="production"
   fly secrets set DEBUG="false"
   ```

5. **Deploy**
   ```bash
   fly deploy
   ```

**Cost:** Free tier available, $5/month for paid

---

### Option 4: Docker

**Best for:** Self-hosting, cloud platforms (AWS, GCP, Azure)

**Create Dockerfile:**
```dockerfile
FROM python:3.14-slim

WORKDIR /app

RUN apt-get update && apt-get install -y \
    gcc \
    libpq-dev \
    && rm -rf /var/lib/apt/lists/*

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY . .

RUN alembic upgrade head

EXPOSE 8000

CMD ["python", "run.py"]
```

**Build and Run:**
```bash
# Build
docker build -t sutra-ai-agents .

# Run
docker run -d \
  --name sutra-api \
  -p 8000:8000 \
  --env-file .env \
  sutra-ai-agents
```

**Deploy to Cloud:**

**AWS ECS:**
```bash
# Push to ECR
docker tag sutra-ai-agents:latest your-registry.dkr.ecr.region.amazonaws.com/sutra-api:latest
docker push your-registry.dkr.ecr.region.amazonaws.com/sutra-api:latest

# Deploy via ECS console or CLI
```

**Google Cloud Run:**
```bash
gcloud run deploy sutra-api \
  --image gcr.io/your-project/sutra-ai-agents \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated \
  --set-env-vars DATABASE_URL=your_url,OPENAI_API_KEY=your_key
```

**Azure Container Instances:**
```bash
az container create \
  --resource-group myResourceGroup \
  --name sutra-api \
  --image your-registry.azurecr.io/sutra-ai-agents \
  --environment-variables DATABASE_URL=your_url OPENAI_API_KEY=your_key \
  --ports 8000
```

---

## Security Best Practices

### 1. API Key Management

**Never commit API keys to git:**
```bash
# Ensure .env is in .gitignore
echo ".env" >> .gitignore
```

**Use secret management:**
- Render: Built-in environment variables
- Railway: Built-in secrets
- AWS: AWS Secrets Manager or Parameter Store
- GCP: Secret Manager
- Azure: Azure Key Vault

### 2. Database Security

**Enable SSL:**
```bash
DATABASE_URL=postgresql://user:password@host:5432/db?sslmode=require
```

**Use connection pooling** (configured in `app/database.py`)

### 3. CORS Configuration

**For production, restrict CORS origins:**

In `app/main.py`, change:
```python
# Current (development)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # ⚠️ Restrict for production
    ...
)

# Production
app.add_middleware(
    CORSMiddleware,
    allow_origins=["https://yourdomain.com"],  # Your actual domain
    allow_credentials=True,
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)
```

### 4. Environment-Specific Configurations

**Development (.env.development):**
```bash
ENVIRONMENT=development
DEBUG=true
LOG_LEVEL=DEBUG
DATABASE_URL=postgresql://localhost:5432/dev_db
```

**Production (.env.production):**
```bash
ENVIRONMENT=production
DEBUG=false
LOG_LEVEL=INFO
DATABASE_URL=postgresql://prod-user:password@prod-host:5432/prod_db?sslmode=require
```

---

## Monitoring & Maintenance

### Health Check

```bash
curl https://your-api-url.com/health
```

Expected response:
```json
{
  "status": "healthy",
  "database": "connected",
  "llm_provider": "openai"
}
```

### Logging

Logs are configured in `app/main.py`:
- Development: DEBUG level
- Production: INFO level

### Database Backups

**Supabase:**
- Automatic backups enabled by default
- 7-day retention on free tier
- 30-day retention on Pro tier

**Manual backup:**
```bash
pg_dump $DATABASE_URL > backup_$(date +%Y%m%d).sql
```

---

## Troubleshooting

### Common Issues

**Database Connection Error:**
```bash
# Verify DATABASE_URL is correct
# Check if Supabase project is active
# Enable pgvector extension in Supabase SQL Editor:
CREATE EXTENSION IF NOT EXISTS vector;
```

**Migration Failure:**
```bash
# Check current status
alembic current

# Reset (CAUTION: deletes data)
alembic downgrade base
alembic upgrade head

# Or stamp current version
alembic stamp head
```

**LLM API Error:**
- Verify API key is correct
- Check if API key has sufficient credits
- Ensure `LLM_PROVIDER` matches the API key
- Test API key locally first

**Port Already in Use:**
```bash
# Windows
netstat -ano | findstr :8000
taskkill /PID <PID> /F

# Linux/Mac
lsof -ti:8000 | xargs kill -9
```

---

## CI/CD Pipeline (Optional)

### GitHub Actions Example

Create `.github/workflows/deploy.yml`:

```yaml
name: Deploy to Production

on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Set up Python
      uses: actions/setup-python@v4
      with:
        python-version: '3.14'
    
    - name: Install dependencies
      run: pip install -r requirements.txt
    
    - name: Run tests
      run: pytest tests/ -v
    
    - name: Deploy to Render
      run: |
        curl -X POST \
          -H "Authorization: Bearer ${{ secrets.RENDER_API_KEY }}" \
          -H "Content-Type: application/json" \
          -d '{"branch":"main"}' \
          https://api.render.com/v1/services/${{ secrets.RENDER_SERVICE_ID }}/deploys
```

**Set secrets in GitHub:**
- `RENDER_API_KEY`
- `RENDER_SERVICE_ID`

---

## Cost Optimization

### LLM API Costs

**OpenAI Pricing (approximate):**
- GPT-5.5: $0.03/1K input, $0.06/1K output
- GPT-4o: $0.005/1K input, $0.015/1K output

**Gemini Pricing (approximate):**
- Gemini 3.5 Flash: $0.001/1K input, $0.002/1K output
- Gemini 2.5 Pro: $0.003/1K input, $0.006/1K output

**Optimization Strategies:**
1. Use caching for repeated queries
2. Implement request batching
3. Use smaller models for simple tasks
4. Set max tokens limits
5. Monitor usage regularly

### Database Costs

**Supabase:**
- Free: 500MB database, 1GB bandwidth
- Pro: $25/month, 8GB database, 50GB bandwidth

---

## Support

- **Documentation:** See `AGENT_TECHNICAL_GUIDE.md` for detailed architecture
- **Issues:** Check logs in your deployment platform dashboard
- **Testing:** Run `pytest tests/ -v` locally before deploying

---

## Summary

This deployment guide covers:
- ✅ Environment variable setup
- ✅ LLM provider comparison and recommendations
- ✅ Multiple deployment platforms (Render, Railway, Fly.io, Docker)
- ✅ Security best practices
- ✅ Monitoring and troubleshooting
- ✅ CI/CD pipeline setup
- ✅ Cost optimization strategies

**Recommended deployment:** Render for ease of use, OpenAI GPT-5.5 for best accuracy.
