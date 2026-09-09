# Enter Up source relay

Small Cloudflare Worker used by [Enter Up](https://enterup.org) to retrieve
authoritative public event feeds that reject requests from the primary hosted
ingestion environment.

## Endpoints

- `/` — health and source list
- `/wcbra` — official WCBRA iCalendar feed
- `/nbha` — official NBHA iCalendar feed

The Worker is deliberately not a general-purpose proxy. Every upstream is
hard-coded, responses retain explicit provenance headers, upstream failures are
returned as failures, and successful responses are cached for 15 minutes.

## Deployment

Cloudflare Builds deploys the `main` branch with:

```sh
npx wrangler deploy
```

Changes should be tested through a preview deployment before promotion.
