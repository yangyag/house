import {
  Boxes,
  CalendarDays,
  MapPin,
  PackagePlus,
  Pencil,
  RefreshCcw,
  Save,
  Search,
  StickyNote,
  Trash2,
  X,
} from 'lucide-react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import heroImage from './assets/hero.png'
import './App.css'

const API_URL = '/api/items'

const emptyForm = {
  name: '',
  quantity: 1,
  location: '',
  note: '',
  purchasedAt: '',
  purchasedAtUnknown: false,
}

function normalizeItem(item) {
  return {
    id: item.id,
    name: item.name ?? '',
    quantity: Number(item.quantity ?? 0),
    location: item.location ?? '',
    note: item.note ?? '',
    purchasedAt: item.purchasedAt ?? '',
  }
}

function formatDate(value) {
  if (!value) return '구매일 모름'

  return new Intl.DateTimeFormat('ko-KR', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).format(new Date(`${value}T00:00:00`))
}

async function requestJson(url, options = {}) {
  const response = await fetch(url, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  })

  if (response.status === 204) {
    return null
  }

  const data = await response.json().catch(() => null)

  if (!response.ok) {
    const fieldMessage = data?.fieldErrors
      ? Object.values(data.fieldErrors).filter(Boolean).join(' ')
      : ''
    throw new Error(fieldMessage || data?.message || '요청 처리에 실패했습니다.')
  }

  return data
}

function getQuantityPresentation(quantity) {
  const isOutOfStock = quantity === 0
  const quantityClassName = [
    'quantity-pill',
    quantity <= 1 ? 'low' : '',
    isOutOfStock ? 'zero' : '',
  ].filter(Boolean).join(' ')

  return { isOutOfStock, quantityClassName }
}

function App() {
  const [items, setItems] = useState([])
  const [form, setForm] = useState(emptyForm)
  const [editingId, setEditingId] = useState(null)
  const [query, setQuery] = useState('')
  const [outOfStockOnly, setOutOfStockOnly] = useState(false)
  const [isLoading, setIsLoading] = useState(true)
  const [isSaving, setIsSaving] = useState(false)
  const [message, setMessage] = useState('')
  const [error, setError] = useState('')
  const editorPanelRef = useRef(null)
  const nameInputRef = useRef(null)

  const loadItems = useCallback(async (keyword = query) => {
    setIsLoading(true)
    setError('')

    try {
      const params = keyword.trim()
        ? `?q=${encodeURIComponent(keyword.trim())}`
        : ''
      const data = await requestJson(`${API_URL}${params}`)
      setItems(Array.isArray(data) ? data.map(normalizeItem) : [])
    } catch (loadError) {
      setError(loadError.message)
      setItems([])
    } finally {
      setIsLoading(false)
    }
  }, [query])

  useEffect(() => {
    const timer = window.setTimeout(() => {
      loadItems(query)
    }, 180)

    return () => window.clearTimeout(timer)
  }, [loadItems, query])

  const summary = useMemo(() => {
    const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0)
    const locations = new Set(items.map((item) => item.location).filter(Boolean))
    const lowStock = items.filter((item) => item.quantity === 0).length

    return {
      totalItems: items.length,
      totalQuantity,
      locations: locations.size,
      lowStock,
    }
  }, [items])

  const displayItems = useMemo(() => {
    return outOfStockOnly ? items.filter((item) => item.quantity === 0) : items
  }, [items, outOfStockOnly])

  function updateForm(field, value) {
    setForm((current) => ({ ...current, [field]: value }))
  }

  function setPurchaseDateUnknown(checked) {
    setForm((current) => ({
      ...current,
      purchasedAt: checked ? '' : current.purchasedAt,
      purchasedAtUnknown: checked,
    }))
  }

  function resetForm() {
    setForm(emptyForm)
    setEditingId(null)
  }

  function revealEditorPanel() {
    window.requestAnimationFrame(() => {
      editorPanelRef.current?.scrollIntoView({ block: 'start' })
      nameInputRef.current?.focus({ preventScroll: true })
    })
  }

  function startEdit(item) {
    setForm({
      name: item.name,
      quantity: item.quantity,
      location: item.location,
      note: item.note,
      purchasedAt: item.purchasedAt,
      purchasedAtUnknown: !item.purchasedAt,
    })
    setEditingId(item.id)
    setMessage(`${item.name} 수정 중`)
    setError('')
    revealEditorPanel()
  }

  async function handleSubmit(event) {
    event.preventDefault()
    setError('')

    const payload = {
      name: form.name.trim(),
      quantity: Math.max(0, Number(form.quantity) || 0),
      location: form.location.trim() || null,
      note: form.note.trim() || null,
      purchasedAt: form.purchasedAtUnknown ? null : form.purchasedAt || null,
    }

    if (!payload.name) {
      setError('물품명을 입력해 주세요.')
      return
    }

    setIsSaving(true)

    try {
      const saved = editingId
        ? await requestJson(`${API_URL}/${editingId}`, {
            method: 'PUT',
            body: JSON.stringify(payload),
          })
        : await requestJson(API_URL, {
            method: 'POST',
            body: JSON.stringify(payload),
          })

      const nextItem = normalizeItem(saved)
      setItems((current) =>
        editingId
          ? current.map((item) => (item.id === editingId ? nextItem : item))
          : [nextItem, ...current],
      )
      setMessage(editingId ? '수정했습니다.' : '저장했습니다.')
      resetForm()
    } catch (saveError) {
      setError(saveError.message)
    } finally {
      setIsSaving(false)
    }
  }

  async function deleteItem(item) {
    const confirmed = window.confirm(`${item.name} 항목을 삭제할까요?`)
    if (!confirmed) return

    setError('')

    try {
      await requestJson(`${API_URL}/${item.id}`, { method: 'DELETE' })
      setItems((current) => current.filter((target) => target.id !== item.id))
      if (editingId === item.id) {
        resetForm()
      }
      setMessage('삭제했습니다.')
    } catch (deleteError) {
      setError(deleteError.message)
    }
  }

  return (
    <main className="inventory-shell">
      <section className="summary-band" aria-label="하유니 집 물건 관리 요약">
        <div className="summary-copy">
          <p className="eyebrow">Home Inventory</p>
          <h1>하유니 집 물건 관리</h1>
          <p>수량, 위치, 구매일, 비고를 한 화면에서 관리합니다.</p>
        </div>

        <img className="summary-image" src={heroImage} alt="" aria-hidden="true" />

        <div className="stats" aria-label="재고 통계">
          <div>
            <strong>{summary.totalItems}</strong>
            <span>등록 물품</span>
          </div>
          <div>
            <strong>{summary.totalQuantity}</strong>
            <span>총 수량</span>
          </div>
          <div>
            <strong>{summary.locations}</strong>
            <span>보관 위치</span>
          </div>
          <button
            type="button"
            className={outOfStockOnly ? 'stat-card-button stat-card-active' : 'stat-card-button'}
            onClick={() => setOutOfStockOnly(!outOfStockOnly)}
            aria-pressed={outOfStockOnly}
          >
            <strong>{summary.lowStock}</strong>
            <span>부족 후보</span>
          </button>
        </div>
      </section>

      <section className="workspace">
        <aside className="editor-panel" aria-label="물품 저장 및 수정" ref={editorPanelRef}>
          <div className="panel-heading">
            <p className="eyebrow">{editingId ? 'Edit Item' : 'New Item'}</p>
            <h2>
              <PackagePlus size={22} aria-hidden="true" />
              {editingId ? '물품 수정' : '물품 등록'}
            </h2>
          </div>

          {(message || error) && (
            <p className={error ? 'status-message form-status-message error' : 'status-message form-status-message'}>
              {error || message}
            </p>
          )}

          <form onSubmit={handleSubmit} className="item-form">
            <label>
              <span>물품명</span>
              <input
                ref={nameInputRef}
                value={form.name}
                onChange={(event) => updateForm('name', event.target.value)}
                placeholder="예: 휴지"
                required
              />
            </label>

            <div className="form-grid">
              <label>
                <span>수량</span>
                <input
                  type="number"
                  min="0"
                  value={form.quantity}
                  onChange={(event) => updateForm('quantity', event.target.value)}
                  required
                />
              </label>
              <div className="date-field">
                <div className="date-field-header">
                  <span>구매일</span>
                  <label className="checkbox-row">
                    <input
                      type="checkbox"
                      checked={form.purchasedAtUnknown}
                      onChange={(event) => setPurchaseDateUnknown(event.target.checked)}
                    />
                    <span>구매일 모름</span>
                  </label>
                </div>
                <input
                  id="purchased-at-input"
                  type="date"
                  aria-label="구매일"
                  value={form.purchasedAt}
                  disabled={form.purchasedAtUnknown}
                  onChange={(event) => updateForm('purchasedAt', event.target.value)}
                />
              </div>
            </div>

            <label>
              <span>위치</span>
              <input
                value={form.location}
                onChange={(event) => updateForm('location', event.target.value)}
                placeholder="예: 현관 수납장"
              />
            </label>

            <label>
              <span>비고</span>
              <textarea
                value={form.note}
                onChange={(event) => updateForm('note', event.target.value)}
                placeholder="규격, 리필 여부, 보충 시점"
                rows="4"
              />
            </label>

            <div className={editingId ? 'form-actions editing' : 'form-actions'}>
              <button className="primary-button" type="submit" disabled={isSaving}>
                <Save size={18} aria-hidden="true" />
                {isSaving ? '저장 중' : editingId ? '수정 저장' : '저장'}
              </button>
              {editingId && (
                <button className="ghost-button" type="button" onClick={resetForm}>
                  <X size={18} aria-hidden="true" />
                  취소
                </button>
              )}
            </div>
          </form>
        </aside>

        <section className="list-panel" aria-label="물품 목록">
          <div className="list-toolbar">
            <div>
              <p className="eyebrow">Inventory</p>
              <h2>
                <Boxes size={22} aria-hidden="true" />
                물품 목록
              </h2>
            </div>
            <div className="toolbar-actions">
              <label className="search-box">
                <Search size={18} aria-hidden="true" />
                <span className="sr-only">검색</span>
                <input
                  value={query}
                  onChange={(event) => {
                    setQuery(event.target.value)
                    if (event.target.value.trim() && outOfStockOnly) {
                      setOutOfStockOnly(false)
                    }
                  }}
                  placeholder="이름, 위치, 비고 검색"
                />
              </label>
              <button className="icon-button" type="button" onClick={() => loadItems(query)} title="새로고침">
                <RefreshCcw size={18} aria-hidden="true" />
                <span className="sr-only">새로고침</span>
              </button>
            </div>
          </div>

          {(message || error) && (
            <p className={error ? 'status-message list-status-message error' : 'status-message list-status-message'}>
              {error || message}
            </p>
          )}

          <div className="table-wrap">
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
                {isLoading && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      목록을 불러오는 중입니다.
                    </td>
                  </tr>
                )}

                {!isLoading &&
                  displayItems.map((item) => {
                    const { isOutOfStock, quantityClassName } = getQuantityPresentation(item.quantity)

                    return (
                      <tr key={item.id} className={isOutOfStock ? 'out-of-stock-row' : undefined}>
                        <td className="item-name-cell" data-label="물품">
                          <strong className="wrap-cell">{item.name}</strong>
                        </td>
                        <td className="quantity-cell" data-label="수량">
                          <span className={quantityClassName}>{item.quantity}</span>
                        </td>
                        <td className="location-cell" data-label="위치">
                          <span className="meta-cell">
                            <MapPin size={16} aria-hidden="true" />
                            <span className="wrap-cell">{item.location || '미기록'}</span>
                          </span>
                        </td>
                        <td className="purchase-date-cell" data-label="구매일">
                          <span className="meta-cell date-cell">
                            <CalendarDays size={16} aria-hidden="true" />
                            {formatDate(item.purchasedAt)}
                          </span>
                        </td>
                        <td className="note-cell" data-label="비고">
                          <span className="meta-cell">
                            <StickyNote size={16} aria-hidden="true" />
                            <span className="wrap-cell">{item.note || '미기록'}</span>
                          </span>
                        </td>
                        <td className="actions-cell" data-label="관리">
                          <div className="row-actions">
                            <button type="button" onClick={() => startEdit(item)}>
                              <Pencil size={16} aria-hidden="true" />
                              수정
                            </button>
                            <button className="danger-button" type="button" onClick={() => deleteItem(item)}>
                              <Trash2 size={16} aria-hidden="true" />
                              삭제
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })}

                {!isLoading && displayItems.length === 0 && (
                  <tr>
                    <td colSpan="6" className="empty-cell">
                      {outOfStockOnly ? '수량이 0인 물품이 없습니다.' : '등록된 물품이 없습니다.'}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div className="mobile-list" aria-label="모바일 물품 목록">
            {isLoading && (
              <p className="mobile-list-state">목록을 불러오는 중입니다.</p>
            )}

            {!isLoading &&
              displayItems.map((item) => {
                const { isOutOfStock, quantityClassName } = getQuantityPresentation(item.quantity)

                return (
                  <article
                    className={isOutOfStock ? 'inventory-card out-of-stock-card' : 'inventory-card'}
                    key={item.id}
                  >
                    <div className="inventory-card-header">
                      <h3 className="inventory-card-title">{item.name}</h3>
                      <span className={quantityClassName} aria-label={`수량 ${item.quantity}`}>
                        {item.quantity}
                      </span>
                    </div>

                    <dl className="inventory-card-details">
                      <div>
                        <dt>
                          <MapPin size={16} aria-hidden="true" />
                          위치
                        </dt>
                        <dd>{item.location || '미기록'}</dd>
                      </div>
                      <div>
                        <dt>
                          <CalendarDays size={16} aria-hidden="true" />
                          구매일
                        </dt>
                        <dd>{formatDate(item.purchasedAt)}</dd>
                      </div>
                      <div>
                        <dt>
                          <StickyNote size={16} aria-hidden="true" />
                          비고
                        </dt>
                        <dd>{item.note || '미기록'}</dd>
                      </div>
                    </dl>

                    <div className="inventory-card-actions">
                      <button type="button" onClick={() => startEdit(item)}>
                        <Pencil size={16} aria-hidden="true" />
                        수정
                      </button>
                      <button className="danger-button" type="button" onClick={() => deleteItem(item)}>
                        <Trash2 size={16} aria-hidden="true" />
                        삭제
                      </button>
                    </div>
                  </article>
                )
              })}

            {!isLoading && displayItems.length === 0 && (
              <p className="mobile-list-state">{outOfStockOnly ? '수량이 0인 물품이 없습니다.' : '등록된 물품이 없습니다.'}</p>
            )}
          </div>
        </section>
      </section>
    </main>
  )
}

export default App
