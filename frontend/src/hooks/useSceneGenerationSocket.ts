import { useEffect, useRef } from 'react'
import { io, Socket } from 'socket.io-client'
import { logger } from '../utils/logger'

const SOCKET_URL = process.env.VITE_SCENE_GENERATION_SERVICE_URL || 'http://localhost:3001'

export interface SceneGenerationSocketEvents {
  progress: (data: { generationId: string; progress: number; phase: string }) => void
  'phase-change': (data: { generationId: string; phase: string; progress: number }) => void
  'scene-complete': (data: { generationId: string; sceneId: string; sceneUrl: string }) => void
  'generation-complete': (data: { generationId: string; resultUrl: string }) => void
  error: (data: { generationId: string; error: string }) => void
}

export function useSceneGenerationSocket(
  generationId: string | undefined,
  callbacks: Partial<SceneGenerationSocketEvents>
) {
  const socketRef = useRef<Socket | null>(null)

  useEffect(() => {
    if (!generationId) {
      return
    }

    // Connect to Socket.IO server
    const socket = io(`${SOCKET_URL}/scene-generation`, {
      transports: ['websocket', 'polling'],
      reconnection: true,
      reconnectionDelay: 1000,
      reconnectionAttempts: 5,
    })

    socketRef.current = socket

    socket.on('connect', () => {
      logger.info('Connected to scene generation socket')
      // Join generation room
      socket.emit('join-generation', generationId)
    })

    socket.on('disconnect', () => {
      logger.info('Disconnected from scene generation socket')
    })

    socket.on('connect_error', (error) => {
      logger.error({ error }, 'Socket connection error')
    })

    // Register event listeners
    if (callbacks.progress) {
      socket.on('progress', callbacks.progress)
    }

    if (callbacks['phase-change']) {
      socket.on('phase-change', callbacks['phase-change'])
    }

    if (callbacks['scene-complete']) {
      socket.on('scene-complete', callbacks['scene-complete'])
    }

    if (callbacks['generation-complete']) {
      socket.on('generation-complete', callbacks['generation-complete'])
    }

    if (callbacks.error) {
      socket.on('error', callbacks.error)
    }

    // Cleanup
    return () => {
      if (socketRef.current) {
        socketRef.current.emit('leave-generation', generationId)
        socketRef.current.disconnect()
        socketRef.current = null
      }
    }
  }, [generationId, callbacks])

  return socketRef.current
}

