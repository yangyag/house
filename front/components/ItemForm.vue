<script setup lang="ts">
import { PackagePlus, Save, X } from '@lucide/vue'
import { useInventory } from '~/composables/useInventory'

const {
  form,
  editingId,
  isSaving,
  message,
  error,
  handleSubmit,
  resetForm,
  setPurchaseDateUnknown,
  editorPanelRef,
  nameInputRef,
} = useInventory()
</script>

<template>
  <aside ref="editorPanelRef" class="editor-panel" aria-label="물품 저장 및 수정">
    <div class="panel-heading">
      <p class="eyebrow">{{ editingId ? 'Edit Item' : 'New Item' }}</p>
      <h2>
        <PackagePlus :size="22" aria-hidden="true" />
        {{ editingId ? '물품 수정' : '물품 등록' }}
      </h2>
    </div>

    <p
      v-if="message || error"
      :class="error ? 'status-message form-status-message error' : 'status-message form-status-message'"
    >
      {{ error || message }}
    </p>

    <form class="item-form" @submit.prevent="handleSubmit">
      <label>
        <span>물품명</span>
        <input
          ref="nameInputRef"
          v-model="form.name"
          placeholder="예: 휴지"
          required
        >
      </label>

      <div class="form-grid">
        <label>
          <span>수량</span>
          <input
            v-model.number="form.quantity"
            type="number"
            min="0"
            required
          >
        </label>
        <div class="date-field">
          <div class="date-field-header">
            <span>구매일</span>
            <label class="checkbox-row">
              <input
                type="checkbox"
                :checked="form.purchasedAtUnknown"
                @change="setPurchaseDateUnknown(($event.target as HTMLInputElement).checked)"
              >
              <span>구매일 모름</span>
            </label>
          </div>
          <input
            id="purchased-at-input"
            v-model="form.purchasedAt"
            type="date"
            aria-label="구매일"
            :disabled="form.purchasedAtUnknown"
          >
        </div>
      </div>

      <label>
        <span>위치</span>
        <input
          v-model="form.location"
          placeholder="예: 현관 수납장"
        >
      </label>

      <label>
        <span>비고</span>
        <textarea
          v-model="form.note"
          placeholder="규격, 리필 여부, 보충 시점"
          rows="4"
        />
      </label>

      <div :class="editingId ? 'form-actions editing' : 'form-actions'">
        <button class="primary-button" type="submit" :disabled="isSaving">
          <Save :size="18" aria-hidden="true" />
          {{ isSaving ? '저장 중' : editingId ? '수정 저장' : '저장' }}
        </button>
        <button
          v-if="editingId"
          class="ghost-button"
          type="button"
          @click="resetForm"
        >
          <X :size="18" aria-hidden="true" />
          취소
        </button>
      </div>
    </form>
  </aside>
</template>
