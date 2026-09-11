# 09 — Implementation Roadmap

Aligned with your master phases. **No coding of app features until Phase 1 approval.**

| Phase | Deliverable | Exit criteria |
|---|---|---|
| **1** | Requirements + architecture docs (this folder) | Stakeholder approval of stack, ERD, workflows, RBAC |
| **2** | Formal ERD + Prisma schema draft | Schema review; no contradictory FKs |
| **3** | Monorepo foundation, Docker, CI skeleton, lint, env | `api` + `web` boot; health check |
| **4** | Auth + RBAC + audit stub | Permission boundary tests pass |
| **5** | Articles, categories, variants, units | Unique SKU/barcode enforced |
| **6** | Warehouses + location hierarchy | Location path query works |
| **7** | **Inventory transaction engine** | Cannot mutate balance without ledger; concurrency test |
| **8** | Suppliers, PO, receiving (partial) | Pending qty correct; putaway creates stock |
| **9** | Production + BOM + schedule/delay | Material consume + FG produce |
| **10** | Sorting queue | Status transitions + qty splits |
| **11** | Reusable QC engine | Works for receiving/production/sorting/returns |
| **12** | Reservations, picking, packing | Cannot over-reserve |
| **13** | Orders, dispatch, returns | Full outbound + return inspection |
| **14** | Transfers + adjustments | Approval gate works |
| **15** | Stock counting | Discrepancy → adjustment workflow |
| **16** | Dashboard + reports + export | KPIs from live data only |
| **17** | Notifications (BullMQ rules) | Low stock / delay / overdue events |
| **18** | Barcode/QR scan workflows | Receive/pick/count via scan |
| **19** | Security hardening | Upload limits, rate limits, audit completeness |
| **20** | Automated tests | Unit + integration + workflow e2e |
| **21–23** | Staging → UAT → Production | Backup/restore + rollback documented |

## After each phase (agent checklist)

1. What was implemented  
2. Files created/changed  
3. DB changes  
4. APIs  
5. Tests  
6. Assumptions  
7. Remaining work  
8. Regression check  

## End-to-end acceptance path

```text
Article → Supplier → PO → Partial receive → QC → Putaway
→ View inventory → Production order → Reserve/consume materials
→ Complete FG → QC → Sorting → Reserve for order
→ Pick → Pack → Dispatch
→ Verify ledger + audit + reports
```

## Immediate next step after your approval

**Phase 3 scaffolding** (or Phase 2 Prisma schema if you want schema locked first):

- pnpm monorepo
- NestJS API + Prisma + Postgres
- Next.js web shell with main menu structure
- Seed Super Admin + permission catalog
