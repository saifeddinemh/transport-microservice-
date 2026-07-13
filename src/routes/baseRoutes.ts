import type { FastifyInstance } from "fastify";

export async function baseRoutes(fastify: FastifyInstance) {
  // Basic liveness check — is the server running?
  fastify.get("/", async (_request, _reply) => {
    return { status: "ok", message: "API is running" };
  });

  // Simple readiness check — is the server ready to serve requests?
  fastify.get("/health", async (_request, _reply) => {
    // You can extend this to check DB, cache, other dependencies later
    return { status: "healthy", timestamp: new Date().toISOString() };
  });
}
