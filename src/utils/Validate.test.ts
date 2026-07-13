import { describe, expect, it, vi } from "vitest";
import { z } from "zod";
import { validate } from "./validate";

function buildReplyMock() {
  const reply: Record<string, unknown> = {};
  reply.status = vi.fn().mockReturnValue(reply);
  reply.send = vi.fn().mockReturnValue(reply);
  return reply;
}

describe("validate middleware", () => {
  const bodySchema = z.object({ email: z.string().email() });
  const paramsSchema = z.object({ id: z.string().uuid() });
  const querySchema = z.object({ page: z.coerce.number().int().positive() });

  it("lets a valid body pass through without responding", async () => {
    const request: any = { body: { email: "user@agrofield.com" } };
    const reply: any = buildReplyMock();

    await validate({ body: bodySchema })(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.body).toEqual({ email: "user@agrofield.com" });
  });

  it("responds with 400 and details when the body is invalid", async () => {
    const request: any = { body: { email: "not-an-email" } };
    const reply: any = buildReplyMock();

    await validate({ body: bodySchema })(request, reply);

    expect(reply.status).toHaveBeenCalledWith(400);
    expect(reply.send).toHaveBeenCalledWith(
      expect.objectContaining({ message: "Invalid request body" })
    );
  });

  it("validates params and query when provided", async () => {
    const request: any = {
      body: {},
      params: { id: "3fa85f64-5717-4562-b3fc-2c963f66afa6" },
      query: { page: "2" },
    };
    const reply: any = buildReplyMock();

    await validate({ params: paramsSchema, query: querySchema })(request, reply);

    expect(reply.status).not.toHaveBeenCalled();
    expect(request.params).toEqual({ id: "3fa85f64-5717-4562-b3fc-2c963f66afa6" });
    expect(request.query).toEqual({ page: 2 });
  });
});
