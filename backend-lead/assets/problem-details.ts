/**
 * problem-details.ts — erreurs API au format RFC 9457 (application/problem+json).
 *
 * Un seul format d'erreur pour toute l'API. `type` est une URI STABLE par classe d'erreur :
 * le front branche dessus (afficher inline / toast / redirection), jamais sur le texte.
 * Aucune stack, requête SQL ni détail d'infra ne sort d'ici : ils vont dans les logs avec requestId.
 *
 * Usage (Next Route Handler) :
 *   try { ... } catch (err) { return toProblemResponse(err, requestId, log); }
 * Usage (Server Action) :
 *   return { ok: false, error: toProblem(err, requestId, log) };
 * Usage (Hono) : app.onError((err, c) => c.newResponse(...toProblemResponse(err, c.get('requestId'), c.get('log'))))
 *
 * Adapte PROBLEM_BASE à ton domaine. Documente chaque type dans /docs/problems.md.
 */

export const PROBLEM_BASE = "https://api.example.com/problems";

export type FieldError = { field: string; message: string; code?: string };

export type ProblemDetails = {
  type: string; // URI stable (`${PROBLEM_BASE}/validation`)
  title: string; // court, humain, invariant par type
  status: number; // = code HTTP
  detail?: string; // message affichable pour CE cas
  instance?: string; // chemin de la ressource concernée
  requestId?: string; // corrélation avec les logs
  errors?: FieldError[]; // erreurs de champ (422)
  retryAfter?: number; // secondes (429/503)
  [ext: string]: unknown;
};

/** Classe de base : toute erreur "attendue" étend AppError avec un type et un status. */
export class AppError extends Error {
  readonly type: string;
  readonly status: number;
  readonly title: string;
  readonly expose: boolean; // false ⇒ detail masqué (500)
  readonly extra: Record<string, unknown>;
  constructor(opts: {
    type: string;
    status: number;
    title: string;
    detail?: string;
    expose?: boolean;
    cause?: unknown;
    extra?: Record<string, unknown>;
  }) {
    super(opts.detail ?? opts.title, { cause: opts.cause });
    this.name = new.target.name;
    this.type = `${PROBLEM_BASE}/${opts.type}`;
    this.status = opts.status;
    this.title = opts.title;
    this.expose = opts.expose ?? opts.status < 500;
    this.extra = opts.extra ?? {};
  }
}

export class ValidationError extends AppError {
  constructor(
    errors: FieldError[],
    detail = "Certains champs sont invalides.",
  ) {
    super({
      type: "validation",
      status: 422,
      title: "Données invalides",
      detail,
      extra: { errors },
    });
  }
}
export class Unauthorized extends AppError {
  constructor(detail = "Authentification requise.") {
    super({
      type: "unauthorized",
      status: 401,
      title: "Non authentifié",
      detail,
    });
  }
}
export class Forbidden extends AppError {
  constructor(detail = "Vous n'avez pas le droit d'effectuer cette action.") {
    super({ type: "forbidden", status: 403, title: "Accès refusé", detail });
  }
}
export class NotFound extends AppError {
  constructor(resource = "ressource") {
    super({
      type: "not-found",
      status: 404,
      title: "Introuvable",
      detail: `Cette ${resource} n'existe pas ou n'est pas accessible.`,
    });
  }
}
export class Conflict extends AppError {
  constructor(
    detail = "L'état de la ressource a changé.",
    extra?: Record<string, unknown>,
  ) {
    super({ type: "conflict", status: 409, title: "Conflit", detail, extra });
  }
}
export class RateLimited extends AppError {
  constructor(retryAfterSec: number) {
    super({
      type: "rate-limited",
      status: 429,
      title: "Trop de requêtes",
      detail: `Réessayez dans ${retryAfterSec} s.`,
      extra: { retryAfter: retryAfterSec },
    });
  }
}
export class UpstreamUnavailable extends AppError {
  constructor(service: string, retryAfterSec = 30, cause?: unknown) {
    super({
      type: "upstream-unavailable",
      status: 503,
      title: "Service temporairement indisponible",
      detail: `${service} ne répond pas, réessayez.`,
      expose: true,
      cause,
      extra: { retryAfter: retryAfterSec },
    });
  }
}

type Logger = {
  error: (obj: unknown, msg?: string) => void;
  warn: (obj: unknown, msg?: string) => void;
};

/** Traduit n'importe quelle erreur (AppError, ZodError, erreur Postgres, inconnue) en ProblemDetails. */
export function toProblem(
  err: unknown,
  requestId?: string,
  log?: Logger,
  instance?: string,
): ProblemDetails {
  // Zod (ou tout validateur exposant .issues)
  if (isZodLike(err)) {
    const errors = err.issues.map((i) => ({
      field: i.path.join(".") || "(root)",
      message: i.message,
      code: i.code,
    }));
    return build(new ValidationError(errors), requestId, instance);
  }
  // Postgres : violation d'unicité / FK → conflit métier, pas 500
  if (isPgError(err)) {
    if (err.code === "23505")
      return build(
        new Conflict("Cette valeur existe déjà.", {
          constraint: err.constraint,
        }),
        requestId,
        instance,
      );
    if (err.code === "23503")
      return build(
        new Conflict("Une ressource liée manque ou est encore référencée."),
        requestId,
        instance,
      );
    if (err.code === "57014" || err.code === "55P03") {
      log?.warn({ err, requestId }, "db timeout");
      return build(
        new UpstreamUnavailable("La base de données", 5),
        requestId,
        instance,
      );
    }
  }
  if (err instanceof AppError) {
    if (err.status >= 500) log?.error({ err, requestId }, err.type);
    return build(err, requestId, instance);
  }
  // Inconnue : on logue TOUT, on n'expose RIEN. Fail closed.
  log?.error({ err, requestId }, "unhandled error");
  return {
    type: `${PROBLEM_BASE}/internal`,
    title: "Erreur interne",
    status: 500,
    detail:
      "Une erreur inattendue est survenue. Réessayez ou contactez le support avec la référence.",
    requestId,
    instance,
  };
}

export function toProblemResponse(
  err: unknown,
  requestId?: string,
  log?: Logger,
  instance?: string,
): Response {
  const p = toProblem(err, requestId, log, instance);
  const headers: Record<string, string> = {
    "Content-Type": "application/problem+json",
    "Cache-Control": "no-store",
  };
  if (requestId) headers["X-Request-Id"] = requestId;
  if (typeof p.retryAfter === "number")
    headers["Retry-After"] = String(p.retryAfter);
  return new Response(JSON.stringify(p), { status: p.status, headers });
}

function build(
  e: AppError,
  requestId?: string,
  instance?: string,
): ProblemDetails {
  return {
    type: e.type,
    title: e.title,
    status: e.status,
    detail: e.expose ? e.message : undefined,
    instance,
    requestId,
    ...e.extra,
  };
}

function isZodLike(e: unknown): e is {
  issues: { path: (string | number)[]; message: string; code: string }[];
} {
  return (
    typeof e === "object" &&
    e !== null &&
    Array.isArray((e as { issues?: unknown }).issues)
  );
}
function isPgError(e: unknown): e is { code: string; constraint?: string } {
  return (
    typeof e === "object" &&
    e !== null &&
    typeof (e as { code?: unknown }).code === "string" &&
    /^[0-9A-Z]{5}$/.test((e as { code: string }).code)
  );
}
