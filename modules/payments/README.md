# Payment-provider boundary

`provider.ts` owns provider initiation and server-side webhook verification.
`settlement.ts` owns order validation, event idempotency, and the atomic paid
transition/entitlement grant contract. A redirect success page is only UX; it
must never grant access.

The included `LOCAL_TEST` adapter is intentionally deterministic and signs raw
webhook JSON with `x-nexaclass-local-signature`. It is disabled in production.

Production adapters must implement `PaymentProviderAdapter`, keep their API
credentials server-side, verify raw webhook signatures, and use an idempotent
event identifier. The persistence implementation must enforce unique provider
event ids and atomically mark the order paid and grant all order entitlements.

Paymob and Kashier are represented in the provider selection contract but
deliberately fail closed until their credential-specific adapters are added.
