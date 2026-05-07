package com.home.inventory.item;

import java.util.List;
import org.springframework.data.domain.Sort;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.StringUtils;

@Service
@Transactional(readOnly = true)
public class InventoryItemService {

	private static final Sort DEFAULT_SORT = Sort.by(
			Sort.Order.asc("name").ignoreCase(),
			Sort.Order.asc("location").ignoreCase()
	);

	private final InventoryItemRepository repository;

	public InventoryItemService(InventoryItemRepository repository) {
		this.repository = repository;
	}

	public List<InventoryItemResponse> findAll(String query) {
		List<InventoryItem> items = StringUtils.hasText(query)
				? repository.search(query.trim())
				: repository.findAll(DEFAULT_SORT);

		return items.stream()
				.map(InventoryItemResponse::from)
				.toList();
	}

	public InventoryItemResponse findById(Long id) {
		return InventoryItemResponse.from(findItem(id));
	}

	@Transactional
	public InventoryItemResponse create(InventoryItemRequest request) {
		InventoryItem item = new InventoryItem(
				request.name().trim(),
				request.quantity(),
				trimToNull(request.location()),
				trimToNull(request.note()),
				request.purchasedAt()
		);
		return InventoryItemResponse.from(repository.save(item));
	}

	@Transactional
	public InventoryItemResponse update(Long id, InventoryItemRequest request) {
		InventoryItem item = findItem(id);
		item.update(
				request.name().trim(),
				request.quantity(),
				trimToNull(request.location()),
				trimToNull(request.note()),
				request.purchasedAt()
		);
		return InventoryItemResponse.from(item);
	}

	@Transactional
	public void delete(Long id) {
		if (!repository.existsById(id)) {
			throw new InventoryItemNotFoundException(id);
		}
		repository.deleteById(id);
	}

	private InventoryItem findItem(Long id) {
		return repository.findById(id)
				.orElseThrow(() -> new InventoryItemNotFoundException(id));
	}

	private String trimToNull(String value) {
		if (!StringUtils.hasText(value)) {
			return null;
		}
		return value.trim();
	}
}
