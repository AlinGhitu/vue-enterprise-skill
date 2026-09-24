// Stub API client the skill's examples import.
export interface Invoice {
  id: string
  number: string
  total: number
}
export type NewInvoice = Omit<Invoice, 'id'>

export const api = {
  invoices: {
    get(id: string): Promise<Invoice> {
      return Promise.resolve({ id, number: 'INV-1', total: 0 })
    },
    create(input: NewInvoice): Promise<Invoice> {
      return Promise.resolve({ id: crypto.randomUUID(), ...input })
    },
  },
}
