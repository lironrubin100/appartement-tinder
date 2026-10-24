const { test } = require("node:test"),
  assert = require("node:assert/strict"),
  fs = require("node:fs"),
  ts = require("typescript");
const m = { exports: {} };
new Function(
  "module",
  "exports",
  ts.transpileModule(
    fs.readFileSync("src/lib/listings/edit-draft-fields.ts", "utf8"),
    {
      compilerOptions: {
        module: ts.ModuleKind.CommonJS,
        target: ts.ScriptTarget.ES2022,
      },
    },
  ).outputText,
)(m, m.exports);
const { editDraftFields } = m.exports;
test("edit snapshot keeps exact original IDs/order/flags while preserving incomplete prices, labels and room dates", () => {
  const rooms = [
      {
        id: "a",
        label: null,
        monthlyPrice: "2100",
        availableFrom: "2026-12-01",
        isAvailable: true,
      },
      {
        id: "b",
        label: "Taken",
        monthlyPrice: "2600",
        availableFrom: "2026-12-03",
        isAvailable: false,
      },
    ],
    original = {
      rooms,
      isSublet: true,
      address: { address: "Private property" },
      roomPrices: ["old"],
    },
    copy = structuredClone(original);
  const input = {
    title: "Draft title",
    bedrooms: "2",
    availableFrom: "",
    billsIncluded: true,
    description: "Partial",
    address: { address: "Injected other property" },
  };
  const edited = editDraftFields(
    input,
    original,
    [
      {
        ...rooms[1],
        isAvailable: true,
        monthlyPrice: "",
        availableFrom: "incomplete",
      },
      {
        ...rooms[0],
        isAvailable: false,
        label: "Renamed",
        monthlyPrice: "2999",
      },
      { id: "foreign", monthlyPrice: "99" },
    ],
    false,
  );
  assert.deepEqual(edited.rooms, [
    { ...rooms[0], label: "Renamed", monthlyPrice: "2999" },
    { ...rooms[1], monthlyPrice: "", availableFrom: "incomplete" },
  ]);
  assert.equal(edited.isSublet, false);
  assert.equal(edited.availableFrom, "");
  assert(!("address" in edited));
  assert(!("roomPrices" in edited));
  assert.deepEqual(original, copy);
});
test("missing controls cannot silently remove a room and zero-room drafts do not invent inventory", () => {
  const room = {
      id: "stable",
      label: null,
      monthlyPrice: "1",
      availableFrom: "",
      isAvailable: false,
    },
    input = {
      title: "",
      bedrooms: "",
      availableFrom: "",
      billsIncluded: false,
      description: "",
    };
  assert.deepEqual(editDraftFields(input, { rooms: [room] }, [], true).rooms, [
    room,
  ]);
  assert.deepEqual(
    editDraftFields(input, { rooms: [] }, [{ ...room, id: "new" }], false)
      .rooms,
    [],
  );
});
