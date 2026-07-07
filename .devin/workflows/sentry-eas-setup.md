---
description: Configure Sentry for EAS builds
---

# Configure Sentry for EAS builds

To enable Sentry source map uploads in EAS builds, you need both the DSN and an auth token configured as environment variables.

## 1. Sentry DSN

Already added to the EAS `preview` and `production` environments:

```bash
eas env:create --name SENTRY_DSN --value "https://4cb0eaad1faf5df9abcb23a5f416a499@o4511691077058560.ingest.us.sentry.io/4511691080204288" --environment preview
```

## 2. Sentry auth token

1. Go to Sentry > Settings > Auth Tokens > Create New Token.
2. Scopes required: `org:read` and `project:releases`.
3. Create the secret environment variable in EAS:

```bash
# preview
eas env:create --name SENTRY_AUTH_TOKEN --value "<token>" --environment preview --visibility secret

# production
eas env:create --name SENTRY_AUTH_TOKEN --value "<token>" --environment production --visibility secret
```

## 3. Re-enable source map upload

In `app.config.ts`, remove `disableAutoUpload: true` from the `@sentry/react-native` plugin config:

```js
[
  "@sentry/react-native",
  {
    organization: "hourly-wallet",
    project: "android",
  },
];
```

## 4. Build

```bash
eas build --profile preview
```

Error reporting works without the auth token; source map uploads require it.
