import { describe, expect, it } from "vitest";

import { withAbortableTimeout } from "./timeout";

describe("withAbortableTimeout", () => {
  it("aborts the running task when the deadline is reached", async () => {
    let aborted = false;

    await expect(
      withAbortableTimeout(
        (signal) =>
          new Promise((_resolve, reject) => {
            signal.addEventListener("abort", () => {
              aborted = true;
              reject(signal.reason);
            });
          }),
        10,
        "deadline reached",
      ),
    ).rejects.toThrow("deadline reached");

    expect(aborted).toBe(true);
  });
});
