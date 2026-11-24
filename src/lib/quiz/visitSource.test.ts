import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { sourceFrom } from "./visitSource.ts";

describe("where a visitor came from", () => {
  it("reads shared-link tags first", () => {
    assert.equal(sourceFrom("?ref=share", "https://l.facebook.com/"), "share");
    assert.equal(sourceFrom("?utm_source=WhatsApp-Status", ""), "whatsapp-status");
  });
  it("names the big apps and search engines", () => {
    assert.equal(sourceFrom("", "https://l.facebook.com/l.php?u=x"), "facebook");
    assert.equal(sourceFrom("", "https://www.google.com.ng/"), "google");
    assert.equal(sourceFrom("", "https://t.co/abc"), "x");
    assert.equal(sourceFrom("", "https://www.instagram.com/"), "instagram");
    assert.equal(sourceFrom("", "https://promisevisuals.com/apps"), "promisevisuals");
  });
  it("calls no referrer or our own pages direct, and keeps unknown sites by name", () => {
    assert.equal(sourceFrom("", ""), "direct");
    assert.equal(sourceFrom("", "https://quizy.promisevisuals.com/x", "quizy.promisevisuals.com"), "direct");
    assert.equal(sourceFrom("", "https://www.nairaland.com/topic"), "nairaland.com");
  });
});
