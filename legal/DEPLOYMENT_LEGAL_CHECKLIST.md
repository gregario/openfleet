# OpenFleet — Deployment Legal Checklist

Before deploying OpenFleet with real vehicles and drivers, review and complete this checklist. Requirements vary by jurisdiction. Consult local legal counsel if unsure.

## Employee Notification

- [ ] Drivers have been informed in writing that their vehicles will be GPS-tracked during work hours
- [ ] The purpose of tracking has been explained (fleet efficiency, vehicle security, compliance)
- [ ] Drivers have acknowledged the privacy notice (OpenFleet prompts this at first login)

## Consent & Consultation

- [ ] (EU) Data Protection Impact Assessment (DPIA) completed — see `legal/templates/DPIA_TEMPLATE.md`
- [ ] (EU) Works council or employee representatives consulted (required in DE, FR, IT, NL, AT)
- [ ] (US - CT, DE, NY) Written notice of electronic monitoring provided to employees
- [ ] (AU - NSW) 14 days written notice provided before surveillance begins
- [ ] GPS tracking consent/acknowledgment forms signed — see `legal/templates/GPS_TRACKING_CONSENT.md`

## Configuration

- [ ] Tracking schedule configured (work hours only) — Settings → Tracking Schedule
- [ ] Data retention periods configured — Settings → Data Retention
- [ ] Privacy notice text customized for your business — Settings → Privacy Notice
- [ ] "End Shift" toggle explained to drivers

## Data Protection

- [ ] Database hosted on infrastructure you control or trust
- [ ] Database encryption enabled (check your hosting provider's documentation)
- [ ] Backup strategy in place for fleet data
- [ ] Process documented for handling driver data access requests (GDPR Article 15)
- [ ] Process documented for handling driver data deletion requests (GDPR Article 17)

## Disclaimers

- [ ] OpenFleet is NOT a tachograph and does not replace EU tachograph requirements
- [ ] OpenFleet is NOT an ELD (Electronic Logging Device) per US FMCSA standards
- [ ] OpenFleet inspection checklists are NOT DVIR-compliant per 49 CFR 396
- [ ] If operating vehicles >3.5 tonnes (EU) or >10,001 lbs (US), additional regulations may apply

## Ongoing

- [ ] Review data retention and purge logs quarterly
- [ ] Update privacy notice if tracking practices change
- [ ] Re-assess when adding new tracking features or data sources
