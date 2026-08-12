# Product contract version baseline

The dynamic registry protocol release is `@mariya-abdul/deltcrm-product-contracts@2.0.0`.

| Repository | Consumer | Required version |
| --- | --- | --- |
| Platform | `apps/api` | `2.0.0` exact |
| HRMS | `apps/api` | `2.0.0` exact |
| Future products | product API/worker | one exact Platform-supported version |

Workspace copies, ranges, Git references, and mixed versions are rejected. The
package defines the protocol and reusable clients; product manifests remain in
their product repositories and are registered as runtime data.
