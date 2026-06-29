# SUPABASE_SERVICE_KEY Bulk Migration - Completion Report

## Task
Replace all `SUPABASE_SERVICE_KEY` references in `D:\1kaifa\grsds\index.html` with `callAdmin()` calls.

## Results

### Summary
- **Total replacements made: 60+** across 3 rounds of PowerShell scripts
- **callAdmin invocations in file: 65**
- **All active-code SUPABASE_SERVICE_KEY references eliminated**
- **Brace balance: 0 (5631 { / 5631 } ) - PERFECT**
- **Paren balance: 0 (16767 ( / 16767 ) ) - PERFECT**
- **Backup saved: `index.html.bak.20260629193406`**

### Replacement Patterns Applied

| Pattern | Count | Examples |
|---------|-------|---------|
| **SELECT with filters** (Pattern A) | 19 | GET companies/profiles/invitations/custom_forms with query & filters |
| **UPDATE with filter** (Pattern C) | 20+ | PATCH profiles/companies/departments/roles with body + eq filter |
| **DELETE** (Pattern D) | 8 | DELETE companies/departments/custom_field_defs/forms/stages/tags/rules/templates |
| **INSERT** (Pattern E) | 8 | POST companies/invitations/custom_field_defs/forms/stages/tags/rules/backup_logs |
| **RPC** (Pattern F) | 3 | write_op_log + reassign_clients_on_deactivate (3 calls) |
| **UPSERT** | 1 | POST profiles with `resolution=merge-duplicates` |
| **Storage** | 1 | Storage upload → `sb.storage.from().upload()` |

### Cases Requiring Manual Review

1. **Line 6579 (Auth API delete user):** Uses `https://jyefbatmmbelrhhzsgva.supabase.co/auth/v1/admin/users/` (admin API, not REST). Cannot use callAdmin. Commented out with FIXME annotation. Needs admin-proxy Edge Function with a `deleteUser` endpoint.

2. **Line 6850 (Reset password):** Uses `/auth/v1/admin/users/{id}` PUT endpoint. Cannot use callAdmin. Replaced with FIXME annotation. Needs admin-proxy Edge Function with a `resetPassword` endpoint.

3. **Line 3205 (Resignation process):** Complex context with follow-on code (company registry redirection after PATCH). Replaced successfully but should be tested in integration.

### Remaining SUPABASE_SERVICE_KEY References (all in comments)
- Line 3089: Comment noting the removal
- Line 6579: FIXME annotation for Auth API
- Line 6850: Comment about migration

### Scripts Generated
1. `fix_service_key.ps1` - Round 1: ~54 replacements (regex-based)
2. `fix_service_key_round2.ps1` - Round 2: 5 additional replacements
3. `fix_service_key_round3.ps1` - Round 3: regex + fallback substring sweeps

### Known Prefer Header Mappings Applied
- `return=minimal` → query:'*' (default)
- `return=representation` → query:'*' (default)
- `resolution=merge-duplicates` → op:'upsert'

### Risks / Notes
- The `saveDept()` function now uses a conditional callAdmin instead of dynamic url/method
- Workflow template save now uses conditional callAdmin (update vs insert based on wtEditId)
- callAdmin returns `{data, error}` format; code using `r.ok` or `r.json()` has been updated to `r.error` / `r.data`
