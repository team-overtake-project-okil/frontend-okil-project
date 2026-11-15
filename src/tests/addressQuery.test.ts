import { describe, expect, it } from "vitest";
import {
  addressKey,
  normalize,
  parseAddressQuery,
} from "../services/addressQuery";
import { normalizeHouseNumber } from "../services/addressValidation";

describe("address matching", () => {
  it.each(["В'ячеслава", "В’ячеслава", "Вʼячеслава", "В`ячеслава"])(
    "normalizes apostrophes in %s",
    (name) => {
      expect(normalize(`  ${name}, ЧОРНОВОЛА! `)).toBe("вячеслава чорновола");
    },
  );

  it("normalizes compatibility characters and empty queries", () => {
    expect(normalize("１２-А")).toBe("12 а");
    expect(normalize(" , ")).toBe("");
    expect(parseAddressQuery(" ")).toEqual({
      street: "",
      houseNumber: undefined,
      terms: [],
      wantedType: undefined,
    });
  });

  it("extracts the house and street type while excluding the city from search terms", () => {
    expect(
      parseAddressQuery("Львів, просп. В’ячеслава Чорновола, 12-А"),
    ).toEqual({
      street: "Львів, просп. В’ячеслава Чорновола",
      houseNumber: "12-А",
      terms: ["вячеслава", "чорновола"],
      wantedType: "проспект",
    });
  });

  it("keeps digits that belong to a street name", () => {
    expect(parseAddressQuery("вулиця 8 Березня")).toMatchObject({
      houseNumber: undefined,
      terms: ["8", "березня"],
      wantedType: "вулиця",
    });
  });

  it.each([
    [" １２ - А ", "12а"],
    ["12/1", "12/1"],
    ["12-14", "12-14"],
  ])(
    "normalizes house %s without losing numeric separators",
    (value, expected) => {
      expect(normalizeHouseNumber(value)).toBe(expected);
    },
  );

  it("matches equivalent provider spellings but distinguishes street types and houses", () => {
    const key = addressKey({
      street: "вулиця Тараса Шевченка",
      houseNumber: "12-А",
    });
    expect(addressKey({ street: "Шевченка вулиця", houseNumber: "12а" })).toBe(
      key,
    );
    expect(
      addressKey({ street: "проспект Шевченка", houseNumber: "12а" }),
    ).not.toBe(key);
    expect(addressKey({ street: "вул. Шевченка", houseNumber: "12" })).not.toBe(
      key,
    );
    expect(addressKey({ street: "вул. Шевченка" })).toBe(
      "вул тараса шевченка|",
    );
  });
});
