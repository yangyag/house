package com.home.inventory.item;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.PrePersist;
import jakarta.persistence.PreUpdate;
import jakarta.persistence.Table;
import java.time.Instant;
import java.time.LocalDate;

@Entity
@Table(name = "inventory_items")
public class InventoryItem {

	@Id
	@GeneratedValue(strategy = GenerationType.IDENTITY)
	private Long id;

	@Column(nullable = false, length = 120)
	private String name;

	@Column(nullable = false)
	private int quantity;

	@Column(length = 120)
	private String location;

	@Column(length = 1000)
	private String note;

	private LocalDate purchasedAt;

	@Column(nullable = false, updatable = false)
	private Instant createdAt;

	@Column(nullable = false)
	private Instant updatedAt;

	protected InventoryItem() {
	}

	public InventoryItem(String name, int quantity, String location, String note, LocalDate purchasedAt) {
		this.name = name;
		this.quantity = quantity;
		this.location = location;
		this.note = note;
		this.purchasedAt = purchasedAt;
	}

	@PrePersist
	void onCreate() {
		Instant now = Instant.now();
		this.createdAt = now;
		this.updatedAt = now;
	}

	@PreUpdate
	void onUpdate() {
		this.updatedAt = Instant.now();
	}

	public void update(String name, int quantity, String location, String note, LocalDate purchasedAt) {
		this.name = name;
		this.quantity = quantity;
		this.location = location;
		this.note = note;
		this.purchasedAt = purchasedAt;
		this.updatedAt = Instant.now();
	}

	public Long getId() {
		return id;
	}

	public String getName() {
		return name;
	}

	public int getQuantity() {
		return quantity;
	}

	public String getLocation() {
		return location;
	}

	public String getNote() {
		return note;
	}

	public LocalDate getPurchasedAt() {
		return purchasedAt;
	}

	public Instant getCreatedAt() {
		return createdAt;
	}

	public Instant getUpdatedAt() {
		return updatedAt;
	}
}
