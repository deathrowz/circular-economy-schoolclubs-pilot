# Circular-Economy Student Enterprise — 15-School Pilot Platform

Full-stack platform managing student-led circular-economy enterprises across **15 pilot schools**, tracking verified financial and environmental metrics, enforcing uncompressed EXIF document telemetry via a Node.js Telegram Bot, and adjudicating top-off seed funding through a two-tier gamified validation engine.

[![CI/CD — Verify & Publish Circular-Economy Pilot Site](https://github.com/deathrowz/circular-economy-schoolclubs-pilot/actions/workflows/deploy-pilot-site.yml/badge.svg)](https://github.com/deathrowz/circular-economy-schoolclubs-pilot/actions/workflows/deploy-pilot-site.yml)

- **Live Published Pilot Site (GitHub Pages):** `https://deathrowz.github.io/circular-economy-schoolclubs-pilot/`
- **GitHub Repository:** `https://github.com/deathrowz/circular-economy-schoolclubs-pilot`

---

## 1. Core Architecture & Tech Stack

### Client 1: Telegram Bot (`bot/index.ts` & `src/lib/telegram/bot-handler.ts`)
- **The Metadata Constraint:** Instructs students to send photos as uncompressed **Documents/Files** (`message.document`) rather than compressed Telegram photos (`message.photo`) to preserve binary EXIF metadata.
- **6-Step Workflow:**
  1. Listens for `/log_impact`, `/resubmit <log_id>`, and `/status`.
  2. Rejects standard compressed photos (`COMPRESSED_PHOTO_REJECTED`).
  3. Extracts EXIF `DateTimeOriginal` timestamp and `GPSLatitude`/`GPSLongitude` via `exifr` (`src/lib/exif/parser.ts`) and computes Haversine campus geofence distance.
  4. Uploads verified files to S3 (`src/lib/storage/s3.ts`).
  5. Collects contextual metrics (Activity Title, Waste Diverted in `kg`, Revenue in `$ USD`).
  6. Records the transaction in Supabase (`status: 'pending'`).

### Client 2: Next.js App Router Frontend (`src/app/page.tsx`)
Styled using tokens and SVG vector icons extracted via the **Figma MCP** server (`Untitled UI v4.1` 3-Pane Enterprise Shell + `Lilypad Leaderboard v1.4`):
- **15-School Gamified Leaderboard (`src/components/LeaderboardView.tsx`):** Composite ranking across 6 weighted criteria (`Relevance`, `Business`, `Feasibility`, `Student Ownership`, `Sustainability`, `Institutional Commitment`) with Harmonic Financial-to-Environmental Normalization (`$3.50/kg` equilibrium).
- **Club Profiles & Public Ledger (`src/components/ClubProfilesView.tsx`):** Circular Business Model Canvases, student executive org charts, approved milestones, and verified transaction ledgers.
- **Two-Tier Verification Engine (`src/components/VerificationEngineView.tsx`):**
  - **Tier 1 (Supervising Teacher):** Campus geofence review (`Approve`, `Reject`, `Flag`). Micro-transactions (`<= $50`) release points immediately and roll a **10% random Expert Panel audit**. Macro-transactions (`> $50` or Final Pitches) route to `pending_expert_review`.
  - **Tier 2 (Expert Panel / Admin):** Scores Macro-transactions across the 6 criteria, audits the 10% random Micro-transaction sample (applying `-75 pt` fraud penalties when flagged), and tunes algorithm weights.
  - **Step 5 Resolution Loop:** Any rejection dispatches a Telegram message back to the student with the exact reason and unlocks a **single (`1x`) resubmission attempt**.
- **Health, Risk & Audit Dashboard (`src/components/HealthRiskDashboardView.tsx`):** Flags high-revenue/zero-impact anomalies, inactive clubs, off-campus EXIF drift, and displays the immutable `public.audit_logs` PostgreSQL trigger stream.

### Backend: Supabase PostgreSQL (`supabase/migrations/0001_circular_economy_schema.sql`)
- **Row-Level Security (RBAC):** Enforces school-scoped updates for `teacher`, full adjudication for `expert_admin`, submission creation for `student`, and read-only assigned club access for `mentor`.
- **Automated Triggers:** `trg_enforce_validation_and_routing` and `trg_impact_logs_status_audit` automatically append an immutable record to `public.audit_logs` on every status transition.

---

## 2. Local Development & Verification

```bash
# Install dependencies
npm install

# Run the 7-step architectural, EXIF, RBAC, and validation unit test suite
npm test

# Start the Next.js development server
npm run dev

# Start the standalone Telegram Bot (requires TELEGRAM_BOT_TOKEN in .env.local)
npm run bot
```
