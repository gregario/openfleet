# Data Protection Impact Assessment (DPIA) — OpenFleet Deployment

*Required under GDPR Article 35 for systematic monitoring of employees via GPS.*

## 1. Description of Processing

| Field | Detail |
|-------|--------|
| **Controller** | [Your Business Name, address, contact] |
| **DPO (if appointed)** | [Name, contact] |
| **System** | OpenFleet — self-hosted fleet management software |
| **Data subjects** | Drivers / employees assigned to company vehicles |
| **Data categories** | GPS location (real-time), trip history, driver identity, license details, inspection records |
| **Purpose** | Fleet operational management, vehicle security, maintenance scheduling, compliance |
| **Lawful basis** | Legitimate interest (Article 6(1)(f)) |
| **Storage location** | [Self-hosted on company infrastructure at: address/provider] |
| **Retention periods** | GPS positions: 30 days. Trip summaries: 12 months. Driver profiles: employment + 12 months. Inspections: 24 months. |

## 2. Necessity and Proportionality

### Is the processing necessary?
[Describe why GPS tracking is necessary for your fleet operations — e.g., vehicle security, customer appointment tracking, mileage verification, duty of care]

### Is it proportionate?
- Tracking is limited to work hours only (configurable schedule)
- Drivers can end tracking via "End Shift" toggle
- Only vehicle location is tracked (no audio, no cabin camera)
- Data is automatically purged after retention period
- Minimum data collected: position, speed, heading, timestamp

### Could the purpose be achieved with less intrusive means?
[Explain why alternatives — e.g., manual trip logs, odometer readings — are insufficient]

## 3. Risks to Data Subjects

| Risk | Likelihood | Severity | Mitigation |
|------|-----------|----------|------------|
| Tracking outside work hours reveals private movements / home location | Medium | High | Tracking schedule (work hours only) enabled by default; End Shift toggle available to drivers |
| Location data used for unjustified disciplinary action | Medium | High | Clear policy that tracking data is for fleet operations, not performance monitoring; no automated behavior scoring in V1 |
| Data breach exposes driver location history | Low | High | Self-hosted (no third-party exposure); configurable retention with auto-purge; database encryption recommended |
| Data retained longer than necessary | Medium | Medium | Automated purge enforced by system; configurable retention periods |
| Drivers unaware they are being tracked | Low | High | First-login privacy notice (mandatory); persistent tracking indicator in UI; signed acknowledgment form |

## 4. Measures to Address Risks

- [x] Privacy notice displayed at first driver login (mandatory acknowledgment)
- [x] Tracking-active indicator visible in driver UI at all times
- [x] Tracking schedule configurable and enabled by default (work hours only)
- [x] End Shift toggle available to drivers
- [x] Configurable data retention with automated purge
- [x] Per-driver data export capability (right of access)
- [x] Per-driver data hard delete capability (right to erasure)
- [ ] Database encryption enabled on hosting infrastructure
- [ ] Regular retention/purge audit (recommend quarterly)
- [ ] Signed GPS tracking acknowledgment forms collected from all drivers

## 5. Consultation

| Stakeholder | Consulted? | Date | Outcome |
|-------------|-----------|------|---------|
| Employees / drivers | [ ] | | |
| Works council / union (if applicable) | [ ] | | |
| Data Protection Officer (if appointed) | [ ] | | |
| Legal counsel | [ ] | | |

## 6. Decision

**Assessment outcome:** [Approved / Approved with conditions / Rejected]

**Signed by:** _________________________ **Date:** _____________

**Review date:** [12 months from deployment, or sooner if processing changes]
