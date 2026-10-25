import assert from "node:assert/strict";
import { test } from "node:test";
import { dateKey, formatDate, isValidLocalDateTime, localDateTimeToIso, shiftDateKey, toDateTimeLocal } from "../lib/time";

test("Manila local time converts to UTC (UTC+8, no daylight saving)", () => {
  assert.equal(localDateTimeToIso("2026-10-24T09:00", "Asia/Manila"), "2026-10-24T01:00:00.000Z");
  assert.equal(localDateTimeToIso("2026-01-01T00:00", "Asia/Manila"), "2025-12-31T16:00:00.000Z");
});

test("local time round-trips through UTC", () => {
  for (const zone of ["Asia/Manila", "Asia/Singapore", "UTC", "America/Los_Angeles", "Australia/Sydney"]) {
    const iso = localDateTimeToIso("2026-07-15T13:45", zone);
    assert.equal(toDateTimeLocal(iso, zone), "2026-07-15T13:45", zone);
  }
});

test("daylight saving changes use the right offset", () => {
  assert.equal(localDateTimeToIso("2026-03-08T01:30", "America/New_York"), "2026-03-08T06:30:00.000Z"); // still EST (UTC-5)
  assert.equal(localDateTimeToIso("2026-03-08T03:30", "America/New_York"), "2026-03-08T07:30:00.000Z"); // EDT (UTC-4)
});

test("skipped and repeated daylight-saving times still give a valid instant", () => {
  assert.ok(!Number.isNaN(Date.parse(localDateTimeToIso("2026-03-08T02:30", "America/New_York"))));
  assert.ok(!Number.isNaN(Date.parse(localDateTimeToIso("2026-11-01T01:30", "America/New_York"))));
});

test("invalid local date-times are rejected", () => {
  for (const bad of ["2026-02-30T10:00", "2026-13-01T00:00", "2026-10-24T24:00", "2026-10-24T10:60", "2026-10-24", "", "not a date"]) {
    assert.equal(isValidLocalDateTime(bad), false, bad);
    assert.throws(() => localDateTimeToIso(bad, "Asia/Manila"), bad);
  }
  assert.equal(isValidLocalDateTime("2028-02-29T23:59"), true);
});

test("dateKey uses the business time zone, not UTC", () => {
  assert.equal(dateKey("2026-10-24T17:30:00Z", "Asia/Manila"), "2026-10-25");
  assert.equal(dateKey("2026-10-24T17:30:00Z", "UTC"), "2026-10-24");
});

test("shiftDateKey crosses month, year, and leap days", () => {
  assert.equal(shiftDateKey("2026-10-31", 1), "2026-11-01");
  assert.equal(shiftDateKey("2026-01-01", -1), "2025-12-31");
  assert.equal(shiftDateKey("2028-02-28", 1), "2028-02-29");
  assert.equal(shiftDateKey("2026-10-24", 14), "2026-11-07");
});

test("formatDate keeps date-only values on the same calendar day", () => {
  assert.match(formatDate("2026-10-24", "Asia/Manila"), /Oct 24, 2026/);
  assert.match(formatDate("2026-10-24", "America/Los_Angeles"), /Oct 24, 2026/);
});
