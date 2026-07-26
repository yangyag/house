<script setup lang="ts">
import SummaryBand from '~/components/SummaryBand.vue'
import ItemForm from '~/components/ItemForm.vue'
import ItemList from '~/components/ItemList.vue'
</script>

<template>
  <main class="inventory-shell">
    <SummaryBand />
    <section class="workspace">
      <ItemForm />
      <ItemList />
    </section>
  </main>
</template>
