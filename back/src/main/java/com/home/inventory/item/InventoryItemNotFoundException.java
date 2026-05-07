package com.home.inventory.item;

public class InventoryItemNotFoundException extends RuntimeException {

	public InventoryItemNotFoundException(Long id) {
		super("재고 항목을 찾을 수 없습니다. id=" + id);
	}
}
