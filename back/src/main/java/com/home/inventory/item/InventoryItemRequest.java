package com.home.inventory.item;

import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;

public record InventoryItemRequest(
		@NotBlank(message = "이름은 필수입니다.")
		@Size(max = 120, message = "이름은 120자 이하로 입력해 주세요.")
		String name,

		@NotNull(message = "수량은 필수입니다.")
		@Min(value = 0, message = "수량은 0개 이상이어야 합니다.")
		Integer quantity,

		@Size(max = 120, message = "위치는 120자 이하로 입력해 주세요.")
		String location,

		@Size(max = 1000, message = "비고는 1000자 이하로 입력해 주세요.")
		String note,

		LocalDate purchasedAt
) {
}
