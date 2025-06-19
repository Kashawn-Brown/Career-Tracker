import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest'
import MockAdapter from 'axios-mock-adapter'
import apiClient from '@/lib/api-client'
import * as tokenUtils from '@/lib/utils/token'

// Mock the logger to avoid console output during tests
vi.mock('@/lib/utils/logger', () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
  logApiEvent: vi.fn(),
}))

// Mock token utilities
vi.mock('@/lib/utils/token', () => ({
  getAuthToken: vi.fn(),
  clearAuthToken: vi.fn(),
  hasAuthToken: vi.fn(),
}))

describe('API Client Tests', () => {
  let mockAxios: MockAdapter

  beforeEach(() => {
    // Create a fresh mock adapter for each test
    mockAxios = new MockAdapter(apiClient)
    vi.clearAllMocks()
  })

  afterEach(() => {
    mockAxios.restore()
  })

  describe('Successful API Responses', () => {
    it('should handle 200 responses correctly', async () => {
      const responseData = { success: true, data: { id: 1, name: 'Test' } }
      mockAxios.onGet('/test').reply(200, responseData)

      const response = await apiClient.get('/test')

      expect(response.status).toBe(200)
      expect(response.data).toEqual(responseData)
    })

    it('should include auth token in requests when available', async () => {
      const mockToken = 'token-123'
      vi.mocked(tokenUtils.getAuthToken).mockReturnValue(mockToken)
      
      mockAxios.onGet('/test').reply(200, { success: true })

      await apiClient.get('/test')

      expect(mockAxios.history.get[0].headers?.Authorization).toBe(`Bearer ${mockToken}`)
    })

    it('should handle requests without auth token', async () => {
      vi.mocked(tokenUtils.getAuthToken).mockReturnValue(null)
      
      mockAxios.onGet('/test').reply(200, { success: true })

      await apiClient.get('/test')

      expect(mockAxios.history.get[0].headers?.Authorization).toBeUndefined()
    })
  })

  describe('Error Response Handling', () => {
    it('should handle 400 Bad Request errors', async () => {
      const errorResponse = { 
        message: 'Bad Request', 
        errors: ['Field is required'] 
      }
      mockAxios.onGet('/test').reply(400, errorResponse)

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(400)
        expect(error.data).toEqual(errorResponse)
      }
    })

    it('should handle 401 Unauthorized and clear auth token', async () => {
      mockAxios.onGet('/test').reply(401, { message: 'Unauthorized' })

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(401)
        expect(tokenUtils.clearAuthToken).toHaveBeenCalled()
      }
    })

    it('should handle 403 Forbidden errors', async () => {
      mockAxios.onGet('/test').reply(403, { message: 'Forbidden' })

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(403)
        expect(error.data.message).toBe('Forbidden')
      }
    })

    it('should handle 404 Not Found errors', async () => {
      mockAxios.onGet('/test').reply(404, { message: 'Not Found' })

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(404)
        expect(error.data.message).toBe('Not Found')
      }
    })

    it('should handle 500 Internal Server Error', async () => {
      mockAxios.onGet('/test').reply(500, { message: 'Internal Server Error' })

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(500)
        expect(error.data.message).toBe('Internal Server Error')
      }
    })

    it('should handle network errors', async () => {
      mockAxios.onGet('/test').networkError()

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.message).toBe('Network Error')
      }
    })
  })

  describe('429 Rate Limiting Recognition', () => {
    it('should handle 429 responses correctly (without retry testing)', async () => {
      mockAxios.onGet('/test').reply(429, { message: 'Too Many Requests' })

      try {
        await apiClient.get('/test')
        expect.fail('Should have thrown an error')
      } catch (error: any) {
        expect(error.status).toBe(429)
        expect(error.data.message).toBe('Too Many Requests')
      }
    })
  })

  describe('API Logging Integration', () => {
    it('should log successful API requests', async () => {
      const { logApiEvent } = await import('@/lib/utils/logger')
      mockAxios.onGet('/test').reply(200, { success: true })

      await apiClient.get('/test')

      expect(logApiEvent).toHaveBeenCalled()
    })

    it('should log API errors', async () => {
      const { logApiEvent } = await import('@/lib/utils/logger')
      mockAxios.onGet('/test').reply(500, { message: 'Server Error' })

      try {
        await apiClient.get('/test')
      } catch (error) {
        expect(logApiEvent).toHaveBeenCalled()
      }
    })
  })
}) 