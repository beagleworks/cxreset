import assert from "node:assert/strict";
import { EventEmitter } from "node:events";
import { PassThrough } from "node:stream";
import test from "node:test";
import { fetchCodexRateLimits } from "../dist/codex.js";

class MockChildProcess extends EventEmitter {
  constructor() {
    super();
    this.stdin = new PassThrough();
    this.stdout = new PassThrough();
    this.stderr = new PassThrough();
    this.killedSignals = [];
  }

  kill(signal) {
    this.killedSignals.push(signal);
    return true;
  }
}

function createSpawnMock(onRequest = () => {}) {
  const child = new MockChildProcess();
  const requests = [];
  const spawnCalls = [];
  let buffer = "";

  child.stdin.on("data", (chunk) => {
    buffer += chunk.toString();
    const lines = buffer.split("\n");
    buffer = lines.pop() ?? "";

    for (const line of lines) {
      if (!line.trim()) continue;

      const request = JSON.parse(line);
      requests.push(request);
      onRequest({ child, request, requests });
    }
  });

  const spawnFn = (command, args, options) => {
    spawnCalls.push({ command, args, options });
    return child;
  };

  return { child, requests, spawnCalls, spawnFn };
}

test("fetchCodexRateLimits initializes app-server and parses both windows", async () => {
  const { child, requests, spawnCalls, spawnFn } = createSpawnMock(
    ({ child: spawnedChild, request }) => {
      if (request.id === 1) {
        spawnedChild.stdout.write(
          `${JSON.stringify({ id: 1, result: { userAgent: "cxreset/test" } })}\n`,
        );
        return;
      }

      if (request.id === 2) {
        spawnedChild.stdout.write(
          `${JSON.stringify({
            id: 2,
            result: {
              rateLimits: {
                primary: {
                  usedPercent: 12,
                  windowDurationMins: 300,
                  resetsAt: 1770859735,
                },
                secondary: {
                  usedPercent: 10,
                  windowDurationMins: 10080,
                  resetsAt: 1771311795,
                },
              },
            },
          })}\n`,
        );
      }
    },
  );

  const actual = await fetchCodexRateLimits({
    spawnFn,
    timeoutMs: 100,
    version: "9.9.9",
  });

  assert.deepEqual(spawnCalls, [
    {
      command: "codex",
      args: ["app-server"],
      options: { stdio: ["pipe", "pipe", "pipe"] },
    },
  ]);
  assert.deepEqual(requests[0], {
    method: "initialize",
    id: 1,
    params: {
      clientInfo: { name: "cxreset", version: "9.9.9" },
      capabilities: {},
    },
  });
  assert.deepEqual(requests[1], {
    method: "account/rateLimits/read",
    id: 2,
  });
  assert.deepEqual(actual, {
    fiveHour: {
      usedPercent: 12,
      windowDurationMins: 300,
      resetsAt: 1770859735,
    },
    sevenDay: {
      usedPercent: 10,
      windowDurationMins: 10080,
      resetsAt: 1771311795,
    },
  });
  assert.equal(child.killedSignals.at(-1), "SIGTERM");
});

test("fetchCodexRateLimits accepts missing secondary window", async () => {
  const { spawnFn } = createSpawnMock(({ child, request }) => {
    if (request.id === 1) {
      child.stdout.write(
        `${JSON.stringify({ id: 1, result: { userAgent: "cxreset/test" } })}\n`,
      );
      return;
    }

    if (request.id === 2) {
      child.stdout.write(
        `${JSON.stringify({
          id: 2,
          result: {
            rateLimits: {
              primary: {
                usedPercent: 12,
                windowDurationMins: 300,
                resetsAt: 1770859735,
              },
              secondary: null,
            },
          },
        })}\n`,
      );
    }
  });

  const actual = await fetchCodexRateLimits({
    spawnFn,
    timeoutMs: 100,
    version: "9.9.9",
  });

  assert.equal(actual.sevenDay, null);
});

test("fetchCodexRateLimits parses the final response line without a trailing newline", async () => {
  const { child, spawnFn } = createSpawnMock(({ child: spawnedChild, request }) => {
    if (request.id === 1) {
      spawnedChild.stdout.write(
        `${JSON.stringify({ id: 1, result: { userAgent: "cxreset/test" } })}\n`,
      );
      return;
    }

    if (request.id === 2) {
      spawnedChild.stdout.end(
        JSON.stringify({
          id: 2,
          result: {
            rateLimits: {
              primary: {
                usedPercent: 12,
                windowDurationMins: 300,
                resetsAt: 1770859735,
              },
              secondary: {
                usedPercent: 10,
                windowDurationMins: 10080,
                resetsAt: 1771311795,
              },
            },
          },
        }),
      );
      spawnedChild.emit("close", 0);
    }
  });

  const actual = await fetchCodexRateLimits({
    spawnFn,
    timeoutMs: 100,
    version: "9.9.9",
  });

  assert.deepEqual(actual, {
    fiveHour: {
      usedPercent: 12,
      windowDurationMins: 300,
      resetsAt: 1770859735,
    },
    sevenDay: {
      usedPercent: 10,
      windowDurationMins: 10080,
      resetsAt: 1771311795,
    },
  });
  assert.equal(child.killedSignals.at(-1), "SIGTERM");
});

test("fetchCodexRateLimits rejects initialize errors", async () => {
  const { child, spawnFn } = createSpawnMock(({ child: spawnedChild, request }) => {
    if (request.id === 1) {
      spawnedChild.stdout.write(
        `${JSON.stringify({
          id: 1,
          error: { code: -32000, message: "Not authenticated" },
        })}\n`,
      );
    }
  });

  await assert.rejects(
    fetchCodexRateLimits({
      spawnFn,
      timeoutMs: 100,
      version: "9.9.9",
    }),
    /initialize failed: Not authenticated/,
  );

  assert.equal(child.killedSignals.at(-1), "SIGTERM");
});

test("fetchCodexRateLimits rejects on timeout and kills the child", async () => {
  const { child, spawnFn } = createSpawnMock();

  await assert.rejects(
    fetchCodexRateLimits({
      spawnFn,
      timeoutMs: 10,
      version: "9.9.9",
    }),
    /timeout/,
  );

  assert.equal(child.killedSignals.at(-1), "SIGKILL");
});
