import { NextResponse } from 'next/server'
import { agentMetadata } from '@repo/core/src/agents/metadata'

export async function GET() {
  try {
    // Transform the metadata into the expected response format
    const agents = Object.entries(agentMetadata).map(([id, metadata]) => ({
      id,
      name: metadata.name,
      description: metadata.description || '',
    }))

    return NextResponse.json({
      agents,
      count: agents.length,
    })
  } catch (error) {
    console.error('Error fetching agents:', error)
    return NextResponse.json(
      { error: 'Failed to fetch agents' },
      { status: 500 }
    )
  }
} 