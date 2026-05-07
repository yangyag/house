package com.home.inventory.item;

import java.time.Instant;
import java.time.LocalDate;

public record InventoryItemResponse(
		Long id,
		String name,
		int quantity,
		String location,
		String note,
		LocalDate purchasedAt,
		Instant createdAt,
		Instant updatedAt
) {
	static InventoryItemResponse from(InventoryItem item) {
		return new InventoryItemResponse(
				item.getId(),
				item.getName(),
				item.getQuantity(),
				item.getLocation(),
				item.getNote(),
				item.getPurchasedAt(),
				item.getCreatedAt(),
				item.getUpdatedAt()
		);
	}
}
