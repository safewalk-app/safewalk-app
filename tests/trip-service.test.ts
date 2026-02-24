// Tests: trip-service.ts
// Purpose: Test trip management functions

import { describe, it, expect, beforeEach, vi } from "vitest";
import * as tripService from "@/lib/services/trip-service";

// Mock supabase
vi.mock("@/lib/supabase", () => ({
  supabase: {
    functions: {
      invoke: vi.fn(),
    },
  },
}));

vi.mock("@/lib/logger", () => ({
  logger: {
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  },
}));

import { supabase } from "@/lib/supabase";

describe("trip-service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("startTrip", () => {
    it("should start a trip successfully", async () => {
      const mockResponse = {
        success: true,
        tripId: "trip-123",
        status: "active",
        deadline: new Date(Date.now() + 3600000).toISOString(),
        message: "Trip started successfully",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.startTrip({
        deadlineISO: new Date(Date.now() + 3600000).toISOString(),
        shareLocation: true,
      });

      expect(result.success).toBe(true);
      expect(result.tripId).toBe("trip-123");
      expect(result.status).toBe("active");
    });

    it("should handle start trip error", async () => {
      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: null,
        error: new Error("Network error"),
      });

      const result = await tripService.startTrip({
        deadlineISO: new Date(Date.now() + 3600000).toISOString(),
        shareLocation: true,
      });

      expect(result.success).toBe(false);
      expect(result.errorCode).toBe("FUNCTION_ERROR");
    });
  });

  describe("checkin", () => {
    it("should check in successfully", async () => {
      const mockResponse = {
        success: true,
        tripId: "trip-123",
        status: "checked_in",
        message: "Checked in successfully",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.checkin({ tripId: "trip-123" });

      expect(result.success).toBe(true);
      expect(result.status).toBe("checked_in");
    });
  });

  describe("extendTrip", () => {
    it("should extend trip deadline", async () => {
      const mockResponse = {
        success: true,
        tripId: "trip-123",
        newDeadline: new Date(Date.now() + 7200000).toISOString(),
        message: "Trip extended by 60 minutes",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.extendTrip({
        tripId: "trip-123",
        addMinutes: 60,
      });

      expect(result.success).toBe(true);
      expect(result.tripId).toBe("trip-123");
    });

    it("should reject extension > 24 hours", async () => {
      const mockResponse = {
        success: false,
        error: "Cannot extend more than 24 hours",
        errorCode: "EXTENSION_TOO_LONG",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.extendTrip({
        tripId: "trip-123",
        addMinutes: 1500, // > 24 hours
      });

      expect(result.success).toBe(false);
    });
  });

  describe("pingLocation", () => {
    it("should update location successfully", async () => {
      const mockResponse = {
        success: true,
        tripId: "trip-123",
        message: "Location updated successfully",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.pingLocation({
        tripId: "trip-123",
        lat: 48.8566,
        lng: 2.3522,
      });

      expect(result.success).toBe(true);
    });

    it("should reject invalid coordinates", async () => {
      const mockResponse = {
        success: false,
        error: "Invalid coordinate range",
        errorCode: "INVALID_COORDINATES",
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.pingLocation({
        tripId: "trip-123",
        lat: 100, // Invalid latitude
        lng: 2.3522,
      });

      expect(result.success).toBe(false);
    });
  });

  describe("sendTestSms", () => {
    it("should send test SMS successfully", async () => {
      const mockResponse = {
        success: true,
        message: "Test SMS sent successfully",
        smsSent: true,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.sendTestSms();

      expect(result.success).toBe(true);
      expect(result.smsSent).toBe(true);
    });

    it("should handle no credits for test SMS", async () => {
      const mockResponse = {
        success: false,
        error: "no_test_credit",
        errorCode: "no_test_credit",
        smsSent: false,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.sendTestSms();

      expect(result.success).toBe(false);
      expect(result.smsSent).toBe(false);
    });
  });

  describe("triggerSos", () => {
    it("should trigger SOS alert successfully", async () => {
      const mockResponse = {
        success: true,
        message: "SOS alert sent successfully",
        smsSent: true,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.triggerSos({ tripId: "trip-123" });

      expect(result.success).toBe(true);
      expect(result.smsSent).toBe(true);
    });

    it("should handle SOS quota exceeded", async () => {
      const mockResponse = {
        success: false,
        error: "quota_reached",
        errorCode: "quota_reached",
        smsSent: false,
      };

      vi.mocked(supabase.functions.invoke).mockResolvedValueOnce({
        data: mockResponse,
        error: null,
      });

      const result = await tripService.triggerSos({ tripId: "trip-123" });

      expect(result.success).toBe(false);
      expect(result.smsSent).toBe(false);
    });
  });
});
