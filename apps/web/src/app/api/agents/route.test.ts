import { describe, it, expect } from 'vitest'
import { GET } from './route'

describe('/api/agents', () => {
  describe('GET', () => {
    it('should return a list of available agents', async () => {
      const response = await GET()
      expect(response.status).toBe(200)
      
      const data = await response.json()
      expect(data).toHaveProperty('agents')
      expect(Array.isArray(data.agents)).toBe(true)
      expect(data.agents.length).toBeGreaterThan(0)
    })

    it('should return agents with correct metadata structure', async () => {
      const response = await GET()
      const data = await response.json()
      
      expect(data.agents).toEqual(
        expect.arrayContaining([
          expect.objectContaining({
            id: expect.any(String),
            name: expect.any(String),
            description: expect.any(String),
          })
        ])
      )
    })

    it('should include all expected agents', async () => {
      const response = await GET()
      const data = await response.json()
      
      const agentIds = data.agents.map((agent: any) => agent.id)
      expect(agentIds).toContain('memory-agent')
      expect(agentIds).toContain('react-agent')
      expect(agentIds).toContain('research-agent')
      expect(agentIds).toContain('retrieval-agent')
    })

    it('should return consistent response format', async () => {
      const response = await GET()
      const data = await response.json()
      
      expect(data).toEqual({
        agents: expect.any(Array),
        count: expect.any(Number),
      })
      
      expect(data.count).toBe(data.agents.length)
    })
  })
}) 