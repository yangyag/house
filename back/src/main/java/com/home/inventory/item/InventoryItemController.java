package com.home.inventory.item;

import jakarta.validation.Valid;
import java.net.URI;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/items")
public class InventoryItemController {

	private final InventoryItemService service;

	public InventoryItemController(InventoryItemService service) {
		this.service = service;
	}

	@GetMapping
	public List<InventoryItemResponse> findAll(@RequestParam(name = "q", required = false) String query) {
		return service.findAll(query);
	}

	@GetMapping("/{id}")
	public InventoryItemResponse findById(@PathVariable Long id) {
		return service.findById(id);
	}

	@PostMapping
	public ResponseEntity<InventoryItemResponse> create(@Valid @RequestBody InventoryItemRequest request) {
		InventoryItemResponse response = service.create(request);
		return ResponseEntity.created(URI.create("/api/items/" + response.id())).body(response);
	}

	@PutMapping("/{id}")
	public InventoryItemResponse update(@PathVariable Long id, @Valid @RequestBody InventoryItemRequest request) {
		return service.update(id, request);
	}

	@DeleteMapping("/{id}")
	public ResponseEntity<Void> delete(@PathVariable Long id) {
		service.delete(id);
		return ResponseEntity.noContent().build();
	}
}
