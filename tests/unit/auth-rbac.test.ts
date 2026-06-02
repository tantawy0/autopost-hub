import assert from "node:assert/strict";
import { describe, test } from "node:test";

import {
  AuthError,
  AuthorizationError,
  AuthorizationErrorCode,
  OwnershipError,
  assertOwner,
  getBearerUser,
  toSafeError,
} from "../../lib/auth";
import {
  assertCronSecret,
  assertRlsCompatibleUserScope,
  isPermissionAllowed,
} from "../../lib/server/authorization";
import { createFakeSupabase } from "./helpers/fake-supabase";

describe("auth and RBAC denial handling", () => {
  test("rejects missing bearer auth before resolving a user", async () => {
    const client = createFakeSupabase();

    await assert.rejects(() => getBearerUser(client as never, null), AuthError);
  });

  test("resolves bearer auth with only the token value passed to Supabase", async () => {
    const client = createFakeSupabase();
    const user = await getBearerUser(client as never, "Bearer valid-token");

    assert.equal(user.id, "user-1");
  });

  test("maps denied auth, ownership, and role errors to stable response shapes", () => {
    assert.deepEqual(toSafeError(new AuthError()), {
      status: 401,
      message: "Authentication required.",
      code: "auth_required",
    });

    assert.deepEqual(toSafeError(new OwnershipError()), {
      status: 403,
      message: "You do not have access to this resource.",
      code: "forbidden",
    });

    assert.deepEqual(
      toSafeError(
        new AuthorizationError(
          AuthorizationErrorCode.INSUFFICIENT_ROLE,
          "You do not have permission to perform this action.",
          403,
        ),
      ),
      {
        status: 403,
        message: "You do not have permission to perform this action.",
        code: "insufficient_role",
      },
    );

    assert.deepEqual(toSafeError(new Error("database connection detail")), {
      status: 500,
      message: "Internal server error.",
      code: "server_error",
    });
  });

  test("denies cross-user resource access and viewer publish permissions", () => {
    assert.doesNotThrow(() => assertOwner("user-1", "user-1"));
    assert.throws(() => assertOwner("user-2", "user-1"), OwnershipError);
    assert.throws(() => assertRlsCompatibleUserScope("user-1", "user-2"), OwnershipError);

    assert.equal(isPermissionAllowed("publish", "Viewer"), false);
    assert.equal(isPermissionAllowed("content_edit", "Viewer"), false);
    assert.equal(isPermissionAllowed("analytics", "Analyst"), true);
    assert.equal(isPermissionAllowed("publish", "Editor"), true);
    assert.equal(isPermissionAllowed("channel_manage", "Editor"), false);
  });

  test("requires the cron secret for worker and scheduler entry points", () => {
    const previousSecret = process.env.CRON_SECRET;
    process.env.CRON_SECRET = "cron-secret";

    try {
      assert.throws(
        () => assertCronSecret({ headers: new Headers() } as never),
        (error: unknown) =>
          error instanceof AuthorizationError &&
          error.code === AuthorizationErrorCode.CRON_UNAUTHORIZED &&
          error.status === 401,
      );

      assert.doesNotThrow(() =>
        assertCronSecret({ headers: new Headers({ authorization: "Bearer cron-secret" }) } as never),
      );
    } finally {
      if (previousSecret === undefined) {
        delete process.env.CRON_SECRET;
      } else {
        process.env.CRON_SECRET = previousSecret;
      }
    }
  });
});
