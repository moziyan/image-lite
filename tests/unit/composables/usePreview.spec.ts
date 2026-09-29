import { mount } from '@vue/test-utils'
import { defineComponent, nextTick, ref } from 'vue'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

import { usePreview, type PreviewSettingsInput } from '@/composables/usePreview'
import type { ImageProcessResult } from '@/types/image'

vi.mock('@/services/image/previewService', async () => {
  class TaskCancelledError extends Error {
    constructor() {
      super('Processing was cancelled.')
      this.name = 'TaskCancelledError'
    }
  }
  return {
    previewService: { schedule: vi.fn(), cancelPending: vi.fn(), isRunning: false },
    TaskCancelledError,
    PreviewService: class {},
  }
})

import { previewService, TaskCancelledError } from '@/services/image/previewService'

const scheduleMock = vi.mocked(previewService.schedule)

function makeResult(size = 1234): ImageProcessResult {
  return {
    blob: new Blob(['x'.repeat(size)], { type: 'image/webp' }),
    width: 10,
    height: 10,
    format: 'webp',
    size,
    originalSize: size * 2,
    compressionRatio: 0.5,
    processingTime: 1,
  }
}

function makeSettings(): PreviewSettingsInput {
  return {
    resize: { maintainAspectRatio: true, allowUpscale: false },
    output: { format: 'webp', quality: 80 },
  }
}

function mountPreview() {
  const source = ref<{ id: string; file: File } | null>({
    id: 'item-1',
    file: new File(['x'], 'a.jpg', { type: 'image/jpeg' }),
  })
  const settings = ref<PreviewSettingsInput>(makeSettings())

  let api!: ReturnType<typeof usePreview>
  const wrapper = mount(
    defineComponent({
      setup() {
        api = usePreview(source, settings)
        return () => null
      },
    }),
  )
  return { source, settings, wrapper, api: () => api }
}

describe('usePreview', () => {
  beforeEach(() => {
    scheduleMock.mockReset()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('schedules a preview and exposes the object URL on success', async () => {
    scheduleMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const { api, wrapper } = mountPreview()

    await nextTick()
    await vi.waitFor(() => expect(api().previewUrl.value).toMatch(/^blob:/))
    expect(api().previewResult.value?.size).toBe(1234)
    expect(api().isLoading.value).toBe(false)
    expect(scheduleMock).toHaveBeenCalledWith(
      expect.objectContaining({ id: expect.stringContaining('item-1') }),
    )
    wrapper.unmount()
  })

  it('regenerates when settings change (stale job cancelled)', async () => {
    const cancels: Array<ReturnType<typeof vi.fn>> = []
    let call = 0
    scheduleMock.mockImplementation(() => {
      const cancel = vi.fn()
      cancels.push(cancel)
      call += 1
      return { promise: Promise.resolve(makeResult(1000 + call)), cancel }
    })

    const { api, settings, wrapper } = mountPreview()
    await nextTick()
    await vi.waitFor(() => expect(api().previewResult.value?.size).toBe(1001))

    settings.value = { ...makeSettings(), output: { format: 'jpeg', quality: 50 } }
    await nextTick()
    await vi.waitFor(() => expect(api().previewResult.value?.size).toBe(1002))

    // First job was cancelled before the second ran.
    expect(cancels[0]).toHaveBeenCalledTimes(1)
    wrapper.unmount()
  })

  it('revokes the old object URL when a new preview arrives', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    let call = 0
    scheduleMock.mockImplementation(() => {
      call += 1
      return { promise: Promise.resolve(makeResult(1000 + call)), cancel: vi.fn() }
    })

    const { api, settings, wrapper } = mountPreview()
    await nextTick()
    await vi.waitFor(() => expect(api().previewResult.value?.size).toBe(1001))
    const firstUrl = api().previewUrl.value!

    settings.value = { ...makeSettings(), output: { format: 'png' } }
    await nextTick()
    await vi.waitFor(() => expect(api().previewResult.value?.size).toBe(1002))

    expect(revokeSpy).toHaveBeenCalledWith(firstUrl)
    expect(api().previewUrl.value).not.toBe(firstUrl)
    wrapper.unmount()
  })

  it('ignores results from superseded generations', async () => {
    const resolvers: Array<(r: ImageProcessResult) => void> = []
    scheduleMock.mockImplementation(() => ({
      promise: new Promise<ImageProcessResult>((resolve) => resolvers.push(resolve)),
      cancel: vi.fn(),
    }))

    const { api, settings, wrapper } = mountPreview()
    await nextTick()
    settings.value = { ...makeSettings(), output: { format: 'jpeg' } }
    await nextTick()
    expect(resolvers).toHaveLength(2)

    // Resolve the stale (first) job AFTER the second was scheduled.
    resolvers[0]!(makeResult(1111))
    await nextTick()
    expect(api().previewResult.value).toBeNull()

    resolvers[1]!(makeResult(2222))
    await nextTick()
    expect(api().previewResult.value?.size).toBe(2222)
    wrapper.unmount()
  })

  it('surfaces errors and clears loading state', async () => {
    scheduleMock.mockReturnValue({
      promise: Promise.reject(new Error('decode failed')),
      cancel: vi.fn(),
    })
    const { api, wrapper } = mountPreview()

    await nextTick()
    await vi.waitFor(() => expect(api().error.value).toBe('decode failed'))
    expect(api().isLoading.value).toBe(false)
    expect(api().previewUrl.value).toBeNull()
    wrapper.unmount()
  })

  it('silently ignores TaskCancelledError (stale jobs)', async () => {
    scheduleMock.mockReturnValue({
      promise: Promise.reject(new TaskCancelledError()),
      cancel: vi.fn(),
    })
    const { api, wrapper } = mountPreview()

    await nextTick()
    await nextTick()
    await nextTick()
    expect(api().error.value).toBeNull()
    wrapper.unmount()
  })

  it('clears the preview when the source becomes null', async () => {
    scheduleMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const { api, source, wrapper } = mountPreview()

    await nextTick()
    await vi.waitFor(() => expect(api().previewUrl.value).toBeTruthy())

    source.value = null
    await nextTick()
    expect(api().previewUrl.value).toBeNull()
    expect(api().previewResult.value).toBeNull()
    wrapper.unmount()
  })

  it('revokes the object URL on unmount', async () => {
    const revokeSpy = vi.spyOn(URL, 'revokeObjectURL')
    scheduleMock.mockReturnValue({ promise: Promise.resolve(makeResult()), cancel: vi.fn() })
    const { api, wrapper } = mountPreview()

    await nextTick()
    await vi.waitFor(() => expect(api().previewUrl.value).toBeTruthy())
    const url = api().previewUrl.value!

    wrapper.unmount()
    expect(revokeSpy).toHaveBeenCalledWith(url)
  })

  it('cancels the in-flight job on unmount', async () => {
    const cancel = vi.fn()
    scheduleMock.mockReturnValue({ promise: new Promise(() => {}), cancel })
    const { wrapper } = mountPreview()

    await nextTick()
    wrapper.unmount()
    expect(cancel).toHaveBeenCalledTimes(1)
  })
})
