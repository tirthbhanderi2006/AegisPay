# AegisPay Dashboard

Next.js 14 (App Router) + TypeScript + Tailwind command dashboard for the AegisPay
FastAPI backend (../app/main.py).

## Run

```powershell
# terminal 1 — backend (repo root)
.\.venv\Scripts\Activate.ps1
uvicorn app.main:app --reload --port 8000

# terminal 2 — dashboard
cd dashboard
npm install   # first time only
npm run dev
```

Open http://localhost:3000.

If the backend is unreachable the dashboard automatically serves verified fixture
responses in mock mode so demos never break.

## Structure

- `lib/types.ts` — TypeScript mirrors of FastAPI Pydantic response models
- `lib/api.ts` — typed fetch client (health / list / detail / webhook POST)
- `lib/fixtures.ts` — demo scenario payloads + verified mock results
- `components/Header.tsx` — brand, engine status, role switcher, scenario bar
- `components/MetricsOverview.tsx` — gateway vs merchant metric sets
- `components/DisputeList.tsx` — live feed with status chips
- `components/AgentReasoningView.tsx` — telemetry accordion, EV math, draft⇄audit trail
- `components/DossierViewer.tsx` — dossier PDF view / savings notice / escalation queue
