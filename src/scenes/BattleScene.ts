import Phaser from "phaser";
import { Unit } from "../classes/Unit";
import findPath from "../utils/findPath";
import { Npc } from "../classes/Npc";
import { Player } from "../classes/Player";
import { Spell } from "../classes/Spell";
import { UIScene } from "./UIScene";
import isVisible from "../utils/lineOfSight";
import { EffectOverTime } from "../classes/EffectOverTime";

// Store a tile and the path to it
interface TilePath {
  pos: Phaser.Math.Vector2;
  path: Phaser.Math.Vector2[];
}

export class BattleScene extends Phaser.Scene {
  player!: Unit;
  allies: Unit[] = [];
  enemies: Unit[] = [];
  clickedTile!: Phaser.Tilemaps.Tile | null;
  tileWidth!: number;
  tileHeight!: number;
  map!: Phaser.Tilemaps.Tilemap;
  direction!: string;
  tileset!: Phaser.Tilemaps.Tileset | null;
  obstacles!: Phaser.Tilemaps.TilemapLayer | null;
  background!: Phaser.Tilemaps.TilemapLayer | null;
  turnIndex: number = 0;
  timeline: Unit[] = [];
  isPlayerTurn: boolean = true;
  accessibleTiles: TilePath[] = [];
  spellVisible: boolean = false;
  spellRange: Phaser.Tilemaps.Tile[] = [];
  currentSpell!: Spell;
  uiScene!: UIScene;
  overlays: Phaser.GameObjects.Rectangle[] = [];
  spellAoeOverlay: Phaser.GameObjects.Rectangle[] = [];
  pathOverlay: Phaser.GameObjects.Rectangle[] = [];

  constructor() {
    super({
      key: "BattleScene",
    });
  }

  init(params: any): void {}

  preload(): void {}

  create(): void {
    // create tilemap and get tile dimensions
    this.map = this.make.tilemap({ key: "battlemap" });
    this.tileWidth = this.map.tileWidth;
    this.tileHeight = this.map.tileHeight;

    // get the tileset
    this.tileset = this.map.addTilesetImage("forest_tilemap", "tiles");

    // create layers and characters sprites
    this.background = this.map.createLayer(
      "calque_background",
      this.tileset!,
      0,
      0
    );
    this.obstacles = this.map.createLayer(
      "calque_obstacles",
      this.tileset!,
      0,
      0
    );

    // create spells
    const javelin = new Spell(
      42,
      1,
      5,
      3,
      "Deadly Javelin",
      true,
      true,
      0,
      0,
      2,
      0,
      0,
      0,
      "line",
      3,
      0,
      new EffectOverTime("Poison", 44, 2, 10, 1, 1, 0, 0, 0),
      null,
      4
    );
    const punch = new Spell(51, 1, 1, 2, "Punch", true, false, 55);
    const sting = new Spell(
      60,
      4,
      12,
      2,
      "Sting",
      false,
      false,
      15,
      1,
      1,
      0,
      0,
      0,
      "monoTarget",
      0,
      3
    );

    // define summoned unit
    const summonedFrame = 3;
    const summoned = new Unit(this, 0, 0, "player", 3, 0, 0, 3, 6, 50, true);
    summoned.type = "Princess";
    summoned.addSpells(sting);
    this.createAnimations(summonedFrame, 5, "Princess");

    const heal = new Spell(
      69,
      0,
      8,
      3,
      "Herbal medicine",
      true,
      false,
      0,
      0,
      0,
      20,
      1,
      1,
      "star",
      1,
      0,
      null,
      summoned
    );

    // add units
    // starting position (grid index)
    let playerStartX = 17;
    let playerStartY = 6;
    let playerFrame = 6;
    this.player = this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      5,
      6,
      100,
      "Amazon",
      false,
      true,
      javelin,
      heal,
      sting
    );
    // create player animations with base sprite and framerate
    this.createAnimations(playerFrame, 5, "Amazon");

    // ally 1
    playerStartX = 18;
    playerStartY = 7;
    playerFrame = 0;
    this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      "Dude",
      true,
      true,
      sting
    );
    this.createAnimations(playerFrame, 5, "Dude");
    // ally 2
    playerStartX = 13;
    playerStartY = 2;
    playerFrame = 0;
    this.addUnit(
      "player",
      playerFrame,
      playerStartX,
      playerStartY,
      3,
      6,
      100,
      "Dude",
      true,
      true,
      sting
    );
    // enemy 1
    let enemyStartX = 14;
    let enemyStartY = 2;
    let enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    // enemy 2
    enemyStartX = 18;
    enemyStartY = 6;
    enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    // enemy 3
    enemyStartX = 17;
    enemyStartY = 3;
    enemyFrame = 30;
    this.addUnit(
      "player",
      enemyFrame,
      enemyStartX,
      enemyStartY,
      3,
      6,
      100,
      "Snowman",
      true,
      false,
      javelin
    );
    this.createAnimations(enemyFrame, 5, "Snowman");

    // layer for tall items appearing on top of the player like trees
    let overPlayer = this.map.createLayer(
      "calque_devant_joueur",
      this.tileset!,
      0,
      0
    );
    // always on top
    overPlayer?.setDepth(9999);
    // transparent to see player beneath tall items
    overPlayer?.setAlpha(0.5);

    // camera settings
    const zoom = 2;
    this.cameras.main.setZoom(zoom);
    this.cameras.main.setBounds(
      0,
      0,
      this.map.widthInPixels,
      this.map.heightInPixels
    );
    this.cameras.main.roundPixels = true;

    // game grid
    this.add.grid(
      0,
      0,
      this.map.widthInPixels * zoom,
      this.map.heightInPixels * zoom,
      this.map.tileWidth,
      this.map.tileHeight,
      0xffffff,
      0,
      0x000000,
      0.1
    );

    // on clicking on a tile
    this.input.on(
      Phaser.Input.Events.POINTER_UP,
      (pointer: Phaser.Input.Pointer) => {
        // continue only if player turn and not already moving
        if (!this.player.isMoving && this.isPlayerTurn) {
          const { worldX, worldY } = pointer;

          const targetVec = this.background!.worldToTileXY(worldX, worldY);

          // if in spell mode
          if (this.spellVisible) {
            // if cliked outside spell range, deselect spell
            if (
              !this.spellRange.some((tile) => {
                return tile.x == targetVec.x && tile.y == targetVec.y;
              })
            ) {
              this.clearSpellRange();
            }
          }
        }
      }
    );

    // create the timeline
    this.timeline = createTimeline(this.allies, this.enemies);

    // highlight the accessible tiles around the player
    let playerPos = new Phaser.Math.Vector2(this.player.indX, this.player.indY);
    this.accessibleTiles = this.calculateAccessibleTiles(
      playerPos,
      this.player.pm
    );
    this.highlightAccessibleTiles(this.accessibleTiles);

    // remember to clean up on Scene shutdown
    this.events.on(Phaser.Scenes.Events.SHUTDOWN, () => {
      this.input.off(Phaser.Input.Events.POINTER_UP);
    });

    this.scene.run("UIScene");
    this.uiScene = this.scene.get("UIScene") as UIScene;
  }

  endTurn = () => {
    this.uiScene.endTurn();
    // clear previous player highlight on the timeline
    let prevPlayer = this.timeline[this.turnIndex];
    if (prevPlayer) {
      this.uiScene.uiTimelineBackgrounds[this.turnIndex].fillColor =
        prevPlayer.isAlly ? 0x0000ff : 0xff0000;
    }

    if (this.isPlayerTurn) {
      this.isPlayerTurn = false;
    }

    this.turnIndex++;
    if (this.turnIndex >= this.timeline.length) {
      this.turnIndex = 0;
    }

    const currentPlayer = this.timeline[this.turnIndex];
    this.highlightCurrentUnitInTimeline();
    currentPlayer.playTurn();

    if (currentPlayer instanceof Player) {
      this.startPlayerTurn();
    }
  };

  private startPlayerTurn() {
    this.isPlayerTurn = true;
    this.refreshAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  private highlightCurrentUnitInTimeline() {
    this.uiScene.uiTimelineBackgrounds[this.turnIndex].fillColor = 0xffffff;
  }

  // checks if the unit can access this tile with their remaining PMs
  // if there is a path, return it
  getPathToPosition(
    x: number,
    y: number,
    unitX: number,
    unitY: number,
    pm: number
  ) {
    const startVec = new Phaser.Math.Vector2(unitX, unitY);
    const targetVec = new Phaser.Math.Vector2(x, y);
    // pathfinding
    const path = findPath(
      startVec,
      targetVec,
      this.background!,
      this.obstacles!
    );
    if (path.length > 0 && path.length <= pm) {
      return path;
    } else {
      return false;
    }
  }

  // highlight tiles accessible to the player
  // and make them interactive
  highlightAccessibleTiles = (positions: TilePath[]) => {
    let baseColor = 0xffffff;
    positions.forEach((tilePos) => {
      let tile = this.background?.getTileAt(tilePos.pos.x, tilePos.pos.y);
      // overlay the tile with an interactive transparent rectangle
      let overlay = this.add.rectangle(
        tile.pixelX + 0.5 * tile.width,
        tile.pixelY + 0.5 * tile.height,
        tile.width,
        tile.height,
        baseColor,
        0.4
      );
      overlay.setInteractive();
      this.overlays.push(overlay);

      // on clicking on a tile, move
      overlay.on("pointerup", () => {
        if (!this.player.isMoving) {
          this.player.moveAlong(tilePos.path);
          this.uiScene.refreshUI();
        }
      });
      //on hovering over a tile, display path to it
      overlay.on("pointerover", () => {
        if (!this.player.isMoving) this.highlightPath(tilePos.path);
      });
      overlay.on("pointerout", () => {
        if (!this.player.isMoving) this.clearPathHighlight();
      });
    });
  };

  // highlight tiles on a path
  highlightPath(path: Phaser.Math.Vector2[]) {
    let highlightColor = 0xffffff;
    path.forEach((position) => {
      let pos = this.background!.tileToWorldXY(position.x, position.y);
      this.pathOverlay.push(
        this.add.rectangle(
          pos.x + 0.5 * this.tileWidth,
          pos.y + 0.5 * this.tileHeight,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          0.5
        )
      );
    });
  }

  clearPathHighlight() {
    this.pathOverlay.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.pathOverlay = [];
  }

  // calculate the accessible tiles around a position with a pm radius
  // also store the path to each tile
  calculateAccessibleTiles = (
    pos: Phaser.Math.Vector2,
    pm: number
  ): TilePath[] => {
    const { x, y } = pos;
    let tablePos: TilePath[] = [];
    const tilesAround = this.background?.getTilesWithin(
      x - pm,
      y - pm,
      pm * 2 + 1,
      pm * 2 + 1
    );
    if (tilesAround) {
      tilesAround.forEach((tile) => {
        const isPlayerTile = tile.x == x && tile.y == y;
        const distance = Math.abs(tile.x - pos.x) + Math.abs(tile.y - pos.y);
        let path;
        if (!isPlayerTile && pm >= distance) {
          path = this.getPathToPosition(tile.x, tile.y, x, y, pm);
        }
        if (path) {
          let myPos: TilePath = {
            path: path,
            pos: new Phaser.Math.Vector2(tile.x, tile.y),
          };
          tablePos.push(myPos);
        }
      });
    }
    return tablePos;
  };

  // refresh the accessible tiles around the player
  refreshAccessibleTiles() {
    this.accessibleTiles = this.calculateAccessibleTiles(
      new Phaser.Math.Vector2(this.player.indX, this.player.indY),
      this.player.pm
    );
  }

  // clear highlighted tiles
  clearAccessibleTiles = () => {
    this.clearOverlay();
    this.clearPathHighlight();
  };

  // add a unit to the scene
  addUnit(
    key: string,
    frame: number,
    startX: number,
    startY: number,
    maxPm: number,
    maxPa: number,
    maxHp: number,
    name: string,
    npc: boolean,
    allied: boolean,
    ...spells: Spell[]
  ) {
    let unit: Unit;
    if (npc) {
      unit = new Npc(
        this,
        0,
        0,
        key,
        frame,
        startX,
        startY,
        maxPm,
        maxPa,
        maxHp,
        allied
      );
    } else {
      unit = new Player(
        this,
        0,
        0,
        key,
        frame,
        startX,
        startY,
        maxPm,
        maxPa,
        maxHp,
        allied
      );
    }
    unit.type = name;
    this.add.existing(unit);
    // set player start position
    let initialPlayerX = unit.tilePosToPixelsX();
    let initialPlayerY = unit.tilePosToPixelsY();
    unit.setPosition(initialPlayerX, initialPlayerY);
    const unitScale = 1.5;
    unit.setScale(unitScale);
    if (allied) {
      this.allies.push(unit);
    } else {
      this.enemies.push(unit);
    }
    // add spells
    unit.addSpells.apply(unit, spells);
    // unit is now considered as an obstacle for other units
    this.addToObstacleLayer(new Phaser.Math.Vector2(unit.indX, unit.indY));
    // initialize health bar
    unit.updateHealthBar();
    unit.depth = unit.y;
    // create blue or red circle under unit's feet to identify its team
    unit.createTeamIdentifier(unitScale);
    unit.setInteractive();
    return unit;
  }

  // create a set of animations from a framerate and a base sprite
  createAnimations = (baseSprite: number, framerate: number, name: string) => {
    // animation for 'left' move, we don't need left and right
    // as we will use one and flip the sprite
    this.anims.create({
      key: "left" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 1,
          baseSprite + 10,
          baseSprite + 1,
          baseSprite + 19,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'left attack'
    this.anims.create({
      key: "leftAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 10, baseSprite + 1],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'right'
    this.anims.create({
      key: "right" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 1,
          baseSprite + 10,
          baseSprite + 1,
          baseSprite + 19,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'right attack'
    this.anims.create({
      key: "rightAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 10, baseSprite + 1],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'up'
    this.anims.create({
      key: "up" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [
          baseSprite + 2,
          baseSprite + 11,
          baseSprite + 2,
          baseSprite + 20,
        ],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'up attack'
    this.anims.create({
      key: "upAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 11, baseSprite + 2],
      }),
      frameRate: framerate,
      repeat: 0,
    });
    // animation for 'down'
    this.anims.create({
      key: "down" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite, baseSprite + 9, baseSprite, baseSprite + 18],
      }),
      frameRate: framerate,
      repeat: -1,
    });
    // animation for 'down attack'
    this.anims.create({
      key: "downAttack" + name,
      frames: this.anims.generateFrameNumbers("player", {
        frames: [baseSprite + 9, baseSprite],
      }),
      frameRate: framerate,
      repeat: 0,
    });
  };

  // update position of Unit as an obstacle for the others
  updateObstacleLayer(unit: Unit, target: Phaser.Math.Vector2) {
    this.removeFromObstacleLayer(unit);
    this.addToObstacleLayer(target);
  }

  // remove a unit from the obstacle layer
  removeFromObstacleLayer(unit: Unit) {
    this.obstacles?.removeTileAt(unit.indX, unit.indY);
  }

  removeUnitFromBattle(unit: Unit) {
    this.removeFromObstacleLayer(unit);
    this.removeUnitFromTimeline(unit);
    this.refreshAccessibleTiles();
    if (this.spellVisible) {
      this.displaySpellRange(this.currentSpell);
    }
  }

  // add a position to the obstacle layer
  addToObstacleLayer(target: Phaser.Math.Vector2) {
    let targetTile = this.background?.getTileAt(target.x, target.y);
    let newObstacle = this.obstacles?.putTileAt(
      targetTile!,
      target.x,
      target.y
    );
    newObstacle?.setAlpha(0);
  }

  displaySpellRange(spell: Spell) {
    this.clearAccessibleTiles();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearPointerEvents();

    this.spellVisible = true;
    this.currentSpell = spell;
    this.spellRange = this.calculateSpellRange(this.player, spell);
    this.createAoeZone(spell);
    let baseColor = 0x000099;
    this.spellRange.forEach((tile) => {
      if (tile) {
        // overlay the tile with an interactive transparent rectangle
        let overlay = this.add.rectangle(
          tile.pixelX + 0.5 * tile.width,
          tile.pixelY + 0.5 * tile.height,
          tile.width,
          tile.height,
          baseColor,
          0.4
        );
        overlay.setInteractive();
        this.overlays.push(overlay);
        const pos = new Phaser.Math.Vector2(tile.x, tile.y);

        // on clicking on a tile, launch spell
        overlay.on("pointerup", () => {
          this.player.castSpell(this.currentSpell, pos);
        });
        //on hovering over a tile, display aoe zone
        overlay.on("pointerover", () => {
          this.updateAoeZone(spell, tile.pixelX, tile.pixelY);
        });
        overlay.on("pointerout", () => {
          this.hideAoeZone();
        });

        // we want hover or click on a unit to have the same effect than hover or click on its tile
        const playerOnThisTile = this.getUnitAtPos(tile.x, tile.y);
        if (playerOnThisTile) {
          playerOnThisTile.on("pointerup", () => {
            this.player.castSpell(this.currentSpell, pos);
          });
          playerOnThisTile.on("pointerover", () => {
            this.updateAoeZone(spell, tile.pixelX, tile.pixelY);
          });
          playerOnThisTile.on("pointerout", () => {
            this.hideAoeZone();
          });
        }
      }
    });
  }

  hideAoeZone() {
    this.spellAoeOverlay.forEach((overlay) => {
      overlay.setVisible(false);
    });
  }

  // create aoe zone but doesn't display it yet
  createAoeZone(spell: Spell) {
    const highlightColor = 0xff0099;
    const alpha = 0.6;
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.add.rectangle(
          0,
          0,
          this.tileWidth,
          this.tileHeight,
          highlightColor,
          alpha
        );
        overlay.setVisible(false);
        this.spellAoeOverlay.push(overlay);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        for (let i = -spell.aoeSize; i <= spell.aoeSize; i++) {
          for (let j = -spell.aoeSize; j <= spell.aoeSize; j++) {
            let distance = Math.abs(i) + Math.abs(j);
            if (distance <= spell.aoeSize) {
              const overlay = this.add.rectangle(
                0,
                0,
                this.tileWidth,
                this.tileHeight,
                highlightColor,
                alpha
              );
              overlay.setVisible(false);
              this.spellAoeOverlay.push(overlay);
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.add.rectangle(
            0,
            0,
            this.tileWidth,
            this.tileHeight,
            highlightColor,
            alpha
          );
          overlay.setVisible(false);
          this.spellAoeOverlay.push(overlay);
        }
        break;
      default:
        break;
    }
  }

  // update the position of the aoe zone, when player hovers over tile
  updateAoeZone(spell: Spell, x: number, y: number) {
    switch (spell.aoe) {
      case "monoTarget":
        const overlay = this.spellAoeOverlay[0];
        overlay.x = x + 0.5 * this.tileWidth;
        overlay.y = y + 0.5 * this.tileWidth;
        overlay.setVisible(true);
        break;
      case "star":
        // for the 'star' aoe, we iterate over the tiles within the 'aoeSize' distance from target
        let target = this.background!.worldToTileXY(x, y);
        let k = 0;
        for (
          let i = target.x - spell.aoeSize;
          i <= target.x + spell.aoeSize;
          i++
        ) {
          for (
            let j = target.y - spell.aoeSize;
            j <= target.y + spell.aoeSize;
            j++
          ) {
            let distance = Math.abs(target.x - i) + Math.abs(target.y - j);
            if (distance <= spell.aoeSize) {
              let pos = this.background!.tileToWorldXY(i, j);
              const overlay = this.spellAoeOverlay[k];
              overlay.x = pos.x + 0.5 * this.tileWidth;
              overlay.y = pos.y + 0.5 * this.tileWidth;
              overlay.setVisible(true);
              k++;
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        target = this.background!.worldToTileXY(x, y);
        // true if target is aligned horizontally with player (else we assume it's aligned vertically)
        let isAlignedX = target.y == this.player.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - this.player.indX)
          : Math.sign(target.y - this.player.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          const overlay = this.spellAoeOverlay[i];
          let pos = isAlignedX
            ? this.background!.tileToWorldXY(
                baseIndex + i * isForward,
                target.y
              )
            : this.background!.tileToWorldXY(
                target.x,
                baseIndex + i * isForward
              );
          overlay.x = pos.x + 0.5 * this.tileWidth;
          overlay.y = pos.y + 0.5 * this.tileWidth;
          overlay.setVisible(true);
        }
        break;

      default:
        break;
    }
  }

  clearAoeZone() {
    this.spellAoeOverlay.forEach((spellAoe) => {
      spellAoe.destroy(true);
    });
    this.spellAoeOverlay = [];
  }

  getUnitsInsideAoe(caster: Unit, indX: number, indY: number, spell: Spell) {
    let units = [];
    switch (spell.aoe) {
      case "monoTarget":
        if (this.isUnitThere(indX, indY)) {
          units.push(this.getUnitAtPos(indX, indY));
        }
        break;
      case "star":
        for (let i = indX - spell.aoeSize; i <= indX + spell.aoeSize; i++) {
          for (let j = indY - spell.aoeSize; j <= indY + spell.aoeSize; j++) {
            let distance = Math.abs(indX - i) + Math.abs(indY - j);
            if (distance <= spell.aoeSize) {
              if (this.isUnitThere(i, j)) {
                units.push(this.getUnitAtPos(i, j));
              }
            }
          }
        }
        break;
      case "line":
        // this aoe should only be used with spells cast in a straight line
        let target = { x: indX, y: indY };
        // true if target is aligned horizontally with caster (else we assume it's aligned vertically)
        let isAlignedX = target.y == caster.indY;
        const baseIndex = isAlignedX ? target.x : target.y;
        const isForward = isAlignedX
          ? Math.sign(target.x - caster.indX)
          : Math.sign(target.y - caster.indY);
        for (let i = 0; i < spell.aoeSize; i++) {
          let pos = isAlignedX
            ? {
                x: baseIndex + i * isForward,
                y: target.y,
              }
            : {
                x: target.x,
                y: baseIndex + i * isForward,
              };
          if (this.isUnitThere(pos.x, pos.y)) {
            units.push(this.getUnitAtPos(pos.x, pos.y));
          }
        }
        break;

      default:
        break;
    }
    return units;
  }

  // calculate spell range
  calculateSpellRange(unit: Unit, spell: Spell) {
    return this.background?.filterTiles(
      (tile: Phaser.Tilemaps.Tile) => this.isVisible(unit, spell, tile),
      this,
      unit.indX - spell.maxRange,
      unit.indY - spell.maxRange,
      spell.maxRange * 2 + 1,
      spell.maxRange * 2 + 1
    );
  }

  // return true if tile is visible for a given unit and spell
  isVisible(unit: Unit, spell: Spell, tile: Phaser.Tilemaps.Tile) {
    let startVec = new Phaser.Math.Vector2(unit.indX, unit.indY);
    let targetVec = new Phaser.Math.Vector2(tile.x, tile.y);
    let distance =
      Math.abs(startVec.x - targetVec.x) + Math.abs(startVec.y - targetVec.y);
    if (
      distance <= spell.maxRange &&
      distance >= spell.minRange &&
      (!this.obstacles?.getTileAt(tile.x, tile.y) ||
        this.isUnitThere(tile.x, tile.y))
    ) {
      // if spell doesn't need line of sight we just need to ensure tile isn't an obstacle
      if (!spell.lineOfSight) return true;
      // else we use the line of sight algorithm
      else {
        // case of spells being cast in straight line only
        let isInStraightLine = true;
        if (spell.straightLine) {
          isInStraightLine = unit.indX === tile.x || unit.indY === tile.y;
        }
        return (
          isInStraightLine &&
          isVisible(startVec, targetVec, this.obstacles!, this)
        );
      }
    }
    return false;
  }

  // return true if there is a unit at the specified position
  isUnitThere(x: number, y: number): boolean {
    return this.timeline.some((unit) => unit.indX == x && unit.indY == y);
  }

  // return unit at the specified position
  getUnitAtPos(x: number, y: number) {
    return this.timeline.find((unit) => unit.indX == x && unit.indY == y);
  }

  removeUnitFromTimeline(unit: Unit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit == unit
    );
    if (index !== -1) {
      this.timeline.splice(index, 1);
      if (index <= this.turnIndex) this.turnIndex--;
      if (this.timeline.length > 0) {
        this.uiScene.updateTimeline(this.timeline);
      }
    }
  }

  // add summoned unit after the summoner in the timeline
  addSummonedUnitToTimeline(summoner: Unit, summoned: Unit) {
    const index = this.timeline.findIndex(
      (timelineUnit) => timelineUnit == summoner
    );
    if (index !== -1) {
      this.timeline.splice(index + 1, 0, summoned);
    }
    this.uiScene.updateTimeline(this.timeline);
  }

  clearSpellRange() {
    this.spellVisible = false;
    this.uiScene.clearSpellsHighlight();
    this.clearOverlay();
    this.clearAoeZone();
    this.clearPointerEvents();
    this.clearAccessibleTiles();
    this.highlightAccessibleTiles(this.accessibleTiles);
  }

  clearPointerEvents() {
    this.timeline.forEach((unit) => {
      unit.off("pointerup");
      unit.off("pointerover");
      unit.off("pointerout");
      unit.addHoverEvents();
    });
  }

  clearOverlay() {
    this.overlays.forEach((overlay) => {
      overlay.destroy(true);
    });
    this.overlays = [];
  }

  gameOver() {
    this.scene.stop("UIScene");
    this.scene.start("GameOverScene");
  }
}

// play order : alternate between allies and enemies
let createTimeline = (allies: Unit[], enemies: Unit[]) => {
  const maxSize = Math.max(allies.length, enemies.length);
  let timeline: Unit[] = [];
  for (let i = 0; i < maxSize; i++) {
    if (allies.length > i) {
      timeline.push(allies[i]);
    }
    if (enemies.length > i) {
      timeline.push(enemies[i]);
    }
  }
  return timeline;
};
