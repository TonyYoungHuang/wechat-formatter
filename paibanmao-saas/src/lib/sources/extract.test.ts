import { describe, expect, it } from "vitest";

import { isBlockedSourceAddress } from "./extract";

describe("public source URL protection", () => {
  it.each(["127.0.0.1", "10.0.0.8", "172.16.0.1", "192.168.1.2", "169.254.169.254", "::1", "fc00::1", "fe80::1"])(
    "blocks private or local address %s",
    (address) => {
      expect(isBlockedSourceAddress(address)).toBe(true);
    },
  );

  it.each(["8.8.8.8", "1.1.1.1", "2404:6800:4005:80a::200e"])("allows public address %s", (address) => {
    expect(isBlockedSourceAddress(address)).toBe(false);
  });
});
