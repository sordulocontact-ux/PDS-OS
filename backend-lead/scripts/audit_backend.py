#!/usr/bin/env python3
"""
audit_backend.py — scan statique d'un dépôt pour les red flags backend.

Usage :
    python audit_backend.py <chemin-du-repo> [--json]

Ce script ne remplace pas un audit de sécurité ; il attrape en 2 secondes les erreurs qui
reviennent dans 80 % des revues : secrets côté client, service_role exposée, SQL concaténé,
SELECT * dans du code de liste, console.log en prod, .npmrc non durci, migrations dangereuses,
middleware Next.js comme unique gardien.

Sortie : une liste de findings [SEVERITY] fichier:ligne — message, puis un résumé.
Code de retour : 1 si au moins un finding HIGH, sinon 0.
Zéro dépendance externe (stdlib uniquement).
"""

from __future__ import annotations

import json
import os
import re
import sys
from dataclasses import dataclass, asdict
from pathlib import Path

CODE_EXT = {".ts", ".tsx", ".js", ".jsx", ".mjs", ".cjs", ".py", ".sql"}
SKIP_DIRS = {"node_modules", ".git", ".next", "dist", "build", ".turbo", ".venv", "venv",
             "__pycache__", "coverage", ".output", "out", ".vercel"}
CLIENT_HINTS = ("components/", "app/", "pages/", "src/client", "hooks/", "lib/client")
SERVER_HINTS = ("server/", "api/", "actions", "dal/", "db/", "worker", "jobs/", "scripts/", "migrations/", "supabase/")


@dataclass
class Finding:
    severity: str  # HIGH | MEDIUM | LOW
    path: str
    line: int
    rule: str
    message: str


def iter_files(root: Path):
    for dirpath, dirnames, filenames in os.walk(root):
        dirnames[:] = [d for d in dirnames if d not in SKIP_DIRS]
        for f in filenames:
            p = Path(dirpath) / f
            if p.suffix in CODE_EXT or f in {".npmrc", ".env", ".env.local", ".env.production",
                                             "package.json", "pnpm-workspace.yaml", ".pnpmrc"}:
                yield p


def is_client_file(rel: str, text: str) -> bool:
    if "'use client'" in text[:200] or '"use client"' in text[:200]:
        return True
    if "'use server'" in text[:200] or '"use server"' in text[:200]:
        return False
    if "server-only" in text[:400]:
        return False
    if any(h in rel for h in SERVER_HINTS):
        return False
    return rel.endswith((".tsx", ".jsx")) and any(h in rel for h in CLIENT_HINTS)


# ---------- règles ligne par ligne ----------

SECRET_PATTERNS = [
    (re.compile(r"NEXT_PUBLIC_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|DATABASE_URL|API_KEY)", re.I),
     "HIGH", "public-secret", "Variable NEXT_PUBLIC_* contenant un secret : elle est embarquée dans le bundle client."),
    (re.compile(r"(VITE|EXPO_PUBLIC)_[A-Z0-9_]*(SECRET|SERVICE_ROLE|PRIVATE|PASSWORD|DATABASE_URL)", re.I),
     "HIGH", "public-secret", "Variable publique (VITE_/EXPO_PUBLIC_) contenant un secret."),
    (re.compile(r"sk_live_[0-9a-zA-Z]{10,}"), "HIGH", "hardcoded-secret", "Clé Stripe live en dur."),
    (re.compile(r"eyJhbGciOi[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{20,}\.[A-Za-z0-9_-]{10,}"), "HIGH", "hardcoded-jwt",
     "JWT en dur dans le code (clé Supabase service_role ?)."),
    (re.compile(r"postgres(ql)?://[^\s'\"]+:[^\s'\"@]+@"), "HIGH", "hardcoded-dsn", "DATABASE_URL avec mot de passe en dur."),
    (re.compile(r"(AKIA|ASIA)[0-9A-Z]{16}"), "HIGH", "hardcoded-secret", "Access key AWS en dur."),
    (re.compile(r"ghp_[0-9A-Za-z]{30,}|github_pat_[0-9A-Za-z_]{30,}"), "HIGH", "hardcoded-secret", "Token GitHub en dur."),
]

SQL_CONCAT = re.compile(r"""(query|execute|raw|\$queryRawUnsafe|\$executeRawUnsafe|sql\.raw)\s*\(\s*(`[^`]*\$\{|['"][^'"]*['"]\s*\+)""")
SELECT_STAR = re.compile(r"""select\s+\*\s+from""", re.I)
CONSOLE_LOG = re.compile(r"""\bconsole\.(log|debug|info)\(""")
SERVICE_ROLE = re.compile(r"""service_role|SUPABASE_SERVICE_ROLE|SERVICE_ROLE_KEY""", re.I)
DANGEROUS_HTML = re.compile(r"""dangerouslySetInnerHTML""")
EVAL_EXEC = re.compile(r"""\b(eval|new Function|child_process\.exec|exec)\s*\(""")
CORS_STAR = re.compile(r"""(Access-Control-Allow-Origin['"]?\s*[:,]\s*['"]\*|origin:\s*['"]\*['"]|allow_origins\s*=\s*\[\s*['"]\*['"])""")
MD5_SHA1_PW = re.compile(r"""(md5|sha1)\s*\(.*(pass|pwd)""", re.I)
JWT_NONE = re.compile(r"""algorithms?\s*[:=]\s*\[?\s*['"]none['"]""", re.I)

# migrations
CREATE_INDEX = re.compile(r"""create\s+(unique\s+)?index\s+(?!concurrently)""", re.I)
ALTER_TYPE = re.compile(r"""alter\s+table\s+\S+\s+alter\s+column\s+\S+\s+(set\s+data\s+)?type\b""", re.I)
RENAME = re.compile(r"""alter\s+table\s+\S+\s+rename\s+(column|to)\b""", re.I)
ADD_NOT_NULL = re.compile(r"""add\s+column\s+\S+\s+\S+.*not\s+null(?!.*default)""", re.I)
LOCK_TIMEOUT = re.compile(r"""lock_timeout""", re.I)
DISABLE_RLS = re.compile(r"""disable\s+row\s+level\s+security""", re.I)
POLICY_TRUE = re.compile(r"""(using|with\s+check)\s*\(\s*true\s*\)""", re.I)
AUTH_UID_UNWRAPPED = re.compile(r"""(?<!select\s)auth\.uid\(\)""")
SECURITY_DEFINER = re.compile(r"""security\s+definer""", re.I)


def scan_code(rel: str, text: str, findings: list[Finding]):
    client = is_client_file(rel, text)
    lines = text.splitlines()
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if s.startswith(("//", "#", "*", "--")):
            continue
        for pat, sev, rule, msg in SECRET_PATTERNS:
            if pat.search(line):
                findings.append(Finding(sev, rel, i, rule, msg))
        if SERVICE_ROLE.search(line) and (client or rel.endswith((".tsx", ".jsx")) and "server" not in rel):
            findings.append(Finding("HIGH", rel, i, "service-role-client",
                                    "service_role référencée dans un fichier client : elle bypass RLS et doit rester serveur."))
        if SQL_CONCAT.search(line):
            findings.append(Finding("HIGH", rel, i, "sql-concat", "SQL construit par concaténation/template : injection possible. Utilise des paramètres."))
        if SELECT_STAR.search(line) and rel.endswith((".ts", ".js", ".py", ".sql")) and "migration" not in rel:
            findings.append(Finding("LOW", rel, i, "select-star", "SELECT * : sélectionne les colonnes du view model."))
        if CONSOLE_LOG.search(line) and rel.endswith((".ts", ".js", ".tsx", ".jsx")) and "test" not in rel and "script" not in rel:
            findings.append(Finding("LOW", rel, i, "console-log", "console.log : utilise le logger structuré (pino) avec requestId."))
        if DANGEROUS_HTML.search(line):
            findings.append(Finding("MEDIUM", rel, i, "xss-risk", "dangerouslySetInnerHTML : vérifie la sanitization (rehype-sanitize/DOMPurify)."))
        if EVAL_EXEC.search(line) and rel.endswith((".ts", ".js", ".mjs", ".cjs")):
            findings.append(Finding("MEDIUM", rel, i, "exec", "eval/exec : injection de commande possible ; execFile avec tableau d'arguments."))
        if CORS_STAR.search(line):
            findings.append(Finding("MEDIUM", rel, i, "cors-star", "CORS '*' : liste explicite d'origines, jamais * avec credentials."))
        if MD5_SHA1_PW.search(line):
            findings.append(Finding("HIGH", rel, i, "weak-hash", "MD5/SHA-1 pour un mot de passe : Argon2id ou bcrypt."))
        if JWT_NONE.search(line):
            findings.append(Finding("HIGH", rel, i, "jwt-none", "Algorithme JWT 'none' accepté."))

    # middleware Next.js comme unique auth
    if rel.endswith(("middleware.ts", "middleware.js", "proxy.ts", "proxy.js")) and re.search(r"(session|token|auth|jwt)", text, re.I):
        findings.append(Finding("MEDIUM", rel, 1, "middleware-auth",
                                "Auth dans middleware/proxy : OK pour rediriger, mais chaque action/handler/DAL doit re-vérifier (CVE-2025-29927)."))


def scan_migration(rel: str, text: str, findings: list[Finding]):
    lines = text.splitlines()
    has_lock_timeout = bool(LOCK_TIMEOUT.search(text))
    for i, line in enumerate(lines, 1):
        s = line.strip()
        if s.startswith("--"):
            continue
        if CREATE_INDEX.search(line):
            findings.append(Finding("MEDIUM", rel, i, "index-not-concurrent", "CREATE INDEX sans CONCURRENTLY : bloque les écritures pendant la construction."))
        if ALTER_TYPE.search(line):
            findings.append(Finding("HIGH", rel, i, "alter-type", "ALTER COLUMN TYPE : réécriture + verrou exclusif. Expand/contract."))
        if RENAME.search(line):
            findings.append(Finding("MEDIUM", rel, i, "rename", "RENAME : casse l'ancien code encore déployé. Expand/contract sur 3 déploiements."))
        if ADD_NOT_NULL.search(line):
            findings.append(Finding("MEDIUM", rel, i, "add-not-null", "ADD COLUMN NOT NULL sans DEFAULT : échoue ou scanne sous verrou. Nullable → backfill → NOT NULL."))
        if DISABLE_RLS.search(line):
            findings.append(Finding("HIGH", rel, i, "rls-disabled", "DISABLE ROW LEVEL SECURITY : la table devient publique via l'API."))
        if POLICY_TRUE.search(line):
            findings.append(Finding("HIGH", rel, i, "policy-true", "Policy USING (true) / WITH CHECK (true) : aucun filtre, tout le monde voit/écrit tout."))
        if AUTH_UID_UNWRAPPED.search(line) and "policy" in text.lower():
            findings.append(Finding("LOW", rel, i, "auth-uid-unwrapped", "auth.uid() nu dans une policy : utilise (select auth.uid()) pour la mise en cache par requête."))
        if SECURITY_DEFINER.search(line) and "search_path" not in text.lower():
            findings.append(Finding("MEDIUM", rel, i, "security-definer", "SECURITY DEFINER sans SET search_path : risque de détournement de fonction."))
    if not has_lock_timeout and re.search(r"alter\s+table|create\s+index", text, re.I):
        findings.append(Finding("LOW", rel, 1, "no-lock-timeout", "Migration DDL sans lock_timeout : configure-le au niveau de l'outil ou du script (3–5 s + retry)."))


def scan_npmrc(root: Path, findings: list[Finding]):
    npmrc = root / ".npmrc"
    pnpm_ws = root / "pnpm-workspace.yaml"
    pkg = root / "package.json"
    if not pkg.exists():
        return
    text = npmrc.read_text(errors="ignore") if npmrc.exists() else ""
    ws = pnpm_ws.read_text(errors="ignore") if pnpm_ws.exists() else ""
    lock_pnpm = (root / "pnpm-lock.yaml").exists()
    lock_npm = (root / "package-lock.json").exists()
    lock_yarn = (root / "yarn.lock").exists()
    lock_bun = (root / "bun.lock").exists() or (root / "bun.lockb").exists()
    if not (lock_pnpm or lock_npm or lock_yarn or lock_bun):
        findings.append(Finding("HIGH", "package.json", 1, "no-lockfile", "Aucun lockfile commité : les installs ne sont pas reproductibles (supply chain)."))
    if lock_pnpm:
        if "minimumReleaseAge" not in ws and "minimum-release-age" not in text:
            findings.append(Finding("MEDIUM", "pnpm-workspace.yaml", 1, "no-min-release-age", "pnpm : définis minimumReleaseAge: 10080 (7 jours) — v11 met 1 jour par défaut."))
    elif lock_npm:
        if "min-release-age" not in text:
            findings.append(Finding("MEDIUM", ".npmrc", 1, "no-min-release-age", "npm : ajoute min-release-age=7 (npm ≥ 11.10)."))
        if "ignore-scripts" not in text:
            findings.append(Finding("MEDIUM", ".npmrc", 1, "no-ignore-scripts", "npm : ajoute ignore-scripts=true + liste blanche des paquets qui en ont besoin."))
    # .env commité ?
    for name in (".env", ".env.local", ".env.production"):
        p = root / name
        if p.exists():
            gi = (root / ".gitignore").read_text(errors="ignore") if (root / ".gitignore").exists() else ""
            if name not in gi and ".env*" not in gi and ".env" not in gi:
                findings.append(Finding("HIGH", name, 1, "env-not-ignored", f"{name} présent et absent du .gitignore."))


def main():
    args = [a for a in sys.argv[1:] if not a.startswith("--")]
    as_json = "--json" in sys.argv
    root = Path(args[0] if args else ".").resolve()
    if not root.exists():
        print(f"Chemin introuvable : {root}", file=sys.stderr)
        sys.exit(2)

    findings: list[Finding] = []
    for p in iter_files(root):
        rel = str(p.relative_to(root))
        try:
            text = p.read_text(errors="ignore")
        except Exception:
            continue
        if p.suffix == ".sql" or "migration" in rel.lower() or "/supabase/" in f"/{rel}":
            scan_migration(rel, text, findings)
        if p.suffix in CODE_EXT and p.suffix != ".sql":
            scan_code(rel, text, findings)
    scan_npmrc(root, findings)

    order = {"HIGH": 0, "MEDIUM": 1, "LOW": 2}
    findings.sort(key=lambda f: (order[f.severity], f.path, f.line))

    if as_json:
        print(json.dumps([asdict(f) for f in findings], indent=2, ensure_ascii=False))
    else:
        if not findings:
            print("✅ Aucun red flag détecté (ce qui ne veut pas dire qu'il n'y en a pas — lis security.md §11).")
        for f in findings:
            print(f"[{f.severity}] {f.path}:{f.line} — {f.message}  ({f.rule})")
        counts = {k: sum(1 for f in findings if f.severity == k) for k in order}
        print(f"\nRésumé : {counts['HIGH']} HIGH · {counts['MEDIUM']} MEDIUM · {counts['LOW']} LOW")
    sys.exit(1 if any(f.severity == "HIGH" for f in findings) else 0)


if __name__ == "__main__":
    main()
