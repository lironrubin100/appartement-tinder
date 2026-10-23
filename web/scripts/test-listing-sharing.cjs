const test = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
function load(file) {
  const module = { exports: {} };
  const code = ts.transpileModule(fs.readFileSync(file, "utf8"), {
    compilerOptions: { module: ts.ModuleKind.CommonJS },
  }).outputText;
  new Function("require", "module", "exports", code)(
    require,
    module,
    module.exports,
  );
  return module.exports;
}
test("public preview strips unknown private data and uses native localized detail paths", () => {
  const { listingPreview, publicListingPath } = load(
    "src/lib/listings/preview.ts",
  );
  const row = {
    id: "016a705d-1763-4dbd-bf20-a7efe5278549",
    title: "Public",
    photos: ["one", "two"],
    min_room_price: 2100,
    max_room_price: 2600,
    available_room_count: 2,
    bedrooms: 2,
    available_from: null,
    bills_included: true,
    is_sublet: false,
    public_location_label: "Approximate area",
    address: "PRIVATE",
    lat: 31,
    lng: 34,
    lister_id: "PRIVATE",
    revision: 8,
  };
  const p = listingPreview(row);
  assert(!JSON.stringify(p).includes("PRIVATE"));
  assert.deepEqual(p.photos, ["one"]);
  assert.equal(p.available_from, null);
  assert.equal(publicListingPath(row.id, "en"), `/en/listings/${row.id}`);
  assert.equal(publicListingPath(row.id, "he"), `/listings/${row.id}`);
});
test("only explicit UUID listing references render as cards; catalog return remains internal", () => {
  const { sharedListingId } = load("src/lib/chat/message-types.ts"),
    { safeReturnTo } = load("src/utils/navigation.ts");
  const id = "016a705d-1763-4dbd-bf20-a7efe5278549";
  assert.equal(sharedListingId({ kind: "listing", listing_id: id }), id);
  for (const m of [
    { kind: "user", listing_id: id },
    { kind: "listing", listing_id: "https://evil.test" },
    { kind: "listing", listing_id: null },
  ])
    assert.equal(sharedListingId(m), null);
  assert.equal(safeReturnTo("/en/listings?page=2"), "/en/listings?page=2");
  assert.equal(safeReturnTo("//evil.test/listings"), "/");
  assert.equal(safeReturnTo("/listings/private/else"), "/");
});
