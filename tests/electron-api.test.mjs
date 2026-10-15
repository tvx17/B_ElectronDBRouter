import { test } from "node:test";
import assert from "node:assert/strict";
import { routeRequest } from "../src-electron/api-router.ts";

void test("GET dekodiert Pfad- und Queryparameter", async () => {
  const item = await routeRequest({ method: "GET", url: "/users/a%20b" });
  assert.equal(item.data.id, "a b");
  const list = await routeRequest({
    method: "GET",
    url: "/users?search=Max%20M"
  });
  assert.equal(list.data.search, "Max M");
});

void test("Schreibmethoden und DELETE liefern strukturierte Antworten", async () => {
  for (const method of ["POST", "PUT", "PATCH"]) {
    const response = await routeRequest({
      method,
      url: method === "POST" ? "/users" : "/users/42",
      data: { name: "Ada" }
    });
    assert.equal(response.status, method === "POST" ? 201 : 200);
    assert.equal(response.data.name, "Ada");
  }
  assert.deepEqual(await routeRequest({ method: "DELETE", url: "/users/42" }), {
    status: 200,
    data: { deleted: "42" }
  });
});

void test("ungültige Eingaben und unbekannte Routen", async () => {
  for (const input of [
    null,
    {},
    { method: "GET", url: "https://example.com" },
    { method: "GET", url: "/users/%ZZ" },
    { method: "POST", url: "/users", data: { name: 123 } },
    { method: "GET", url: "/users", data: NaN }
  ]) {
    assert.equal((await routeRequest(input)).status, 400);
  }
  assert.equal(
    (await routeRequest({ method: "GET", url: "/missing" })).status,
    404
  );
  assert.equal(
    (
      await routeRequest({
        method: "PUT",
        url: "/users",
        data: { name: "Ada" }
      })
    ).status,
    405
  );
});
