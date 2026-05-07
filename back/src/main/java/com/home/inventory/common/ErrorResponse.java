package com.home.inventory.common;

import java.time.Instant;
import java.util.Map;

public record ErrorResponse(
		Instant timestamp,
		int status,
		String error,
		String message,
		Map<String, String> fieldErrors
) {
	public static ErrorResponse of(int status, String error, String message) {
		return new ErrorResponse(Instant.now(), status, error, message, Map.of());
	}

	public static ErrorResponse validation(int status, String error, String message, Map<String, String> fieldErrors) {
		return new ErrorResponse(Instant.now(), status, error, message, fieldErrors);
	}
}
