# DevMind

## Stop abandoning projects. Start seeing why you do.

A psychologically-aware, project-based journal for developers,
data professionals, and builders.

DevMind is not a productivity app. It does not reward streaks
or congratulate you for basic actions. It records what you do
and what you avoid equally. Silence is data. Abandonment is
data. The goal is to see your patterns clearly enough to
change them.

---

## What it does

Most developers do not abandon projects because of skill gaps.
They abandon them because of untracked psychological patterns
they are not aware of. DevMind surfaces those patterns through
data, even when users barely try.

- Track projects from start to finish or abandonment
- Log quick check-ins (60 seconds) or deep reflections
- Silence and avoidance are recorded as data points
- AI detects patterns across your project history
- Risk scores predict which projects are likely to be abandoned
- Organisation managers see anonymised team aggregate insights
- No pleasant copy. No streak celebrations. Reality first.

---

## Tech stack

| Layer         | Technology                                    |
| ------------- | --------------------------------------------- |
| Frontend      | React + TypeScript + Vite                     |
| Styling       | Tailwind CSS                                  |
| Backend       | Supabase (PostgreSQL + Auth + Edge Functions) |
| AI layer      | Groq API                                      |
| Hosting       | Vercel                                        |
| Notifications | Brevo (email) + Browser Push                  |

---

## Getting started

### Prerequisites

- Node.js 18 or higher
- A Supabase account (free tier works)
- A Vercel account (free tier works)

### Local setup

1. Clone the repository

```bash
git clone https://github.com/YOURUSERNAME/devmind.git
cd devmind
```

2. Install dependencies

```bash
npm install
```

3. Create your environment file

```bash
cp .env.example .env
```

Open .env and fill in your values:

```
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Set up the database

Go to your Supabase dashboard, open the SQL editor,
and run the contents of database/schema.sql

5. Start the development server

```bash
npm run dev
```

The app will be available at [https://dev-mind-five.vercel.app/]

---

## Database setup

All SQL required to set up the database from scratch is in
the database/ folder:

- database/schema.sql — all tables, views, and RLS policies
- database/functions.sql — Postgres functions and triggers
- database/seed.sql — optional test data for development

Run them in that order in the Supabase SQL editor.

---

## Environment variables

| Variable               | Description                   |
| ---------------------- | ----------------------------- |
| VITE_SUPABASE_URL      | Your Supabase project URL     |
| VITE_SUPABASE_ANON_KEY | Your Supabase anon/public key |

Never commit your .env file. It is in .gitignore by default.

---

## Deployment

This project deploys to Vercel automatically on every push
to the main branch.

To deploy manually:

1. Push code to GitHub
2. Import the repository in Vercel
3. Add environment variables in Vercel project settings
4. Deploy

Full deployment guide in docs/deployment.md

---

## User roles

| Role    | Access                                       |
| ------- | -------------------------------------------- |
| Solo    | Personal journal only                        |
| Member  | Personal journal, belongs to an organisation |
| Manager | Personal journal + anonymised team dashboard |

Managers never see individual entries. Team data is
aggregated at the database level via RLS policies,
not just hidden in the UI.

---

## Project structure

```
src/
├── app/          # Router and route definitions
├── components/   # Reusable UI components
├── contexts/     # React context providers
├── hooks/        # Supabase data hooks
├── lib/          # Utilities and helpers
├── pages/        # Page components
└── types/        # TypeScript type definitions

database/
├── schema.sql    # Full database schema
├── functions.sql # Postgres functions
└── seed.sql      # Development seed data

docs/
├── deployment.md      # Deployment guide
├── contributing.md    # Contribution guidelines
└── architecture.md    # System architecture notes
```

---

## Core philosophy

This tool is built on one thesis: most developers do not
know what moves them, especially why they keep abandoning
projects that are in their best interest to finish.

Data points captured include:

- Energy and confidence scores per session
- Blocker frequency and themes
- Silence gaps on active projects
- Post-mortem satisfaction and reflection
- Abandonment risk factors per project

Silence, refusal to answer, and dismissing prompts are all
recorded as data. The dashboard does not hide uncomfortable
metrics.

---

## Roadmap

- [x] Project-based journal with quick and deep modes
- [x] Silence tracking and risk scoring
- [x] Role-based access for organisations
- [x] AI pattern detection via Groq
- [x] Weekly digest summary
- [x] Project comparison view
- [x] Accountability export summary
- [ ] WhatsApp and Telegram notification delivery
- [ ] Mobile app (React Native)
- [ ] Public API for third party integrations
- [ ] Team-level AI insights with anonymised summaries

---

## Contributing

See docs/contributing.md for guidelines.

This is an early stage project. If you find bugs or have
ideas that align with the core philosophy, open an issue.

---

## License

GNU General Public License v3.0. See LICENSE file for details.

---

## Author

Built by Alex Ndungu  
https://www.linkedin.com/in/alex-mwangi-klaus-254724008885-ke/

```

---

**Step 2 — Create the .env.example file**

Create `.env.example` in your project root:
```

# Supabase

## Get these from your Supabase dashboard under Settings > API

VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_public_key

## Never commit your actual .env file
