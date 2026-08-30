import Phaser from 'phaser'
import { bridge } from '@/world/bridge'

/** world units per second (the camera then draws at 2x) */
export const PLAYER_SPEED = 90

/** green-shirt character in the Kenney sheet: 4 directions x 3 walk frames */
const FRAMES = {
  left: [23, 50, 77],
  down: [24, 51, 78],
  up: [25, 52, 79],
  right: [26, 53, 80],
} as const

export type Facing = keyof typeof FRAMES

const IDLE_FRAME = FRAMES.down[0]

export function addPlayerAnimations(scene: Phaser.Scene) {
  for (const dir of Object.keys(FRAMES) as Facing[]) {
    const key = `walk-${dir}`
    if (scene.anims.exists(key)) continue
    scene.anims.create({
      key,
      frames: FRAMES[dir].map((frame) => ({ key: 'tiles', frame })),
      frameRate: 8,
      repeat: -1,
    })
  }
}

export function createPlayer(scene: Phaser.Scene, x: number, y: number) {
  const sprite = scene.physics.add.sprite(x, y, 'tiles', IDLE_FRAME)
  sprite.setOrigin(0.5, 0.75) // anchor near the feet
  sprite.body.setSize(10, 8).setOffset(3, 8) // collide on the legs, not the head
  sprite.setDepth(10)
  return sprite
}

export type PlayerSprite = ReturnType<typeof createPlayer>

type Wasd = Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>

/**
 * Arrow keys + WASD -> velocity + animation. Mutates the sprite, returns
 * nothing. Freezes the player whenever a panel is up (`bridge.isPaused()`),
 * so the character does not wander around under an open screen.
 */
export function updatePlayer(
  sprite: PlayerSprite,
  cursors: Phaser.Types.Input.Keyboard.CursorKeys,
  wasd: Wasd,
) {
  const body = sprite.body
  body.setVelocity(0)

  if (bridge.isPaused()) {
    sprite.anims.stop()
    sprite.setFrame(frameForStop(sprite))
    return
  }

  let vx = 0
  let vy = 0
  if (cursors.left.isDown || wasd.A.isDown) vx -= 1
  if (cursors.right.isDown || wasd.D.isDown) vx += 1
  if (cursors.up.isDown || wasd.W.isDown) vy -= 1
  if (cursors.down.isDown || wasd.S.isDown) vy += 1

  if (vx === 0 && vy === 0) {
    sprite.anims.stop()
    sprite.setFrame(frameForStop(sprite))
    return
  }

  const len = Math.hypot(vx, vy)
  body.setVelocity((vx / len) * PLAYER_SPEED, (vy / len) * PLAYER_SPEED)

  const facing: Facing =
    Math.abs(vx) > Math.abs(vy) ? (vx < 0 ? 'left' : 'right') : vy < 0 ? 'up' : 'down'
  sprite.anims.play(`walk-${facing}`, true)
}

/** stand still on the first frame of whatever direction we were facing */
function frameForStop(sprite: PlayerSprite): number {
  const current = sprite.anims.currentAnim?.key
  const dir = (current?.replace('walk-', '') ?? 'down') as Facing
  return FRAMES[dir]?.[0] ?? IDLE_FRAME
}
