# DevMind - Developer Psychology Journal & Project Tracker

A comprehensive web application for software developers to track psychological and emotional patterns across projects.

## Design System

### Colors
- **Background**: `#0D1117` (Deep navy/near-black)
- **Primary Accent**: `#6C63FF` (Electric indigo)
- **Success**: `#3FB950` (Muted green)
- **Warning**: `#D29922` (Amber)
- **Destructive**: `#F85149` (Muted red)

### Typography
- **Body/UI**: Inter
- **Data/Metrics**: JetBrains Mono

### Design Philosophy
Dark mode first. Clean, minimal, data-forward aesthetic inspired by Linear, Vercel, and Raycast. Professional tool for developers, not a wellness app.

## Application Structure

### Pages (10 complete screens)

1. **Onboarding** (`/`)
   - Simple focused form
   - Captures role, growth goals, and improvement metrics
   - No clutter, single CTA

2. **Dashboard** (`/app`)
   - Summary cards (Active Projects, Journal Streak, Completion Rate, Growth Score)
   - Emotional arc chart showing energy/confidence over time
   - AI insight card with latest pattern
   - Quick action buttons

3. **Project List** (`/app/projects`)
   - Grid/card view of all projects
   - Filterable by status (All, Active, Completed, Paused, Abandoned)
   - Shows sparkline, progress, last activity
   - Floating + button for mobile

4. **New Project** (`/app/projects/new`)
   - 3-step wizard:
     - Step 1: Project basics (name, type, tech stack, deadline)
     - Step 2: Psychological baseline (energy, confidence, motivation)
     - Step 3: Growth goal (skill to improve, success definition)
   - Progress indicator at top

5. **Journal Check-in** (`/app/projects/:id/checkin`)
   - **Most important screen** - ultra low friction
   - Mobile-optimized, thumb-friendly
   - Emoji energy selector
   - Number tap selector for confidence
   - Block detection
   - One-word description
   - Motivation check
   - Optional expandable deep reflection

6. **Deep Reflection** (`/app/projects/:id/reflection`)
   - Distraction-free writing interface
   - Optional structured prompts
   - Word count
   - Autosave
   - AI analysis badge

7. **Project Post-Mortem** (`/app/projects/:id/post-mortem`)
   - Triggered when project ends
   - Status selection (Completed/Abandoned/Paused)
   - Rushed? Overwhelmed? Scope changed?
   - Satisfaction emoji scale
   - AI summary generation

8. **AI Insights Dashboard** (`/app/insights`)
   - Pattern summary cards (3-4 key insights)
   - Growth tracker with progress visualization
   - Actionable recommendations
   - Historical trend charts
   - Engagement patterns

9. **Settings** (`/app/settings`)
   - Notification channels (Browser, Email, Telegram)
   - Smart reminder frequency
   - Silence detection threshold
   - Preview messages
   - Weekly digest toggle

10. **Team View** (`/app/team`)
    - **Anonymized aggregate view**
    - Banner: "All data here is anonymized"
    - Team completion rate
    - Drop-off funnel chart
    - Energy/confidence distribution
    - Team signals/alerts
    - Lighter background to distinguish from individual view

### Components

#### Core DevMind Components
- `StatCard` - Metric cards with icons and trends
- `AIInsightCard` - Gradient bordered insight display
- `ProjectStatusBadge` - Color-coded status indicators
- `Sparkline` - Mini line chart for mood data
- `EmojiSelector` - Touch-friendly emoji scale
- `NumberSelector` - 1-10 tap selector
- `LoadingSkeleton` - Loading states
- `QuickAction` - Action buttons with icons

#### Navigation
- Desktop: Left sidebar with logo, nav items, user avatar
- Mobile: Bottom tab bar (4 items)
- Conditional team view for managers

### Data Structures
- Projects (status, type, progress, mood data)
- Journal Entries (energy, confidence, blocks, reflections)
- AI Insights (patterns, recommendations, confidence scores)

### Charts & Visualizations
- Area charts (emotional arc)
- Line charts (trends)
- Bar charts (patterns, drop-offs)
- Pie charts (distributions)
- Sparklines (inline mood trends)

## Key Features

### Mobile Optimization
- Check-in screen is fully mobile-optimized
- Thumb-friendly tap targets
- Fixed bottom buttons
- No horizontal scrolling
- Responsive grid layouts

### AI Layer
- Pattern detection from journal entries
- Confidence scores on insights
- Personalized recommendations
- Team-wide anonymized patterns

### UX Philosophy
- Low friction check-ins
- Progressive disclosure (expandable deep reflection)
- Smart notifications (not spam)
- Data-forward visualizations
- Professional, technical aesthetic

## Tech Stack
- React + TypeScript
- React Router (data mode)
- Tailwind CSS v4
- Recharts (data viz)
- Radix UI (components)
- Lucide React (icons)
- Motion (animations)

## Route Structure
```
/                           → Onboarding
/app                        → Dashboard (protected)
/app/projects               → Project List
/app/projects/new           → New Project
/app/projects/:id/checkin   → Journal Check-in
/app/projects/:id/reflection → Deep Reflection
/app/projects/:id/post-mortem → Post-Mortem
/app/insights               → AI Insights
/app/settings               → Settings
/app/team                   → Team View (role-based)
/*                          → 404 Not Found
```

## Design Principles

1. **Serious tool, not wellness app** - Developers should feel like they're using a professional IDE dashboard
2. **Data-forward** - Show patterns and insights prominently
3. **Low friction** - Check-ins take < 30 seconds
4. **Privacy first** - Team view is fully anonymized
5. **Mobile-optimized** - Check-in experience works great on phone
6. **Smart, not spam** - Notifications only when needed

## Future Enhancements
- Backend integration (Supabase)
- Real AI analysis (OpenAI/Anthropic)
- Telegram bot integration
- Export data features
- More chart types
- Calendar view
- Project templates
