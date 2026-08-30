import Phaser from 'phaser'

/** Kenney RPG Urban Pack — see public/assets/LICENCES.md */
const TILESHEET = '/assets/kenney_rpg-urban-pack/Tilemap/tilemap_packed.png'

/**
 * Loads the tilesheet, then hands off to CityScene. One image, sliced 16x16,
 * used both as the tilemap tileset and as the player's frames. A real loading
 * bar can grow here later; the pack is ~20 KB and loads instantly.
 */
export class BootScene extends Phaser.Scene {
  constructor() {
    super('boot')
  }

  preload() {
    this.load.spritesheet('tiles', TILESHEET, { frameWidth: 16, frameHeight: 16 })
  }

  create() {
    this.scene.start('city')
  }
}
