import Phaser from 'phaser'
import { bridge } from '@/world/bridge'
import {
  GROUND,
  OBJECTS,
  MAP_W,
  MAP_H,
  TILE,
  SPAWN,
  BUILDINGS,
  NPCS,
  type Building,
  type NpcSpec,
} from '@/world/map/city'
import { createNpc } from '@/world/entities/npc'
import {
  addPlayerAnimations,
  createPlayer,
  updatePlayer,
  type PlayerSprite,
} from '@/world/entities/player'

type NpcInstance = { spec: NpcSpec; sprite: ReturnType<typeof createNpc> }
type DoorZone = { building: Building; zone: Phaser.GameObjects.Zone }

/**
 * The city. Two array-data layers off one tilesheet: ground (walkable) and
 * objects (buildings, water, trees — all solid). Doorways are cut back out of
 * the object layer; an overlap zone on each one calls bridge.enterBuilding().
 * NPCs stand in fixed spots — walk up and press E to bridge.talkTo() them.
 *
 * Everything past this scene goes through world/bridge.ts.
 */
export class CityScene extends Phaser.Scene {
  private player!: PlayerSprite
  private cursors!: Phaser.Types.Input.Keyboard.CursorKeys
  private wasd!: Record<'W' | 'A' | 'S' | 'D', Phaser.Input.Keyboard.Key>
  private interact!: Phaser.Input.Keyboard.Key

  private doors: DoorZone[] = []
  private npcs: NpcInstance[] = []
  private labels: Phaser.GameObjects.Text[] = []
  private hint!: Phaser.GameObjects.Text
  private nearbyNpc: NpcSpec | null = null
  /** true from stepping on a door until stepping clear of every door again */
  private doorLocked = false

  constructor() {
    super('city')
  }

  create() {
    const groundMap = this.make.tilemap({ data: GROUND, tileWidth: TILE, tileHeight: TILE })
    const groundSet = groundMap.addTilesetImage('tiles', 'tiles')!
    groundMap.createLayer(0, groundSet, 0, 0)

    const objectMap = this.make.tilemap({ data: OBJECTS, tileWidth: TILE, tileHeight: TILE })
    const objectSet = objectMap.addTilesetImage('tiles', 'tiles')!
    const objectLayer = objectMap.createLayer(0, objectSet, 0, 0)!
    objectLayer.setCollisionByExclusion([-1])
    objectLayer.setDepth(5)

    const worldW = MAP_W * TILE
    const worldH = MAP_H * TILE

    addPlayerAnimations(this)
    // step 7: restore player.position from the save instead of SPAWN
    this.player = createPlayer(this, SPAWN.x * TILE + TILE / 2, SPAWN.y * TILE + TILE / 2)

    this.physics.world.setBounds(0, 0, worldW, worldH)
    this.player.setCollideWorldBounds(true)
    this.physics.add.collider(this.player, objectLayer)

    // --- doors ---
    this.doors = BUILDINGS.map((building) => {
      const zone = this.add.zone(
        building.door.x * TILE + TILE / 2,
        building.door.y * TILE + TILE / 2,
        TILE,
        TILE,
      )
      this.physics.add.existing(zone, true)
      return { building, zone }
    })
    this.physics.add.overlap(
      this.player,
      this.doors.map((d) => d.zone),
      (_player, zoneObj) => this.enterDoor(zoneObj as Phaser.GameObjects.Zone),
    )

    // --- people ---
    this.npcs = NPCS.map((spec) => ({ spec, sprite: createNpc(this, spec) }))
    this.physics.add.collider(
      this.player,
      this.npcs.map((n) => n.sprite),
    )

    // --- labels + interaction hint (colours and font from styles/index.css) ---
    const css = getComputedStyle(document.documentElement)
    const ink = css.getPropertyValue('--color-ink').trim() || '#ffffff'
    const gold = css.getPropertyValue('--color-marigold').trim() || '#f2a73b'
    const night = css.getPropertyValue('--color-night').trim() || '#000000'
    const FONT = '"Silkscreen", monospace'

    this.labels = BUILDINGS.map((b) =>
      this.add
        .text(b.label.x * TILE + TILE / 2, b.label.y * TILE - 2, b.name, {
          fontFamily: FONT,
          fontSize: '8px',
          color: ink,
        })
        .setOrigin(0.5, 1)
        .setDepth(20)
        .setStroke(night, 3),
    )
    this.hint = this.add
      .text(0, 0, 'E', { fontFamily: FONT, fontSize: '10px', color: gold })
      .setOrigin(0.5, 1)
      .setDepth(25)
      .setStroke(night, 4)
      .setVisible(false)

    // the pixel font may still be loading — re-render text once it is ready
    document.fonts?.ready.then(() => {
      if (!this.scene?.isActive()) return
      this.labels.forEach((l) => l.setFontFamily(FONT))
      this.hint.setFontFamily(FONT)
    })

    // --- camera ---
    const cam = this.cameras.main
    cam.setBounds(0, 0, worldW, worldH)
    cam.setZoom(2)
    cam.startFollow(this.player, true, 0.15, 0.15)
    cam.setDeadzone(40, 30)

    // --- input ---
    const kb = this.input.keyboard!
    this.cursors = kb.createCursorKeys()
    this.wasd = {
      W: kb.addKey(Phaser.Input.Keyboard.KeyCodes.W),
      A: kb.addKey(Phaser.Input.Keyboard.KeyCodes.A),
      S: kb.addKey(Phaser.Input.Keyboard.KeyCodes.S),
      D: kb.addKey(Phaser.Input.Keyboard.KeyCodes.D),
    }
    this.interact = kb.addKey(Phaser.Input.Keyboard.KeyCodes.E)
    kb.addCapture(['UP', 'DOWN', 'LEFT', 'RIGHT', 'W', 'A', 'S', 'D', 'E', 'SPACE'])
  }

  update() {
    updatePlayer(this.player, this.cursors, this.wasd)
    this.updateDoorLock()
    this.updateNpcHint()
  }

  private enterDoor(zone: Phaser.GameObjects.Zone) {
    if (this.doorLocked || bridge.isPaused()) return
    const hit = this.doors.find((d) => d.zone === zone)
    if (!hit) return
    this.doorLocked = true
    bridge.enterBuilding(hit.building.id)
    // step back onto the pavement, so leaving drops you on the doorstep
    const d = hit.building.door
    this.player.setPosition((d.x + 0.5) * TILE, (d.y + 1.5) * TILE)
    this.player.body.stop()
  }

  private updateDoorLock() {
    if (!this.doorLocked) return
    const onDoor = this.doors.some((d) => this.physics.overlap(this.player, d.zone))
    if (!onDoor) this.doorLocked = false
  }

  private updateNpcHint() {
    if (bridge.isPaused()) {
      this.hint.setVisible(false)
      this.nearbyNpc = null
      return
    }

    let nearest: NpcInstance | null = null
    let nearestDist = Infinity
    for (const n of this.npcs) {
      const dist = Phaser.Math.Distance.Between(
        this.player.x,
        this.player.y,
        n.sprite.x,
        n.sprite.y,
      )
      if (dist < nearestDist) {
        nearestDist = dist
        nearest = n
      }
    }

    if (nearest && nearestDist <= TILE * 1.6) {
      this.nearbyNpc = nearest.spec
      this.hint.setPosition(nearest.sprite.x, nearest.sprite.y - TILE + 2).setVisible(true)
    } else {
      this.nearbyNpc = null
      this.hint.setVisible(false)
    }

    const pressed =
      Phaser.Input.Keyboard.JustDown(this.interact) ||
      Phaser.Input.Keyboard.JustDown(this.cursors.space)
    if (this.nearbyNpc && pressed) bridge.talkTo(this.nearbyNpc.id)
  }
}
