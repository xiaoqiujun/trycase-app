import { Store } from '@tauri-apps/plugin-store';

const isTauri = "__TAURI__" in window

let store: Store | null = null
if (isTauri) {
  store = await Store.load("settings.dat")
}

export const storage = {
  async get(key: string) {
    if (isTauri && store) {
      return await store.get(key)
    } else {
      return JSON.parse(localStorage.getItem(key) || "null")
    }
  },
  async set(key: string, value: any) {
    if (isTauri && store) {
      await store.set(key, value)
      await store.save()
    } else {
      localStorage.setItem(key, JSON.stringify(value))
    }
  },
  async remove(key: string) {
    if (isTauri && store) {
      await store.delete(key)
      await store.save()
    } else {
      localStorage.removeItem(key)
    }
  },
  async clear() {
    if (isTauri && store) {
      await store.clear()
      await store.save()
    } else {
      localStorage.clear()
    }
  }
}