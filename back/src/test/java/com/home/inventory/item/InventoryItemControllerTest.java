package com.home.inventory.item;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.delete;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.put;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import tools.jackson.databind.JsonNode;
import tools.jackson.databind.ObjectMapper;
import java.time.LocalDate;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.webmvc.test.autoconfigure.AutoConfigureMockMvc;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
class InventoryItemControllerTest {

	@Autowired
	MockMvc mockMvc;

	@Autowired
	ObjectMapper objectMapper;

	@Autowired
	InventoryItemRepository repository;

	@BeforeEach
	void setUp() {
		repository.deleteAll();
	}

	@Test
	void createSearchAndUpdateItem() throws Exception {
		MvcResult createResult = mockMvc.perform(post("/api/items")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "손 세정제",
								  "quantity": 3,
								  "location": "현관 수납장",
								  "note": "리필형",
								  "purchasedAt": "2026-05-01"
								}
								"""))
				.andExpect(status().isCreated())
				.andExpect(jsonPath("$.name").value("손 세정제"))
				.andExpect(jsonPath("$.quantity").value(3))
				.andReturn();

		JsonNode created = objectMapper.readTree(createResult.getResponse().getContentAsString());
		long id = created.get("id").asLong();

		mockMvc.perform(get("/api/items").queryParam("q", "세정"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].id").value(id))
				.andExpect(jsonPath("$[0].location").value("현관 수납장"));

		mockMvc.perform(put("/api/items/{id}", id)
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": "손 세정제",
								  "quantity": 2,
								  "location": "욕실 선반",
								  "note": "하나 사용함",
								  "purchasedAt": "2026-05-01"
								}
								"""))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.quantity").value(2))
				.andExpect(jsonPath("$.location").value("욕실 선반"));

		mockMvc.perform(get("/api/items").queryParam("q", "욕실"))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$[0].note").value("하나 사용함"));
	}

	@Test
	void rejectInvalidPayload() throws Exception {
		mockMvc.perform(post("/api/items")
						.contentType(MediaType.APPLICATION_JSON)
						.content("""
								{
								  "name": " ",
								  "quantity": -1
								}
								"""))
				.andExpect(status().isBadRequest())
				.andExpect(jsonPath("$.fieldErrors.name").exists())
				.andExpect(jsonPath("$.fieldErrors.quantity").exists());
	}

	@Test
	void deleteItem() throws Exception {
		InventoryItem item = repository.save(new InventoryItem("휴지", 12, "창고", "두루마리", LocalDate.of(2026, 4, 20)));

		mockMvc.perform(delete("/api/items/{id}", item.getId()))
				.andExpect(status().isNoContent());

		assertThat(repository.existsById(item.getId())).isFalse();
	}

	@Test
	void findItemById() throws Exception {
		InventoryItem item = repository.save(new InventoryItem("건전지", 8, "서랍", "AA", LocalDate.of(2026, 3, 15)));

		mockMvc.perform(get("/api/items/{id}", item.getId()))
				.andExpect(status().isOk())
				.andExpect(jsonPath("$.id").value(item.getId()))
				.andExpect(jsonPath("$.name").value("건전지"))
				.andExpect(jsonPath("$.location").value("서랍"));
	}

	@Test
	void returnNotFoundForMissingItem() throws Exception {
		mockMvc.perform(get("/api/items/{id}", 999L))
				.andExpect(status().isNotFound())
				.andExpect(jsonPath("$.status").value(404))
				.andExpect(jsonPath("$.message").value("재고 항목을 찾을 수 없습니다. id=999"));
	}
}
