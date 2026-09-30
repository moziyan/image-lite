import { mount } from '@vue/test-utils'
import { createPinia, setActivePinia } from 'pinia'
import { beforeEach, describe, expect, it } from 'vitest'

import UploadZone from '@/components/upload/UploadZone.vue'
import { i18n } from '@/locales'
import { useImageQueueStore } from '@/stores/imageQueue'

const global = { plugins: [i18n] }

function makeFile(name: string, type: string, size = 1024): File {
  return new File([new Uint8Array(size)], name, { type })
}

describe('UploadZone', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('emits filesSelected when files are chosen via the input', async () => {
    const wrapper = mount(UploadZone, { global })
    const input = wrapper.find('input[type="file"]')
    const files = [makeFile('a.jpg', 'image/jpeg')]

    Object.defineProperty(input.element, 'files', {
      value: files,
      configurable: true,
    })
    await input.trigger('change')

    const emitted = wrapper.emitted('filesSelected')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([files])
  })

  it('emits filesSelected on drop', async () => {
    const wrapper = mount(UploadZone, { global })
    const files = [makeFile('b.png', 'image/png')]

    await wrapper.trigger('drop', {
      dataTransfer: { files },
    })

    const emitted = wrapper.emitted('filesSelected')
    expect(emitted).toBeTruthy()
    expect(emitted![0]).toEqual([files])
  })

  it('is keyboard accessible', () => {
    const wrapper = mount(UploadZone, { global })
    const zone = wrapper.find('.upload-zone')
    expect(zone.attributes('role')).toBe('button')
    expect(zone.attributes('tabindex')).toBe('0')
    expect(zone.attributes('aria-label')).toBeTruthy()
  })
})

describe('upload flow (store integration)', () => {
  beforeEach(() => {
    setActivePinia(createPinia())
  })

  it('adds dropped files to the queue and reports rejections', () => {
    const store = useImageQueueStore()
    const { rejected } = store.addFiles([
      makeFile('ok.jpg', 'image/jpeg'),
      makeFile('bad.gif', 'image/gif'),
      makeFile('ok2.webp', 'image/webp'),
    ])

    expect(store.count).toBe(2)
    expect(rejected).toHaveLength(1)
    expect(store.items.map((item) => item.name)).toEqual(['ok.jpg', 'ok2.webp'])
  })
})
