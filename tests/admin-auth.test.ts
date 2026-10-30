import { afterEach, describe, expect, it } from "vitest";
import { adminToken, isAdminToken, passwordMatches } from "../src/lib/admin-auth";

describe("admin sign-in", () => {
  afterEach(() => {
    delete process.env.ADMIN_PASSWORD;
  });
  it("refuses everything when no strong password is set", async () => {
    process.env.ADMIN_PASSWORD = "short";
    expect(await adminToken()).toBeNull();
    expect(await passwordMatches("short")).toBe(false);
  });
  it("accepts only the right password and its token", async () => {
    process.env.ADMIN_PASSWORD = "a-long-test-password";
    expect(await passwordMatches("a-long-test-password")).toBe(true);
    expect(await passwordMatches("a-long-test-passwore")).toBe(false);
    const token = (await adminToken())!;
    expect(token).not.toContain("password");
    expect(await isAdminToken(token)).toBe(true);
    expect(await isAdminToken(token.slice(1) + "0")).toBe(false);
    expect(await isAdminToken(undefined)).toBe(false);
  });
});
