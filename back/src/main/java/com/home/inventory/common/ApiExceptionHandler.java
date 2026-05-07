package com.home.inventory.common;

import com.home.inventory.item.InventoryItemNotFoundException;
import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

@RestControllerAdvice
public class ApiExceptionHandler {

	@ExceptionHandler(InventoryItemNotFoundException.class)
	public ResponseEntity<ErrorResponse> handleNotFound(InventoryItemNotFoundException exception) {
		HttpStatus status = HttpStatus.NOT_FOUND;
		return ResponseEntity.status(status)
				.body(ErrorResponse.of(status.value(), status.getReasonPhrase(), exception.getMessage()));
	}

	@ExceptionHandler(MethodArgumentNotValidException.class)
	public ResponseEntity<ErrorResponse> handleValidation(MethodArgumentNotValidException exception) {
		Map<String, String> fieldErrors = new LinkedHashMap<>();
		exception.getBindingResult().getFieldErrors().forEach(error ->
				fieldErrors.putIfAbsent(error.getField(), error.getDefaultMessage()));

		HttpStatus status = HttpStatus.BAD_REQUEST;
		return ResponseEntity.badRequest()
				.body(ErrorResponse.validation(
						status.value(),
						status.getReasonPhrase(),
						"입력값을 확인해 주세요.",
						fieldErrors
				));
	}
}
