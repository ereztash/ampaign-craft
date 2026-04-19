import { describe, it, expect } from "vitest";
import { BUSINESS_INFO } from "../businessInfo";

describe("businessInfo", () => {
  describe("BUSINESS_INFO", () => {
    it("has brandName as string", () => {
      expect(typeof BUSINESS_INFO.brandName).toBe("string");
      expect(BUSINESS_INFO.brandName.length).toBeGreaterThan(0);
    });

    it("has vatId as non-empty string", () => {
      expect(typeof BUSINESS_INFO.vatId).toBe("string");
      expect(BUSINESS_INFO.vatId.length).toBeGreaterThan(0);
    });

    it("has vatIdLabel in he and en", () => {
      expect(typeof BUSINESS_INFO.vatIdLabel.he).toBe("string");
      expect(typeof BUSINESS_INFO.vatIdLabel.en).toBe("string");
    });

    it("has legalName in he and en", () => {
      expect(typeof BUSINESS_INFO.legalName.he).toBe("string");
      expect(typeof BUSINESS_INFO.legalName.en).toBe("string");
    });

    it("has address with street, city, country, full in he and en", () => {
      const { address } = BUSINESS_INFO;
      expect(typeof address.street.he).toBe("string");
      expect(typeof address.street.en).toBe("string");
      expect(typeof address.city.he).toBe("string");
      expect(typeof address.city.en).toBe("string");
      expect(typeof address.country.he).toBe("string");
      expect(typeof address.country.en).toBe("string");
      expect(typeof address.full.he).toBe("string");
      expect(typeof address.full.en).toBe("string");
    });

    it("has phone.display and phone.tel", () => {
      expect(typeof BUSINESS_INFO.phone.display).toBe("string");
      expect(typeof BUSINESS_INFO.phone.tel).toBe("string");
    });

    it("phone.tel starts with + (international format)", () => {
      expect(BUSINESS_INFO.phone.tel.startsWith("+")).toBe(true);
    });

    it("has email as non-empty string", () => {
      expect(typeof BUSINESS_INFO.email).toBe("string");
      expect(BUSINESS_INFO.email).toContain("@");
    });

    it("has hours in he and en", () => {
      expect(typeof BUSINESS_INFO.hours.he).toBe("string");
      expect(typeof BUSINESS_INFO.hours.en).toBe("string");
    });

    it("has responseSla in he and en", () => {
      expect(typeof BUSINESS_INFO.responseSla.he).toBe("string");
      expect(typeof BUSINESS_INFO.responseSla.en).toBe("string");
    });
  });
});
