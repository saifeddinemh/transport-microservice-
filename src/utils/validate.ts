import type { FastifyReply, FastifyRequest } from "fastify";
import type { ZodTypeAny } from "zod";

interface ValidationSchemas {
  body?: ZodTypeAny;
  params?: ZodTypeAny;
  query?: ZodTypeAny;
}

/**
 * Construit un preHandler Fastify qui valide body/params/query avec Zod
 * AVANT d'exécuter le controller.
 *
 * En cas d'échec, la requête est rejetée en 400 et n'atteint jamais la
 * couche service/Prisma — c'est la première ligne de défense contre les
 * injections, les payloads malformés et les données inattendues.
 *
 * Usage:
 *   fastify.post("/", {
 *     preHandler: [validate({ body: createOwnerSchema })],
 *     handler: ownerController.registerOwnerHandler,
 *   });
 */
export function validate(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, reply: FastifyReply) => {
    if (schemas.body) {
      const result = schemas.body.safeParse(request.body);
      if (!result.success) {
        return reply.status(400).send({
          message: "Invalid request body",
          details: result.error.flatten(),
        });
      }
      request.body = result.data;
    }

    if (schemas.params) {
      const result = schemas.params.safeParse(request.params);
      if (!result.success) {
        return reply.status(400).send({
          message: "Invalid request params",
          details: result.error.flatten(),
        });
      }
      request.params = result.data;
    }

    if (schemas.query) {
      const result = schemas.query.safeParse(request.query);
      if (!result.success) {
        return reply.status(400).send({
          message: "Invalid request query",
          details: result.error.flatten(),
        });
      }
      request.query = result.data;
    }
  };
}
