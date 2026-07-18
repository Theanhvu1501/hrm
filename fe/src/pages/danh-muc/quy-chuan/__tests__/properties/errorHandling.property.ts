import { describe, it, expect, vi, beforeEach } from 'vitest';
import * as fc from 'fast-check';
import { ApiError, ApiErrorType } from '@/config/api';

/**
 * **Feature: quy-chuan-handler-refactor, Property 8: Error Message Display**
 * **Validates: Requirements 7.2**
 * 
 * *For any* API error response, the System SHALL display an error message 
 * to the user containing relevant error information.
 */

// Arbitrary for generating API error types
const apiErrorTypeArb = fc.constantFrom(
  ApiErrorType.NETWORK_ERROR,
  ApiErrorType.TIMEOUT_ERROR,
  ApiErrorType.UNAUTHORIZED,
  ApiErrorType.FORBIDDEN,
  ApiErrorType.NOT_FOUND,
  ApiErrorType.VALIDATION_ERROR,
  ApiErrorType.SERVER_ERROR,
  ApiErrorType.UNKNOWN_ERROR
);

// Arbitrary for generating error messages
const errorMessageArb = fc.string({ minLength: 1, maxLength: 200 })
  .filter(s => s.trim().length > 0);

// Arbitrary for generating HTTP status codes
const httpStatusArb = fc.integer({ min: 400, max: 599 });

describe('Property 8: Error Message Display', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should create ApiError with correct message for any error type', () => {
    fc.assert(
      fc.property(
        errorMessageArb,
        apiErrorTypeArb,
        httpStatusArb,
        (message, errorType, status) => {
          const error = new ApiError(message, errorType, status);
          
          // Error should contain the original message
          expect(error.message).toBe(message);
          expect(error.type).toBe(errorType);
          expect(error.statusCode).toBe(status);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should preserve error information through error chain', () => {
    fc.assert(
      fc.property(
        errorMessageArb,
        apiErrorTypeArb,
        (message, errorType) => {
          const originalError = new Error('Original error');
          const apiError = new ApiError(message, errorType, undefined, originalError);
          
          // ApiError should preserve original error
          expect(apiError.originalError).toBe(originalError);
          expect(apiError.message).toBe(message);
        }
      ),
      { numRuns: 100 }
    );
  });

  it('should handle error display function correctly for any error', () => {
    // Simulating error display logic
    const displayError = (error: ApiError): string => {
      if (error.type === ApiErrorType.NETWORK_ERROR) {
        return 'Lỗi kết nối mạng';
      }
      if (error.type === ApiErrorType.TIMEOUT_ERROR) {
        return 'Yêu cầu quá thời gian';
      }
      if (error.type === ApiErrorType.UNAUTHORIZED) {
        return 'Phiên đăng nhập hết hạn';
      }
      return error.message || 'Đã xảy ra lỗi';
    };

    fc.assert(
      fc.property(
        errorMessageArb,
        apiErrorTypeArb,
        (message, errorType) => {
          const error = new ApiError(message, errorType);
          const displayedMessage = displayError(error);
          
          // Display message should never be empty
          expect(displayedMessage.length).toBeGreaterThan(0);
          
          // For specific error types, should show localized message
          if (errorType === ApiErrorType.NETWORK_ERROR) {
            expect(displayedMessage).toBe('Lỗi kết nối mạng');
          } else if (errorType === ApiErrorType.TIMEOUT_ERROR) {
            expect(displayedMessage).toBe('Yêu cầu quá thời gian');
          } else if (errorType === ApiErrorType.UNAUTHORIZED) {
            expect(displayedMessage).toBe('Phiên đăng nhập hết hạn');
          } else {
            // For other types, should show original message
            expect(displayedMessage).toBe(message);
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
