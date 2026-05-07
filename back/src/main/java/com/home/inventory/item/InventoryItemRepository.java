package com.home.inventory.item;

import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface InventoryItemRepository extends JpaRepository<InventoryItem, Long> {

	@Query("""
			select item
			from InventoryItem item
			where lower(item.name) like lower(concat('%', :query, '%'))
				or lower(coalesce(item.location, '')) like lower(concat('%', :query, '%'))
				or lower(coalesce(item.note, '')) like lower(concat('%', :query, '%'))
			order by lower(item.name), lower(coalesce(item.location, ''))
			""")
	List<InventoryItem> search(@Param("query") String query);
}
