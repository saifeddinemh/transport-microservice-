import Fastify from "fastify";
import fastifyJwt from "@fastify/jwt";
import fastifyEnv from "@fastify/env";
import { baseRoutes } from "../routes/baseRoutes";
import { appRoutes } from "../routes/index";
import appDecoratorsPlugin from "../decorators";
import securityPlugin from "./Security";
import { errorHandler } from "./Errorhandler";

export async function createServer() {
  const fastify = Fastify({ logger: true });

  // Chargement et validation stricte des variables d'environnement requises.
  // Le serveur refuse de démarrer si l'une d'entre elles est manquante ou
  // mal typée : cela évite de tourner en production avec un JWT_SECRET vide
  // ou une configuration incomplète.
  const schema = {
    type: "object",
    required: ["PEPPER_SECRET_KEY", "JWT_SECRET", "DATABASE_URL"],
    properties: {
      NODE_ENV: { type: "string", default: "dev" },
      PEPPER_SECRET_KEY: { type: "string" },
      JWT_SECRET: { type: "string" },
      DATABASE_URL: { type: "string" },
      HOST: { type: "string", default: "0.0.0.0" },
      PORT: { type: "string", default: "3002" },
      CORS_ORIGIN: { type: "string" },
      RATE_LIMIT_MAX: { type: "string" },
      RATE_LIMIT_WINDOW: { type: "string" },
      AUTH_RATE_LIMIT_MAX: { type: "string" },
      AUTH_RATE_LIMIT_WINDOW: { type: "string" },
    },
  };

  await fastify.register(fastifyEnv, {
    schema,
    dotenv: true,
    data: process.env,
  });

  // En-têtes de sécurité (helmet), CORS strict et rate limiting global.
  await fastify.register(securityPlugin);

  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET is not set in environment variables");
  }
  // Register JWT plugin for authentication
  fastify.register(fastifyJwt, {
    secret: jwtSecret,
    sign: {
      expiresIn: "10h", // Token expiry time
    },
  });

  // Register custom decorators for auth and role checks
  await fastify.register(appDecoratorsPlugin);

  // Register routes and controllers
  await fastify.register(baseRoutes, { prefix: "/" });
  await fastify.register(appRoutes, { prefix: "/api" });

  fastify.get("/healthCheck", async (_request, _reply) => {
    return { health: "ok" };
  });

  fastify.setNotFoundHandler((_request, reply) => {
    reply.status(404).send({ message: "Route not found" });
  });

  // Gestion centralisée et sécurisée des erreurs (jamais de stack trace au client).
  fastify.setErrorHandler(errorHandler);

  return fastify;
}
