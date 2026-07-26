export interface InventoryItem {
  id: number
  name: string
  quantity: number
  location: string
  note: string
  purchasedAt: string
}

export interface InventoryForm {
  name: string
  quantity: number
  location: string
  note: string
  purchasedAt: string
  purchasedAtUnknown: boolean
}

export interface FieldErrors {
  [field: string]: string
}

export interface ApiErrorBody {
  timestamp?: string
  status?: number
  error?: string
  message?: string
  fieldErrors?: FieldErrors
}
