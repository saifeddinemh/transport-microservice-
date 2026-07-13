import { describe, expect, it, vi } from "vitest";
import type { ZodError } from "zod";
import { z } from "zod";
import { errorHandler } from "./Errorhandler";
import { ServerErrors } from "./serverErrors";

function buildRequestMock() {
  return {
    log: { error: vi.fn() },
    url: "/api/owner/login",
    method: "POST",
  } as any;
}

function buildReplyMock() {
  const reply: Record<string, unknown> = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply as any;
}

describe("errorHandler", () => {
  it("returns 400 with field details for a ZodError, without leaking internals", () => {
    const schema = z.object({ email: z.string().email() });
    const result = schema.safeParse({ email: "not-an-email" });
    expect(result.success).toBe(false);
    const zodError = (result as { success: false; error: ZodError }).error;

    const request = buildRequestMock();
    const reply = buildReplyMock();

    errorHandler(zodError, request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Validation error" })
    );
    // Never leak a raw stack trace to the client.
    const sentPayload = (reply.send as any).mock.calls[0][0];
    expect(JSON.stringify(sentPayload)).not.toContain("at ");
  });

  it("returns the controlled status/message/details for a ServerErrors instance", () => {
    const error = new ServerErrors("Farm not found", 404, { farmId: "abc" });
    const request = buildRequestMock();
    const reply = buildReplyMock();

    errorHandler(error, request, reply);

    expect(reply.status).toHaveBeenCalledWith(404);
    expect(reply.send).toHaveBeenCalledWith({
      message: "Farm not found",
      details: { farmId: "abc" },
    });
  });

  it("forwards Fastify errors with a client-facing status code below 500 as-is", () => {
    const fastifyError = Object.assign(new Error("Bad request payload"), {
      statusCode: 400,
    });
    const request = buildRequestMock();
    const reply = buildReplyMock();

    errorHandler(fastifyError as any, request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith({ message: "Bad request payload" });
  });

  it("never leaks the message, stack, or file path of an unexpected 500 error", () => {
    const internalError = new Error(
      "Connection failed at /home/app/src/utils/prisma.ts:12 (password=hunter2)"
    );
    const request = buildRequestMock();
    const reply = buildReplyMock();

    errorHandler(internalError, request, reply);

    expect(reply.status).toHaveBeenCalledWith(500);
    expect(reply.send).toHaveBeenCalledWith({ message: "Internal Server Error" });

    const sentPayload = (reply.send as any).mock.calls[0][0];
    const serialized = JSON.stringify(sentPayload);
    expect(serialized).not.toContain("prisma.ts");
    expect(serialized).not.toContain("hunter2");
  });

  it("logs every error internally for observability", () => {
    const request = buildRequestMock();
    const reply = buildReplyMock();

    errorHandler(new Error("boom"), request, reply);

    expect(request.log.error).toHaveBeenCalledTimes(1);
  });
});
