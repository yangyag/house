import { computed, reactive, ref, watch } from 'vue'
import type { InventoryForm, InventoryItem } from '~/types/inventory'

const API_URL = '/api/items'

/**
 * 빈 등록 폼의 초기값을 반환합니다.
 * @returns {InventoryForm} name이 비어 있고 수량 1인 빈 폼
 */
const emptyForm = (): InventoryForm => ({
  name: '',
  quantity: 1,
  location: '',
  note: '',
  purchasedAt: '',
  purchasedAtUnknown: false,
})

/**
 * API 응답 아이템을 화면에서 다루기 쉽게 null/undefined를 안전한 기본값으로 정규화합니다.
 * @param {InventoryItem} item 서버에서 받은 원본 아이템
 * @returns {InventoryItem} 정규화된 아이템
 */
const normalizeItem = (item: InventoryItem): InventoryItem => ({
  id: item.id,
  name: item.name ?? '',
  quantity: Number(item.quantity ?? 0),
  location: item.location ?? '',
  note: item.note ?? '',
  purchasedAt: item.purchasedAt ?? '',
})

/**
 * 날짜 문자열을 'YYYY.MM.DD' 형식으로 포맷합니다.
 * @param {string} value YYYY-MM-DD 형식의 날짜 문자열
 * @returns {string} 포맷된 날짜, 빈 값은 '구매일 모름'
 */
export const formatDate = (value: string): string => {
  if (!value) return '구매일 모름'
  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`))
}

/**
 * fetch 래퍼입니다. 204 No Content는 null로, 실패 시 fieldErrors를 모아 에러 메시지로 던집니다.
 * @param {string} url 요청 URL
 * @param {RequestInit} [options] fetch 옵션
 * @returns {Promise<InventoryItem>} 파싱된 응답 데이터
 */
export const requestJson = async (
  url: string,
  options: RequestInit = {},
): Promise<InventoryItem> => {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (response.status === 204) {
    return null as unknown as InventoryItem
  }

  const data = (await response.json().catch(() => null)) as InventoryItem & {
    fieldErrors?: Record<string, string>
    message?: string
  }

  if (!response.ok) {
    const fieldMessage = data?.fieldErrors
      ? Object.values(data.fieldErrors).filter(Boolean).join(' ')
      : ''
    throw new Error(fieldMessage || data?.message || '요청 처리에 실패했습니다.')
  }

  return data
}

/**
 * 수량에 따라 표시용 클래스(low/zero)와 품절 여부를 계산합니다.
 * @param {number} quantity 물품 수량
 * @returns {{ isOutOfStock: boolean, quantityClassName: string }} 품절 여부와 CSS 클래스 문자열
 */
export const getQuantityPresentation = (quantity: number) => {
  const isOutOfStock = quantity === 0
  const quantityClassName = [
    'quantity-pill',
    quantity <= 1 ? 'low' : '',
    isOutOfStock ? 'zero' : '',
  ]
    .filter(Boolean)
    .join(' ')

  return { isOutOfStock, quantityClassName }
}

/** 목록/검색/로딩/저장/편집 등 컴포넌트 간 공유 상태입니다. */
const items = ref<InventoryItem[]>([])
/** 검색어입니다. 변경 시 디바운스되어 목록을 다시 조회합니다. */
const query = ref('')
/** 수량 0인 항목만 보여주는 '부족 후보' 필터 활성 여부입니다. */
const outOfStockOnly = ref(false)
/** 목록 조회 중 여부입니다. */
const isLoading = ref(true)
/** 저장/수정 요청 처리 중 여부입니다. */
const isSaving = ref(false)
/** 사용자에게 보여줄 상태 메시지입니다. */
const message = ref('')
/** 에러 메시지입니다. 있으면 상태 메시지가 에러 스타일로 표시됩니다. */
const error = ref('')

/** 물품 등록/수정 폼의 입력값입니다. */
const form = reactive<InventoryForm>(emptyForm())
/** 현재 편집 중인 항목의 id (null이면 신규 등록 모드)입니다. */
const editingId = ref<number | null>(null)

/** 수정 폼 패널 엘리먼트 참조입니다. */
const editorPanelRef = ref<HTMLElement | null>(null)
/** 목록 패널 엘리먼트 참조입니다. */
const listPanelRef = ref<HTMLElement | null>(null)
/** 물품명 입력칸 엘리먼트 참조입니다. */
const nameInputRef = ref<HTMLInputElement | null>(null)

/** 수정 폼 패널 상단으로 스크롤하고 물품명 입력칸에 포커스합니다. */
const revealEditorPanel = () => {
  requestAnimationFrame(() => {
    editorPanelRef.value?.scrollIntoView({ block: 'start' })
    nameInputRef.value?.focus({ preventScroll: true })
  })
}

/** 모바일 뷰포트에서만 목록 패널 상단으로 스크롤합니다. */
const revealListPanelOnMobile = () => {
  if (!window.matchMedia('(max-width: 720px)').matches) return

  requestAnimationFrame(() => {
    listPanelRef.value?.scrollIntoView({ block: 'start' })
  })
}

/**
 * '구매일 모름' 체크 상태에 따라 purchasedAt을 비우거나 복원합니다.
 * @param {boolean} checked 구매일 모름 체크 여부
 */
const setPurchaseDateUnknown = (checked: boolean) => {
  form.purchasedAt = checked ? '' : form.purchasedAt
  form.purchasedAtUnknown = checked
}

/** 폼 입력값과 편집 대상(editingId)을 초기 상태로 되돌립니다. */
const resetForm = () => {
  Object.assign(form, emptyForm())
  editingId.value = null
}

/**
 * 물품 목록을 조회합니다. 검색어가 있으면 서버 검색(q), 없으면 전체 목록을 가져옵니다.
 * @param {string} [keyword] 검색어 (생략 시 현재 query 사용)
 */
const loadItems = async (keyword = query.value) => {
  isLoading.value = true
  error.value = ''

  try {
    const params = keyword.trim() ? `?q=${encodeURIComponent(keyword.trim())}` : ''
    const data = await requestJson(`${API_URL}${params}`)
    items.value = Array.isArray(data) ? data.map(normalizeItem) : []
  } catch (loadError) {
    error.value = (loadError as Error).message
    items.value = []
  } finally {
    isLoading.value = false
  }
}

/** 검색어(query) 변경을 180ms 디바운스하여 loadItems를 호출합니다 (최초 1회 즉시 로드). */
let debounceTimer: ReturnType<typeof setTimeout> | undefined
watch(
  query,
  (value) => {
    if (debounceTimer) clearTimeout(debounceTimer)
    debounceTimer = setTimeout(() => loadItems(value), 180)
  },
  { immediate: true },
)

/** 등록 물품 수 / 총 수량 / 보관 위치 수 / 품절(수량 0) 항목 수를 집계합니다. */
const summary = computed(() => {
  const totalQuantity = items.value.reduce((sum, item) => sum + item.quantity, 0)
  const locations = new Set(items.value.map((item) => item.location).filter(Boolean))
  const lowStock = items.value.filter((item) => item.quantity === 0).length

  return {
    totalItems: items.value.length,
    totalQuantity,
    locations: locations.size,
    lowStock,
  }
})

/** 품절 필터가 켜지면 수량 0인 항목만, 아니면 수량 0을 우선 정렬해 목록에 표시합니다. */
const displayItems = computed(() => {
  if (outOfStockOnly.value) return items.value.filter((item) => item.quantity === 0)
  return [...items.value].sort(
    (a, b) => (a.quantity === 0 ? 0 : 1) - (b.quantity === 0 ? 0 : 1),
  )
})

/** '부족 후보' 버튼: 품절 전용 필터를 켜고, 모바일이면 목록 패널로 스크롤합니다. */
const toggleOutOfStockFilter = () => {
  outOfStockOnly.value = !outOfStockOnly.value
  revealListPanelOnMobile()
}

/**
 * 목록의 '수정' 클릭 시 해당 항목을 폼에 채우고 편집 모드로 전환한 뒤 폼으로 포커스합니다.
 * @param {InventoryItem} item 수정할 항목
 */
const startEdit = (item: InventoryItem) => {
  form.name = item.name
  form.quantity = item.quantity
  form.location = item.location
  form.note = item.note
  form.purchasedAt = item.purchasedAt
  form.purchasedAtUnknown = !item.purchasedAt
  editingId.value = item.id
  message.value = `${item.name} 수정 중`
  error.value = ''
  revealEditorPanel()
}

/** 폼 제출 시 생성(POST) 또는 수정(PUT) 요청을 보내고 목록/상태를 갱신합니다. */
const handleSubmit = async () => {
  error.value = ''

  const payload = {
    name: form.name.trim(),
    quantity: Math.max(0, Number(form.quantity) || 0),
    location: form.location.trim() || null,
    note: form.note.trim() || null,
    purchasedAt: form.purchasedAtUnknown ? null : form.purchasedAt || null,
  }

  if (!payload.name) {
    error.value = '물품명을 입력해 주세요.'
    return
  }

  isSaving.value = true

  try {
    const saved = editingId.value
      ? await requestJson(`${API_URL}/${editingId.value}`, {
          method: 'PUT',
          body: JSON.stringify(payload),
        })
      : await requestJson(API_URL, {
          method: 'POST',
          body: JSON.stringify(payload),
        })

    const nextItem = normalizeItem(saved)
    items.value = editingId.value
      ? items.value.map((item) => (item.id === editingId.value ? nextItem : item))
      : [nextItem, ...items.value]
    message.value = editingId.value ? '수정했습니다.' : '저장했습니다.'
    resetForm()
  } catch (saveError) {
    error.value = (saveError as Error).message
  } finally {
    isSaving.value = false
  }
}

/**
 * 항목 삭제 전 확인하고, 승인 시 DELETE 요청 후 목록에서 제거합니다.
 * @param {InventoryItem} item 삭제할 항목
 */
const deleteItem = async (item: InventoryItem) => {
  const confirmed = window.confirm(`${item.name} 항목을 삭제할까요?`)
  if (!confirmed) return

  error.value = ''

  try {
    await requestJson(`${API_URL}/${item.id}`, { method: 'DELETE' })
    items.value = items.value.filter((target) => target.id !== item.id)
    if (editingId.value === item.id) {
      resetForm()
    }
    message.value = '삭제했습니다.'
  } catch (deleteError) {
    error.value = (deleteError as Error).message
  }
}

/**
 * 컴포넌트에서 공유할 상태와 액션을 한 곳에 모아 반환하는 composable입니다.
 * @returns {object} items/query/form 등 상태와 loadItems/startEdit/handleSubmit 등 액션
 */
export const useInventory = () => ({
  items,
  query,
  outOfStockOnly,
  isLoading,
  isSaving,
  message,
  error,
  form,
  editingId,
  editorPanelRef,
  listPanelRef,
  nameInputRef,
  summary,
  displayItems,
  getQuantityPresentation,
  formatDate,
  loadItems,
  setPurchaseDateUnknown,
  resetForm,
  toggleOutOfStockFilter,
  startEdit,
  handleSubmit,
  deleteItem,
})
