import type { FastifyInstance } from "fastify";
import { ownerController } from "../controllers/ownerControllers";
import { validate } from "../utils/validate";
import { registerOwnerSchema, loginOwnerSchema } from "../schemas/ownerSchemas";
import { securityConfig } from "../utils/Security";

/**
 * Owner routes plugin
 * Registered under: /api/owner
 *
 * /register et /login sont des endpoints sensibles et publics (pas de JWT
 * requis) : ils sont donc protégés par un rate limiting dédié, plus strict
 * que le rate limiting global, afin de limiter le brute-force et le
 * credential stuffing.
 */
export async function ownerRoutes(fastify: FastifyInstance) {
  const authRateLimit = {
    max: securityConfig.authRateLimit.max,
    timeWindow: securityConfig.authRateLimit.timeWindow,
  };

  /**
   * POST /register
   * Register a new owner
   */
  fastify.post("/register", {
    config: { rateLimit: authRateLimit },
    preHandler: [validate({ body: registerOwnerSchema })],
    handler: ownerController.registerOwnerHandler,
  });

  /**
   * POST /login
   * Authenticate an existing owner
   */
  fastify.post("/login", {
    config: { rateLimit: authRateLimit },
    preHandler: [validate({ body: loginOwnerSchema })],
    handler: ownerController.loginOwnerHandler,
  });
}
