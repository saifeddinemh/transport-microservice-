import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import cors, { type FastifyCorsOptions } from "@fastify/cors";

const DEFAULT_ALLOWED_ORIGINS = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:5173",
  "http://127.0.0.1:5173",
];

function toPositiveInt(value: string | undefined, fallback: number) {
  const parsed = Number(value ?? fallback);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function getConfiguredOrigins(): string[] {
  return [
    ...DEFAULT_ALLOWED_ORIGINS,
    ...(process.env.CORS_ORIGIN
      ? process.env.CORS_ORIGIN.split(",")
          .map((entry) => entry.trim())
          .filter(Boolean)
      : []),
  ];
}

const corsOptions: FastifyCorsOptions = {
  origin: (origin, callback) => {
    const configuredOrigins = new Set<string>(getConfiguredOrigins());

    if (!origin) {
      callback(null, true);
      return;
    }

    callback(null, configuredOrigins.has(origin));
  },
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
  credentials: false,
  maxAge: 86400,
};

export const securityConfig = {
  cors: corsOptions,
  globalRateLimit: {
    max: toPositiveInt(process.env.RATE_LIMIT_MAX, 100),
    timeWindow: "15 minutes",
  },
  authRateLimit: {
    max: toPositiveInt(process.env.AUTH_RATE_LIMIT_MAX, 10),
    timeWindow: "15 minutes",
  },
};

/**
 * Plugin regroupant tous les durcissements de sécurité transverses :
 * - en-têtes de sécurité HTTP (helmet)
 * - CORS strict (liste blanche d'origines, pas de wildcard par défaut)
 * - rate limiting global anti-brute-force / anti-DoS
 */
async function securityPlugin(fastify: FastifyInstance) {
  await fastify.register(helmet, {
    global: true,
    contentSecurityPolicy: {
      directives: {
        defaultSrc: ["'self'"],
        objectSrc: ["'none'"],
        baseUri: ["'self'"],
        frameAncestors: ["'none'"],
      },
    },
    crossOriginResourcePolicy: { policy: "same-site" },
    referrerPolicy: { policy: "no-referrer" },
  });

  await fastify.register(cors, securityConfig.cors);

  await fastify.register(rateLimit, {
    global: true,
    max: securityConfig.globalRateLimit.max,
    timeWindow: securityConfig.globalRateLimit.timeWindow,
    allowList: [],
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: "Too Many Requests",
      message: `Too many requests. Please try again in ${context.after}.`,
    }),
  });
}

export default fp(securityPlugin, { name: "security-plugin" });
