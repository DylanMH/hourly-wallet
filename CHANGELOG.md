# Changelog

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
