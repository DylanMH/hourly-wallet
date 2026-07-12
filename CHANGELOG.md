# Changelog

## 2.2.0

### Added

- Android foreground-service active-shift notification using Notifee: single persistent ongoing notification that starts on clock-in, updates on lunch/break/state changes, and stops on clock-out or shift deletion.
- Notification actions for starting/ending lunch, starting/ending break, and clocking out directly from the notification.
- Notification states for Clocked in, On lunch, and On break that match the Clock screen and dashboard.
- Regular vs. overtime earnings breakdown across dashboard, reports, active shift display, and shift history.
- Conservative monthly projection engine with settings for projection mode, expected workdays, expected hours per workday, and optional projected overtime.
- Monthly affordability card v2.2: earned so far, projected remaining income, projected monthly gross/net, bills paid/remaining, projected surplus/shortfall, and on-track/close/shortfall status.
- Reports v2.2 with regular/overtime hours and earnings, estimated taxes/net, and conservative projected monthly earnings where relevant.
- Settings v2.2 for notifications, projection behavior, and overtime display preferences.
- Support for multiple lunch breaks within a single shift via a new `shift_lunches` table.
- Safe database migration from v6 to v7 that creates `shift_lunches`, migrates legacy `lunch_start`/`lunch_end` data, and preserves all existing shifts and bills.
- Backup/import support for legacy lunch fields and the new `lunches` array.
- Local production AAB build script (`build:production:android`) for Play Store releases.

### Changed

- Shift type now stores an array of `ShiftLunch` objects instead of single `lunchStart`/`lunchEnd`.
- Clock service allows starting a second lunch after ending a previous one; only one lunch can be active at a time.
- Worked-time calculations now sum all completed and active lunch periods to avoid flickering or incorrect increments while on lunch.
- Shift history lists each lunch entry separately with start/end times and duration.
- Monthly projections now default to conservative actual-earnings-plus-scheduled-hours logic and avoid overestimating from one heavy week.
- Dashboard, reports, notifications, and affordability card share the same projection and earnings calculations.
- App display names updated for a cleaner launcher label: production is "HourlyWallet", preview is "PrevHourlyWallet", and development is "DevHourlyWallet".

### Fixed

- Worked time no longer incorrectly increments by a minute while actively on lunch before the next UI update.
- Multiple sequential lunches are now fully supported instead of being blocked after the first lunch.
- `ShiftFormModal` preserves additional lunches when editing a shift with multiple lunch entries.
- Data import from older backups converts legacy `lunchStart`/`lunchEnd` into the new `lunches` array without data loss.

### Technical

- Database schema version bumped to 7 with a new `shift_lunches` table; `shifts` no longer stores `lunch_start`/`lunch_end`.
- Added the `ShiftLunch` TypeScript type and updated `Shift` to require `lunches: ShiftLunch[]`.
- Updated `clockService`, `shiftQueries`, calculation helpers, UI components, and backup schema for the lunches array.
- Added/updated Jest fixtures and tests for multiple-lunch scenarios and the new earnings/projection logic.
- Added an EAS production build command (`eas:build:production`) using `app-bundle` for Google Play.

## 2.1.0

### Added

- Persistent clocked-in notification powered by Notifee foreground service with Android native chronometer; shows status + elapsed time even when the app is closed.
- Jest mock for `@notifee/react-native`.
- Local Android build scripts (`build:preview:android`, `build:dev:android`) for organized internal APKs.
- Bills Overview tab with a category breakdown pie chart and quick filter chips.
- `title` prop for `BillsByCategoryPieChart`.
- Regression tests for minute-based overtime calculations.

### Changed

- Clocked-in notification body now shows status and start time instead of estimated earnings.
- Bills screen defaults to the Overview tab.
- Bill month groups and shift week groups now default to collapsed.
- Shift history cards now display each break with start/end times, duration, and paid/unpaid status (matching the lunch format).

### Fixed

- Local Android preview builds failing due to Sentry source map upload requiring an auth token.
- Android local builds now export `JAVA_HOME`, `ANDROID_HOME`, and disable Sentry auto-upload in the build scripts.

### Technical

- Replaced `expo-notifications` clocked-in handler with `@notifee/react-native`.
- Added custom Expo config plugin for Notifee foreground service permissions.
- Removed `.devin` directory from git tracking.

## 2.0.0

### Added

- Dashboard live "now" ticker and reactive `useDashboardData` hook so weekly/monthly pay and bills update as time passes.
- Dashboard status indicator now shows all clock states: Not clocked in, Clocked in, On lunch, On break.
- Clock: custom clock-in time option for when you forgot to clock in.
- Clock: active shift is displayed in the current week even if it started in a previous week.
- Shift history: shows lunch and paid/unpaid break durations.
- Persistent clocked-in notification that updates every 60 seconds with elapsed time and estimated earnings.
- Error boundary with a "Try again" fallback and Sentry crash reporting integration.
- Unit tests for shift, pay, and bill calculations using jest-expo.

### Fixed

- Stale weekly and monthly dashboard data not updating without an app reload.

## 1.6.0

### Added

- Salary job support with estimated net pay and overtime rules.
- Reports: "This Year" tab with a yearly summary and an interactive pie chart for paid bills by category.
- Reports: drill-down category modal showing grouped bills and individual payment dates/amounts.
- Reports: bill totals now use actual `paid_at` timestamps so early payments are counted in the right period.
- Bills: month list now shows all current-year unpaid months in ascending order.
- Bills: paid bills tab includes a year filter and groups paid bills by payment month.
- Bills: year-ahead occurrence generation so recurring bills populate the full current year and roll over into a new year.
- Bills: calendar date picker for one-time, weekly, biweekly, and yearly recurrences.
- Shift history: explicit newest-first sorting for weeks, days, and individual shifts.
- Settings: version number and build variant (development, preview, production) displayed in the app.

### Changed

- Redesigned the light theme to a softer palette.
- Reports now default to "This Month" for salaried jobs.
- Replaced the bar-based bills-by-category chart with an interactive pie chart on all report tabs.
- Improved report chart rendering with daily, weekly, and monthly aggregation plus numerical bar labels.

### Fixed

- Calendar date picker selecting the previous day due to timezone conversion.
- Bills card text overflow in the reports screen.
- Duplicate grouped list in the category payment detail modal.

### Legal

- Replaced the MIT license with a proprietary all-rights-reserved license.
