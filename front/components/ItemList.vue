<script setup lang="ts">
import {
  Boxes,
  CalendarDays,
  MapPin,
  Pencil,
  RefreshCcw,
  Search,
  StickyNote,
  Trash2,
} from '@lucide/vue'
import { useInventory } from '~/composables/useInventory'

const {
  displayItems,
  isLoading,
  outOfStockOnly,
  query,
  message,
  error,
  loadItems,
  startEdit,
  deleteItem,
  listPanelRef,
  getQuantityPresentation,
  formatDate,
} = useInventory()
</script>

<template>
  <section ref="listPanelRef" class="list-panel" aria-label="물품 목록">
    <div class="list-toolbar">
      <div>
        <p class="eyebrow">Inventory</p>
        <h2>
          <Boxes :size="22" aria-hidden="true" />
          물품 목록
        </h2>
      </div>
      <div class="toolbar-actions">
        <label class="search-box">
          <Search :size="18" aria-hidden="true" />
          <span class="sr-only">검색</span>
          <input
            v-model="query"
            placeholder="이름, 위치, 비고 검색"
            @input="() => { if (query.trim() && outOfStockOnly) outOfStockOnly = false }"
          >
        </label>
        <button class="icon-button" type="button" :title="'새로고침'" @click="loadItems(query)">
          <RefreshCcw :size="18" aria-hidden="true" />
          <span class="sr-only">새로고침</span>
        </button>
      </div>
    </div>

    <p
      v-if="message || error"
      :class="error ? 'status-message list-status-message error' : 'status-message list-status-message'"
    >
      {{ error || message }}
    </p>

    <div class="table-wrap">
      <table>
        <thead>
          <tr>
            <th>물품</th>
            <th>수량</th>
            <th>위치</th>
            <th>구매일</th>
            <th>비고</th>
            <th>관리</th>
          </tr>
        </thead>
        <tbody>
          <tr v-if="isLoading">
            <td colspan="6" class="empty-cell">
              목록을 불러오는 중입니다.
            </td>
          </tr>

          <tr
            v-for="item in displayItems"
            :key="item.id"
            :class="getQuantityPresentation(item.quantity).isOutOfStock ? 'out-of-stock-row' : undefined"
          >
            <td class="item-name-cell" data-label="물품">
              <strong class="wrap-cell">{{ item.name }}</strong>
            </td>
            <td class="quantity-cell" data-label="수량">
              <span :class="getQuantityPresentation(item.quantity).quantityClassName">{{ item.quantity }}</span>
            </td>
            <td class="location-cell" data-label="위치">
              <span class="meta-cell">
                <MapPin :size="16" aria-hidden="true" />
                <span class="wrap-cell">{{ item.location || '미기록' }}</span>
              </span>
            </td>
            <td class="purchase-date-cell" data-label="구매일">
              <span class="meta-cell date-cell">
                <CalendarDays :size="16" aria-hidden="true" />
                {{ formatDate(item.purchasedAt) }}
              </span>
            </td>
            <td class="note-cell" data-label="비고">
              <span class="meta-cell">
                <StickyNote :size="16" aria-hidden="true" />
                <span class="wrap-cell">{{ item.note || '미기록' }}</span>
              </span>
            </td>
            <td class="actions-cell" data-label="관리">
              <div class="row-actions">
                <button type="button" @click="startEdit(item)">
                  <Pencil :size="16" aria-hidden="true" />
                  수정
                </button>
                <button class="danger-button" type="button" @click="deleteItem(item)">
                  <Trash2 :size="16" aria-hidden="true" />
                  삭제
                </button>
              </div>
            </td>
          </tr>

          <tr v-if="!isLoading && displayItems.length === 0">
            <td colspan="6" class="empty-cell">
              {{ outOfStockOnly ? '수량이 0인 물품이 없습니다.' : '등록된 물품이 없습니다.' }}
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <div class="mobile-list" aria-label="모바일 물품 목록">
      <p v-if="isLoading" class="mobile-list-state">목록을 불러오는 중입니다.</p>

      <article
        v-for="item in displayItems"
        :key="item.id"
        :class="getQuantityPresentation(item.quantity).isOutOfStock ? 'inventory-card out-of-stock-card' : 'inventory-card'"
      >
        <div class="inventory-card-header">
          <h3 class="inventory-card-title">{{ item.name }}</h3>
          <span :class="getQuantityPresentation(item.quantity).quantityClassName" :aria-label="`수량 ${item.quantity}`">
            {{ item.quantity }}
          </span>
        </div>

        <dl class="inventory-card-details">
          <div>
            <dt>
              <MapPin :size="16" aria-hidden="true" />
              위치
            </dt>
            <dd>{{ item.location || '미기록' }}</dd>
          </div>
          <div>
            <dt>
              <CalendarDays :size="16" aria-hidden="true" />
              구매일
            </dt>
            <dd>{{ formatDate(item.purchasedAt) }}</dd>
          </div>
          <div>
            <dt>
              <StickyNote :size="16" aria-hidden="true" />
              비고
            </dt>
            <dd>{{ item.note || '미기록' }}</dd>
          </div>
        </dl>

        <div class="inventory-card-actions">
          <button type="button" @click="startEdit(item)">
            <Pencil :size="16" aria-hidden="true" />
            수정
          </button>
          <button class="danger-button" type="button" @click="deleteItem(item)">
            <Trash2 :size="16" aria-hidden="true" />
            삭제
          </button>
        </div>
      </article>

      <p v-if="!isLoading && displayItems.length === 0" class="mobile-list-state">
        {{ outOfStockOnly ? '수량이 0인 물품이 없습니다.' : '등록된 물품이 없습니다.' }}
      </p>
    </div>
  </section>
</template>
