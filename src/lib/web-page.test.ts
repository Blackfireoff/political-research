import { describe, expect, it } from "vitest";
import { assertPublicUrl, isBlockedAddress } from "./web-page";

describe("isBlockedAddress", () => {
  it("bloque les adresses internes", () => {
    for (const a of ["127.0.0.1", "10.1.2.3", "172.18.0.2", "192.168.1.1", "169.254.169.254", "0.0.0.0", "::1", "fd00::1", "fe80::1", "::ffff:127.0.0.1"])
      expect(isBlockedAddress(a), a).toBe(true);
  });
  it("laisse passer les adresses publiques", () => {
    for (const a of ["1.1.1.1", "151.101.1.1", "2606:4700::1111"]) expect(isBlockedAddress(a), a).toBe(false);
  });
});

describe("assertPublicUrl", () => {
  it("refuse les schémas autres que http(s) et les hôtes internes", async () => {
    await expect(assertPublicUrl("file:///etc/passwd")).rejects.toThrow();
    await expect(assertPublicUrl("http://127.0.0.1:3000/api/ingest")).rejects.toThrow();
    await expect(assertPublicUrl("http://[::1]/")).rejects.toThrow();
    await expect(assertPublicUrl("http://169.254.169.254/latest/meta-data")).rejects.toThrow();
    await expect(assertPublicUrl("http://localhost:8080/")).rejects.toThrow();
  });
  it("accepte une IP publique littérale", async () => {
    await expect(assertPublicUrl("https://1.1.1.1/")).resolves.toBeInstanceOf(URL);
  });
});
