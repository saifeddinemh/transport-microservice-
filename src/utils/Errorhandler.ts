import type { FastifyError, FastifyReply, FastifyRequest } from "fastify";
import { ZodError } from "zod";
import { ServerErrors } from "../utils/serverErrors";

/**
 * Gestionnaire d'erreurs global.
 *
 * Règles de sécurité appliquées :
 * - Les erreurs métier (ServerErrors) renvoient un message contrôlé.
 * - Les erreurs de validation Zod sont renvoyées en 400 avec le détail des champs.
 * - Toute autre erreur (bug, exception non prévue) est journalisée en interne
 *   mais renvoie un message générique au client : on ne renvoie JAMAIS la
 *   stack trace, le message d'erreur brut de la librairie, ni le chemin
 *   du fichier source au client, pour éviter de fuiter des informations
 *   internes (chemins, versions de dépendances, requêtes SQL, etc.).
 */
export function errorHandler(
  error: FastifyError | ZodError | Error,
  request: FastifyRequest,
  reply: FastifyReply
) {
  request.log.error({ err: error, url: request.url, method: request.method }, "Request error");

  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Validation error",
      details: error.flatten(),
    });
  }

  if (error instanceof ServerErrors) {
    return reply.status(error.statusCode).send({
      message: error.message,
      details: error.details,
    });
  }

  const fastifyErr = error as FastifyError;
  if (fastifyErr.statusCode && fastifyErr.statusCode < 500) {
    return reply.status(fastifyErr.statusCode).send({
      message: fastifyErr.message,
    });
  }

  // Erreur inattendue (500) : message générique uniquement.
  return reply.status(500).send({
    message: "Internal Server Error",
  });
}
