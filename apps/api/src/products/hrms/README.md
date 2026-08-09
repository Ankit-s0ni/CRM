# HRMS product boundary

HRMS is the customer-facing product. Attendance and Payroll are internal HRMS
capabilities composed only by `HrmsProductModule`.

Product code consumes Platform identity, entitlement and provisioning state via
`@deltcrm/product-contracts`. It must not read Platform-owned tables directly.

During the modular-monolith phase this adapter resolves the contract in process.
The same contract becomes an HTTP/service-token boundary when HRMS is extracted.

The temporary shared-database adapter is owned by the HRMS team. It must be
removed during extraction after HRMS reads identity and entitlement only through
the generated Platform client and product token verifier. Product business data
must never be added to this adapter.
