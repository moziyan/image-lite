import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LIMITS } from '@/config/limits'
import { useImageQueueStore } from '@/stores/imageQueue'

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('imageQueue store', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
    vi.restoreAllMocks()
  })

  it('starts empty', () => {
    const store = useImageQueueStore()
    expect(store.isEmpty).toBe(true)
    expect(store.count).toBe(0)
    expect(store.selectedItem).toBeNull()
  })

  it('adds valid files and selects the first one', () => {
    const store = useImageQueueStore()
    const rejected = store.addFiles([
      makeFile('a.jpg', 'image/jpeg'),
      makeFile('b.png', 'image/png'),
    ])
    expect(rejected).toHaveLength(0)
    expect(store.count).toBe(2)
    expect(store.selectedId).toBe(store.items[0]?.id)
    expect(store.items[0]?.status).toBe('pending')
    expect(store.items[0]?.previewUrl).toMatch(/^blob:/)
  })

  it('rejects invalid files without adding them', () => {
    const store = useImageQueueStore()
    const rejected = store.addFiles([makeFile('anim.gif', 'image/gif')])
    expect(rejected).toHaveLength(1)
    expect(rejected[0]?.code).toBe('UNSUPPORTED_FORMAT')
    expect(store.isEmpty).toBe(true)
    expect(store.lastRejected).toHaveLength(1)
  })

  it('removes an item and revokes its object URL', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')])
    const firstId = store.items[0]!.id
    const firstUrl = store.items[0]!.previewUrl

    store.removeItem(firstId)
    expect(store.count).toBe(1)
    expect(revokeSpy).toHaveBeenCalledWith(firstUrl)
    // selection falls back to the remaining item
    expect(store.selectedId).toBe(store.items[0]?.id)
  })

  it('clearAll revokes every object URL and resets selection', () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg'), makeFile('b.png', 'image/png')])
    const urls = store.items.map((item) => item.previewUrl)

    store.clearAll()
    expect(store.isEmpty).toBe(true)
    expect(store.selectedId).toBeNull()
    for (const url of urls) {
      expect(revokeSpy).toHaveBeenCalledWith(url)
    }
  })

  it('selectItem only selects existing items', () => {
    const store = useImageQueueStore()
    store.addFiles([makeFile('a.jpg', 'image/jpeg')])
    const id = store.items[0]!.id

    store.selectItem('nonexistent')
    expect(store.selectedId).toBe(id)

    store.addFiles([makeFile('b.png', 'image/png')])
    const secondId = store.items[1]!.id
    store.selectItem(secondId)
    expect(store.selectedId).toBe(secondId)
  })

  it('respects the batch size limit', () => {
    const store = useImageQueueStore()
    const files = Array.from({ length: LIMITS.MAX_BATCH_SIZE + 5 }, (_, i) =>
      makeFile(`img-${i}.jpg`, 'image/jpeg'),
    )
    const rejected = store.addFiles(files)
    expect(store.count).toBe(LIMITS.MAX_BATCH_SIZE)
    expect(rejected).toHaveLength(5)
  })
})
