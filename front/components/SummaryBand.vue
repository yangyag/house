<script setup lang="ts">
import heroImage from '~/assets/hero.png'
import { useInventory } from '~/composables/useInventory'

const { summary, outOfStockOnly, toggleOutOfStockFilter } = useInventory()
</script>

<template>
  <section class="summary-band" aria-label="하유니 집 물건 관리 요약">
    <div class="summary-copy">
      <p class="eyebrow">Home Inventory</p>
      <h1>하유니 집 물건 관리</h1>
      <p>수량, 위치, 구매일, 비고를 한 화면에서 관리합니다.</p>
    </div>

    <img class="summary-image" :src="heroImage" alt="" aria-hidden="true" >

    <div class="stats" aria-label="재고 통계">
      <div>
        <strong>{{ summary.totalItems }}</strong>
        <span>등록 물품</span>
      </div>
      <div>
        <strong>{{ summary.totalQuantity }}</strong>
        <span>총 수량</span>
      </div>
      <div>
        <strong>{{ summary.locations }}</strong>
        <span>보관 위치</span>
      </div>
      <button
        type="button"
        :class="outOfStockOnly ? 'stat-card-button stat-card-active' : 'stat-card-button'"
        :aria-pressed="outOfStockOnly"
        @click="toggleOutOfStockFilter"
      >
        <strong>{{ summary.lowStock }}</strong>
        <span>부족 후보</span>
      </button>
    </div>
  </section>
</template>
