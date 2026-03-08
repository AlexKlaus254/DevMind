<!--
═══════════════════════════════════════════════════════
DEV MIND — MANUAL TESTING CHECKLIST
═══════════════════════════════════════════════════════
Use this checklist for manual QA. Do not run as automated tests.
After fixes (settings, post-mortem, status modal, robustness), the items below
should be verified to pass. Flag any that require additional backend (e.g.
Telegram bot, email delivery) as "deferred".

AUDIT SUMMARY (issues found and fixed):
- Forms: Settings local state was overwritten by useEffect on every dbSettings
  change (after save). Fixed with hasLoadedRef so we only hydrate from DB once.
  Post-mortem used single formData object; refactored to explicit controlled
  state (wasRushed, wasOverwhelmed, satisfaction, scopeChanged, closingNote,
  finalStatus) with submitting guard and success message before navigate.
- Modals: Status update used Radix AlertDialog; replaced with simple custom
  overlay modal, Escape key and body scroll lock added.
- Supabase: Added try/catch and isSessionExpiredError handling in useProjects
  and useNotificationSettings; signOut({ sessionExpired: true }) on 401/JWT.
- Data loading: Added mounted check in project-detail fetchProject effect;
  project list error state now has Retry button.
- Settings: Email and Telegram inputs save on blur; persistent Saving/Saved/failed
  status; custom frequency stored in hours and does not revert while typing.
═══════════════════════════════════════════════════════
-->

# Manual testing checklist

## AUTH FLOWS
- [ ] Sign up with email and password as solo user
- [ ] Sign up with email and password as manager
- [ ] Sign up with email and password as member with valid org code
- [ ] Sign up with email and password as member with invalid org code — expect error message
- [ ] Sign up with mismatched passwords — expect error
- [ ] Sign up with password under 8 chars — expect error
- [ ] Sign up with already registered email — expect error
- [ ] Sign in with correct credentials
- [ ] Sign in with wrong password — expect error message
- [ ] Sign in with unregistered email — expect error
- [ ] Sign in with GitHub OAuth
- [ ] Sign in with Google OAuth
- [ ] Forgot password flow — enter email, receive link
- [ ] Session expiry — leave app open, token expires, refresh page — expect redirect to signin with message
- [ ] Sign out — expect redirect to signin
- [ ] Authenticated user visits /signin — expect redirect to /app
- [ ] Unauthenticated user visits /app — expect redirect to /signin

## PROJECTS
- [ ] Create project with all fields filled
- [ ] Create project with only required fields
- [ ] Create project with past deadline — expect error
- [ ] Create project with deadline today — expect success
- [ ] View project list — expect real data not placeholders
- [ ] View empty project list — expect empty state message
- [ ] Filter projects by status
- [ ] View project detail — all three tabs load
- [ ] Project detail overview tab shows real chart data
- [ ] Project detail journal tab shows real entries
- [ ] Project detail post-mortem tab shows correct state
- [ ] Update project status to completed — post-mortem fires
- [ ] Update project status to abandoned — post-mortem fires
- [ ] Update project status to paused — post-mortem fires
- [ ] Cancel status update — status does not change
- [ ] Risk score shows on project cards
- [ ] Risk score factors visible on project detail
- [ ] Project list error state shows Retry button and retry works

## JOURNAL
- [ ] Log quick check-in with all fields
- [ ] Log quick check-in with only required fields
- [ ] Energy score 1 saves correctly
- [ ] Energy score 10 saves correctly
- [ ] Was blocked = yes shows blocker input
- [ ] Was blocked = no hides blocker input
- [ ] Still motivated = No shows acknowledgment text
- [ ] Click deep reflection expands textarea
- [ ] Deep reflection autosaves after 10 seconds
- [ ] Submit check-in navigates away on success
- [ ] Submit check-in shows error on failure
- [ ] Journal hub lists all active projects
- [ ] Each project in journal hub links to checkin

## DAILY TASKS
- [ ] Create task with no project linked
- [ ] Create task linked to a project
- [ ] Create task with planned time and notification
- [ ] Create task with no time — should work
- [ ] Navigate to yesterday — shows past tasks read only
- [ ] Navigate to tomorrow — can add future tasks
- [ ] Mark task as in progress — records start time
- [ ] Mark task as complete — records duration
- [ ] Mark task as skipped — shows skip reason input
- [ ] Postpone task — copies to tomorrow
- [ ] Notification fires before planned start time
- [ ] Completion rate shows correctly in summary
- [ ] Completion rate below 50% shows amber message

## SETTINGS
- [ ] Toggle browser notifications on — requests permission
- [ ] Toggle email on — shows email input pre-filled
- [ ] Change email in settings — saves on blur
- [ ] Toggle Telegram on — shows chat ID input
- [ ] Enter Telegram chat ID — saves on blur
- [ ] Change reminder style — saves immediately
- [ ] Change reminder frequency preset — saves immediately
- [ ] Enter custom frequency — saves correctly in hours
- [ ] Scheduled style shows day picker and time input
- [ ] Select specific days — saves correctly
- [ ] All settings persist after page refresh
- [ ] All settings persist after sign out and sign in
- [ ] Saving... indicator shows while debounce pending
- [ ] Saved indicator shows after save completes
- [ ] Settings inputs do not revert while typing

## POST-MORTEM
- [ ] Post-mortem opens after status change
- [ ] Cannot submit without selecting final status
- [ ] Cannot submit without closing note
- [ ] Cannot submit without satisfaction score
- [ ] All fields save correctly to Supabase
- [ ] AI summary placeholder shows after save
- [ ] Project status updates to match selected status
- [ ] Navigates back to project after save
- [ ] Success message "Post-mortem saved. Returning to project." shows before redirect
- [ ] Submit button disabled while submitting

## TEAM FEATURES (manager only)
- [ ] Solo user cannot see Team tab
- [ ] Member user cannot see Team tab
- [ ] Manager user sees Team tab
- [ ] Team metrics show real aggregated data
- [ ] No individual names appear anywhere in team view
- [ ] Anonymisation banner always visible
- [ ] Empty team state when no members yet

## INSIGHTS
- [ ] Pattern cards show with fewer than 5 entries — expect insufficient data message
- [ ] Pattern cards show real patterns after 5+ entries
- [ ] Each pattern links to relevant projects
- [ ] Growth trajectory shows after 4+ completed projects
- [ ] Project timeline chart renders real projects
- [ ] Task patterns section shows completion rate

## NAVIGATION
- [ ] All sidebar links navigate correctly
- [ ] No 404 errors on page refresh for any route
- [ ] Back button works correctly throughout
- [ ] Mobile bottom tab bar works on small screen
- [ ] Sidebar collapses correctly on medium screen

## ERROR SCENARIOS
- [ ] Disconnect internet — offline banner appears
- [ ] Reconnect internet — offline banner disappears
- [ ] Submit form while offline — shows connection error
- [ ] Supabase returns error — human readable message shown
- [ ] Page crashes — error boundary shows fallback UI
- [ ] Navigate to non-existent route — 404 page shows
- [ ] Navigate to /app/projects/fake-id — shows not found state not blank screen
- [ ] Session expired (401/JWT) — redirect to signin with session expired message

## STATUS UPDATE MODAL (project detail & list)
- [ ] Update status dropdown opens and does not freeze screen
- [ ] Clicking Confirm closes modal and runs update
- [ ] Clicking Cancel closes modal without changing status
- [ ] Clicking overlay closes modal
- [ ] Escape key closes modal
- [ ] Body scroll locked while modal open
