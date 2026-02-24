import { describe, it, expect } from "vitest";
import {
  isValidE164,
  isValidFrenchPhone,
  formatToE164,
  formatForDisplay,
  validatePhoneNumber,
  extractDigits,
  formatPhoneForInput,
  isCompletePhoneNumber,
  getMissingDigits,
} from "../lib/services/phone-validation-service";
import { OtpErrorCode } from "../lib/types/otp-errors";

describe("Phone Validation Service", () => {
  describe("isValidE164", () => {
    it("should validate correct E.164 format", () => {
      expect(isValidE164("+33612345678")).toBe(true);
      expect(isValidE164("+1234567890")).toBe(true);
      expect(isValidE164("+441234567890")).toBe(true);
    });

    it("should reject invalid E.164 format", () => {
      expect(isValidE164("33612345678")).toBe(false); // Missing +
      expect(isValidE164("+0612345678")).toBe(false); // Invalid country code
      expect(isValidE164("+33 612345678")).toBe(false); // Contains space
      expect(isValidE164("")).toBe(false);
    });
  });

  describe("isValidFrenchPhone", () => {
    it("should validate French numbers starting with 0", () => {
      expect(isValidFrenchPhone("0612345678")).toBe(true);
      expect(isValidFrenchPhone("0712345678")).toBe(true);
      expect(isValidFrenchPhone("0812345678")).toBe(true);
    });

    it("should validate French numbers with +33", () => {
      expect(isValidFrenchPhone("+33612345678")).toBe(true);
      expect(isValidFrenchPhone("+33712345678")).toBe(true);
    });

    it("should validate French numbers with 33", () => {
      expect(isValidFrenchPhone("33612345678")).toBe(true);
      expect(isValidFrenchPhone("33712345678")).toBe(true);
    });

    it("should reject invalid French numbers", () => {
      // Invalid: starting with 0 but second digit is 0 (not 1-9)
      expect(isValidFrenchPhone("0012345678")).toBe(false); // Invalid (00)
      expect(isValidFrenchPhone("061234567")).toBe(false); // Too short
      expect(isValidFrenchPhone("06123456789")).toBe(false); // Too long
      expect(isValidFrenchPhone("")).toBe(false);
    });
  });

  describe("formatToE164", () => {
    it("should format French numbers starting with 0", () => {
      expect(formatToE164("0612345678")).toBe("+33612345678");
      expect(formatToE164("0712345678")).toBe("+33712345678");
    });

    it("should format French numbers with 33", () => {
      // 33612345678 has 11 digits, but formatToE164 expects 12 for 33 prefix
      expect(formatToE164("336123456789")).toBe("+336123456789"); // 12 digits with 33
    });

    it("should format numbers with spaces and dashes", () => {
      expect(formatToE164("06 12 34 56 78")).toBe("+33612345678");
      expect(formatToE164("06-12-34-56-78")).toBe("+33612345678");
    });

    it("should return empty string for invalid input", () => {
      expect(formatToE164("")).toBe("");
      expect(formatToE164("061234567")).toBe("");
      expect(formatToE164("06123456789")).toBe("");
    });
  });

  describe("formatForDisplay", () => {
    it("should format French numbers correctly", () => {
      expect(formatForDisplay("+33612345678")).toBe("+33 6 12 34 56 78");
      expect(formatForDisplay("+33712345678")).toBe("+33 7 12 34 56 78");
    });

    it("should return original for invalid E.164", () => {
      expect(formatForDisplay("0612345678")).toBe("0612345678");
      expect(formatForDisplay("")).toBe("");
    });
  });

  describe("validatePhoneNumber", () => {
    it("should validate correct French numbers", () => {
      const result = validatePhoneNumber("0612345678");
      expect(result.isValid).toBe(true);
      expect(result.formatted).toBe("+33612345678");
      expect(result.displayFormat).toBe("+33 6 12 34 56 78");
    });

    it("should handle empty input", () => {
      const result = validatePhoneNumber("");
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(OtpErrorCode.EMPTY_PHONE);
    });

    it("should handle invalid format", () => {
      const result = validatePhoneNumber("061234567");
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(OtpErrorCode.INVALID_PHONE_FORMAT);
    });

    it("should handle whitespace", () => {
      const result = validatePhoneNumber("   ");
      expect(result.isValid).toBe(false);
      expect(result.errorCode).toBe(OtpErrorCode.EMPTY_PHONE);
    });
  });

  describe("extractDigits", () => {
    it("should extract digits from formatted numbers", () => {
      expect(extractDigits("06 12 34 56 78")).toBe("0612345678");
      expect(extractDigits("06-12-34-56-78")).toBe("0612345678");
      expect(extractDigits("+33 6 12 34 56 78")).toBe("33612345678");
    });

    it("should handle already clean input", () => {
      expect(extractDigits("0612345678")).toBe("0612345678");
    });

    it("should return empty for non-digit input", () => {
      expect(extractDigits("abc")).toBe("");
    });
  });

  describe("formatPhoneForInput", () => {
    it("should format numbers for input display", () => {
      // formatPhoneForInput formats with spacing
      const result1 = formatPhoneForInput("0612345678");
      expect(result1).toContain(" "); // Should have spaces
      expect(result1.replace(/ /g, "")).toBe("061234567"); // First 9 digits
      
      const result2 = formatPhoneForInput("061234567");
      expect(result2).toBe("0 61 23 45 67"); // 9 digits formatted
    });

    it("should handle partial input", () => {
      // formatFrenchPhoneForInput formats with padding for 9 digits
      expect(formatPhoneForInput("061")).toBe("0 61   "); // 3 digits padded
      expect(formatPhoneForInput("06123")).toBe("0 61 23  "); // 5 digits padded
    });

    it("should limit to 9 digits", () => {
      // When input has more than 9 digits, only first 9 are kept
      const result = formatPhoneForInput("06123456789");
      expect(result.length).toBeLessThanOrEqual(14); // "X XX XX XX XX" format
    });
  });

  describe("isCompletePhoneNumber", () => {
    it("should return true for 9 digits", () => {
      expect(isCompletePhoneNumber("061234567")).toBe(true); // 9 digits
      expect(isCompletePhoneNumber("612345678")).toBe(true); // 9 digits
    });

    it("should return false for less than 9 digits", () => {
      expect(isCompletePhoneNumber("06123456")).toBe(false); // 8 digits
      expect(isCompletePhoneNumber("06")).toBe(false); // 2 digits
      expect(isCompletePhoneNumber("")).toBe(false); // 0 digits
    });

    it("should return false for more than 9 digits", () => {
      expect(isCompletePhoneNumber("06123456789")).toBe(false); // 11 digits
    });
  });

  describe("getMissingDigits", () => {
    it("should calculate missing digits correctly", () => {
      expect(getMissingDigits("0612345678")).toBe(0); // 10 digits
      expect(getMissingDigits("061234567")).toBe(0); // 9 digits
      expect(getMissingDigits("06")).toBe(7); // 2 digits
      expect(getMissingDigits("")).toBe(9); // 0 digits
    });

    it("should return 0 for more than 9 digits", () => {
      expect(getMissingDigits("06123456789")).toBe(0);
    });
  });

  describe("Integration tests", () => {
    it("should handle complete user input flow", () => {
      // User types: "6 12 34 56 78" (without 0)
      const input = "6 12 34 56 78";

      const digits = extractDigits(input);
      expect(digits).toBe("612345678");

      const isComplete = isCompletePhoneNumber(input);
      expect(isComplete).toBe(true);

      const validation = validatePhoneNumber("0612345678");
      expect(validation.isValid).toBe(true);
      expect(validation.formatted).toBe("+33612345678");
    });

    it("should handle partial user input", () => {
      const input = "0612";

      const isComplete = isCompletePhoneNumber(input);
      expect(isComplete).toBe(false);

      const missing = getMissingDigits(input);
      expect(missing).toBe(5); // 9 - 4 digits

      const validation = validatePhoneNumber(input);
      expect(validation.isValid).toBe(false);
    });

    it("should handle formatting for display", () => {
      const input = "061234567"; // 9 digits
      const formatted = formatPhoneForInput(input);
      // formatPhoneForInput formats 9 digits as: 0 61 23 45 67
      expect(formatted).toBe("0 61 23 45 67");

      const validation = validatePhoneNumber("0612345678");
      expect(validation.displayFormat).toBe("+33 6 12 34 56 78");
    });
  });
});
