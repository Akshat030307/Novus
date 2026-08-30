import Phaser from 'phaser'
import { TILE, type NpcSpec } from '@/world/map/city'

export type { NpcSpec }

/**
 * A person standing in a fixed spot. Solid, so the player walks up to them
 * rather than through them. Step 12 gives them dialogue trees and biases;
 * here they just open the box.
 */
export function createNpc(scene: Phaser.Scene, spec: NpcSpec) {
  const sprite = scene.physics.add.sprite(
    spec.x * TILE + TILE / 2,
    spec.y * TILE + TILE / 2,
    'tiles',
    spec.frame,
  )
  sprite.setOrigin(0.5, 0.75)
  sprite.setImmovable(true)
  sprite.body.moves = false
  sprite.body.setSize(10, 8).setOffset(3, 8)
  sprite.setDepth(10)
  return sprite
}
