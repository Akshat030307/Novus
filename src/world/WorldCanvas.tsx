import { useEffect, useRef } from 'react'
import Phaser from 'phaser'
import { BootScene } from '@/world/scenes/BootScene'
import { CityScene } from '@/world/scenes/CityScene'

/**
 * The box the city lives in. Phaser owns everything inside it and talks to the
 * rest of the app only through world/bridge.ts.
 *
 * The game instance lives in a ref and is destroyed on unmount. React strict
 * mode runs effects twice in dev, so the guard and the cleanup both matter —
 * without them you get two canvases stacked on top of each other.
 */
export function WorldCanvas() {
  const hostRef = useRef<HTMLDivElement>(null)
  const gameRef = useRef<Phaser.Game | null>(null)

  useEffect(() => {
    if (gameRef.current || !hostRef.current) return

    gameRef.current = new Phaser.Game({
      type: Phaser.AUTO,
      parent: hostRef.current,
      transparent: true,
      pixelArt: true,
      roundPixels: true,
      scale: {
        mode: Phaser.Scale.RESIZE,
        width: '100%',
        height: '100%',
      },
      physics: {
        default: 'arcade',
        arcade: { gravity: { x: 0, y: 0 } },
      },
      scene: [BootScene, CityScene],
    })

    return () => {
      gameRef.current?.destroy(true)
      gameRef.current = null
    }
  }, [])

  return <div ref={hostRef} className="absolute inset-0" />
}
