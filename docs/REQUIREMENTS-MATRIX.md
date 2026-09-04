# Requirements matrix — MediCare Pro

Second-pass audit date: 2026-09-04. Status: COMPLETE | PARTIAL | BROKEN | MISSING | MOCKED.

| ID | Requirement | FE | BE | DB | API | E2E | Notes | Priority | Done |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| R1 | Patient reception / alerts / search | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Accueil search + alerts | P0 | Yes |
| R1b | Patient 360 + RDV tab | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Appointments tab | P0 | Yes |
| R2 | Exam clinical + timestamps | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Sheet + DTO V18 | P0 | Yes |
| R3 | Worklist actions + auto-refresh | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Prefs refresh interval | P0 | Yes |
| R4 | Status machine + audit | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | — | P0 | Prior |
| R5 | Waiting room | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Check-in→ARRIVED fixed | P0 | Yes |
| R6 | Appointments lifecycle UI | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Confirm/reschedule/no-show | P0 | Yes |
| R7 | Reports + templates + print mark | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | V19 templates | P0 | Yes |
| R8 | Billing lifecycle | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Catalogue prices | P0 | Prior |
| R9 | Catalogue admin | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | — | P0 | Prior |
| R10 | Documents | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | No fake scanner | P1 | Prior |
| R11 | Labels | COMPLETE | N/A | N/A | N/A | PARTIAL | Browser print | P2 | Prior |
| R12 | DICOM/PACS | PARTIAL | PARTIAL | COMPLETE | COMPLETE | PARTIAL | DB provider boundary | P1 | Prior |
| R13 | Dashboard KPIs | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Real SQL | P0 | Prior |
| R14 | Dictionaries | COMPLETE | COMPLETE | COMPLETE | COMPLETE | PARTIAL | Not yet in CR comboboxes | P1 | Partial |
| R15 | User preferences | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | Refresh wired to worklist | P1 | Yes |
| R16 | RBAC | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | — | P0 | Prior |
| R17 | Audit trail | COMPLETE | COMPLETE | COMPLETE | COMPLETE | COMPLETE | + print/submit audit | P0 | Yes |
| R18 | Complementary exam | PARTIAL | COMPLETE | COMPLETE | COMPLETE | PARTIAL | API ready; FE menu optional | P1 | Partial |
| R19 | Invoice PDF by invoice id | PARTIAL | PARTIAL | COMPLETE | PARTIAL | PARTIAL | Exam PDF works | P2 | Open |
| R20 | Voice dictation | MISSING | MISSING | — | — | — | Boundary only | P3 | N/A |

## External (honest)

- PACS/WADO, physical scanner, thermal printers — not integrated
- ML fraud service optional :8090
