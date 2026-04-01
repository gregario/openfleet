# Data Retention Policy — [Your Business Name]

*For use with OpenFleet fleet management software.*

## Retention Schedule

| Data Type | Default Retention | Your Setting | Rationale |
|-----------|------------------|--------------|-----------|
| GPS positions (granular) | 30 days | [____] days | Operational use only; oldest positions purged automatically |
| Trip summaries | 12 months | [____] months | Fleet reporting, insurance, mileage verification |
| Inspection records | 24 months | [____] months | Regulatory compliance, audit trail |
| Maintenance records | Life of vehicle + 24 months | [____] | Liability, resale value, warranty |
| Driver profiles | Employment + 12 months | [____] months post-employment | Legal claims limitation period |
| Driver license data | Employment + 6 months | [____] months post-employment | Driving authorization verification |
| Vehicle documents | Life of vehicle + 12 months | [____] | Registration, insurance records |

## Automated Purge

OpenFleet automatically deletes data that exceeds the configured retention period. Purge runs [daily/weekly] as a background process. Purge actions are logged in the system audit log.

## Manual Deletion

Drivers may request deletion of their personal data at any time (GDPR Article 17). To process a request:
1. Open OpenFleet → Settings → Drivers → [Driver Name] → Delete Driver Data
2. System will hard-delete all personal data associated with the driver
3. An audit log entry records that deletion occurred (but not the deleted data)
4. Confirm deletion to the requesting driver within [30 days]

**Exception:** Data required for legal obligations (e.g., inspection records within regulatory retention period) may be retained. Inform the driver of the specific reason and duration.

## Review

This policy should be reviewed [annually / when processing activities change / when regulations change].

**Approved by:** _________________________ **Date:** _____________
