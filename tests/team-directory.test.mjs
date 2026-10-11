import test from "node:test";
import assert from "node:assert/strict";
import { mergeTeamDirectory } from "../services/team-directory.ts";

test("historical profiles cannot collide with live member IDs or duplicate live emails", () => {
  const current = [
    { id: 1, firstName: "Current", user: { email: "current@example.com" } },
  ];
  const history = [
    { id: 1, firstName: "Previous", user: { email: "previous@example.com" } },
    { id: 2, firstName: "Old current", user: { email: "CURRENT@example.com" } },
  ];
  const result = mergeTeamDirectory(current, history);
  assert.deepEqual(
    result.map((member) => member.id),
    [1, -1],
  );
  assert.equal(result[0], current[0]);
  assert.equal(history[0].id, 1);
  assert.deepEqual(
    mergeTeamDirectory(current, history, " PREVIOUS ").map(
      (member) => member.id,
    ),
    [-1],
  );
  assert.deepEqual(mergeTeamDirectory([], [], "missing"), []);
});
