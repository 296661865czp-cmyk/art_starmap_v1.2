import Dexie, { type Table } from 'dexie';
import type { TreasureMapData, CollectionItem, ExploreStatus } from '../types';

class ArtStarMapDB extends Dexie {
  treasureMaps!: Table<TreasureMapData, string>;
  collections!: Table<CollectionItem, string>;

  constructor() {
    super('ArtStarMapDB');
    this.version(1).stores({
      treasureMaps: 'treasureMap.id',
      collections: 'id, domain, createdAt',
    });
  }
}

const db = new ArtStarMapDB();

// ─── 寻宝图操作 ───

export async function getAllMaps(): Promise<TreasureMapData[]> {
  return db.treasureMaps.toArray();
}

export async function getMapById(id: string): Promise<TreasureMapData | undefined> {
  return db.treasureMaps.get(id);
}

export async function addMap(map: TreasureMapData): Promise<void> {
  await db.treasureMaps.put(map);
}

export async function deleteMap(id: string): Promise<void> {
  await db.treasureMaps.delete(id);
}

export async function updateItemAndSubsStatus(
  mapId: string,
  itemId: string,
  status: ExploreStatus,
): Promise<void> {
  const map = await db.treasureMaps.get(mapId);
  if (!map) return;

  for (const chapter of map.chapters) {
    for (const item of chapter.items) {
      if (item.id === itemId) {
        item.exploreStatus = status;
        for (const sub of item.subItems) {
          sub.exploreStatus = status;
        }
        await db.treasureMaps.put(map);
        return;
      }
    }
  }
}

export async function updateItemStatus(
  mapId: string,
  itemId: string,
  subItemId: string | null,
  status: ExploreStatus,
): Promise<void> {
  const map = await db.treasureMaps.get(mapId);
  if (!map) return;

  for (const chapter of map.chapters) {
    for (const item of chapter.items) {
      if (subItemId === null && item.id === itemId) {
        item.exploreStatus = status;
        await db.treasureMaps.put(map);
        return;
      }
      for (const sub of item.subItems) {
        if (item.id === itemId && sub.id === subItemId) {
          sub.exploreStatus = status;
          await db.treasureMaps.put(map);
          return;
        }
      }
    }
  }
}

// ─── 藏宝阁操作 ───

export async function getAllCollections(): Promise<CollectionItem[]> {
  return db.collections.toArray();
}

export async function getCollectionById(id: string): Promise<CollectionItem | undefined> {
  return db.collections.get(id);
}

export async function getCollectionByItemId(itemId: string): Promise<CollectionItem | undefined> {
  return db.collections.where('source.itemId').equals(itemId).first();
}

export async function addCollection(item: CollectionItem): Promise<void> {
  await db.collections.put(item);
}

export async function deleteCollection(id: string): Promise<void> {
  await db.collections.delete(id);
}

export async function deleteCollectionWithCleanup(id: string): Promise<void> {
  const collection = await db.collections.get(id);
  if (!collection) return;

  // 如果来源是寻宝图，回退探索状态
  if (collection.source.type === 'treasure-map' && collection.source.mapId && collection.source.itemId) {
    await updateItemAndSubsStatus(collection.source.mapId, collection.source.itemId, 'unexplored');
  }

  // 清理其他藏品中的关联引用
  const allCollections = await db.collections.toArray();
  for (const col of allCollections) {
    if (col.id === id) continue;
    if (col.linkedStars.includes(id)) {
      col.linkedStars = col.linkedStars.filter((sid) => sid !== id);
      await db.collections.put(col);
    }
  }

  await db.collections.delete(id);
}

export async function updateCollectionLinkedStars(
  collectionId: string,
  targetId: string,
  action: 'add' | 'remove',
): Promise<void> {
  const col = await db.collections.get(collectionId);
  const target = await db.collections.get(targetId);
  if (!col || !target) return;

  if (action === 'add') {
    if (!col.linkedStars.includes(targetId)) {
      col.linkedStars.push(targetId);
    }
    if (!target.linkedStars.includes(collectionId)) {
      target.linkedStars.push(collectionId);
    }
  } else {
    col.linkedStars = col.linkedStars.filter((id) => id !== targetId);
    target.linkedStars = target.linkedStars.filter((id) => id !== collectionId);
  }

  await db.collections.bulkPut([col, target]);
}

export async function importCollectionsWithDedupe(
  items: CollectionItem[],
): Promise<{ imported: number; skipped: number }> {
  const existingIds = new Set((await db.collections.toArray()).map((c) => c.id));
  const toImport: CollectionItem[] = [];
  let skipped = 0;

  for (const item of items) {
    if (existingIds.has(item.id)) {
      skipped++;
    } else {
      toImport.push(item);
    }
  }

  if (toImport.length > 0) {
    await db.collections.bulkPut(toImport);
  }

  return { imported: toImport.length, skipped };
}

export async function updateCollection(item: CollectionItem): Promise<void> {
  await db.collections.put(item);
}

// ─── 导入导出 ───

export async function importTreasureMap(json: unknown): Promise<{ duplicate: boolean }> {
  const raw = json as Record<string, unknown>;

  // 兼容旧格式 cities → chapters
  let data: TreasureMapData;
  if (raw.treasureMap && raw.chapters) {
    data = raw as unknown as TreasureMapData;
  } else if (raw.treasureMap && (raw as Record<string, unknown>).cities) {
    data = {
      treasureMap: raw.treasureMap as TreasureMapData['treasureMap'],
      chapters: (raw as Record<string, unknown>).cities as TreasureMapData['chapters'],
    };
  } else {
    throw new Error('无效的寻宝图格式');
  }

  // 补充 type 字段
  if (!data.treasureMap.type) {
    data.treasureMap.type = 'geographic';
  }

  // 记录导入时间
  data.importedAt = new Date().toISOString();

  const existing = await db.treasureMaps.get(data.treasureMap.id);
  if (existing) {
    return { duplicate: true };
  }

  await db.treasureMaps.put(data);
  return { duplicate: false };
}

export async function forceImportMap(json: unknown): Promise<void> {
  const raw = json as Record<string, unknown>;
  let data: TreasureMapData;
  if (raw.treasureMap && raw.chapters) {
    data = raw as unknown as TreasureMapData;
  } else if (raw.treasureMap && (raw as Record<string, unknown>).cities) {
    data = {
      treasureMap: raw.treasureMap as TreasureMapData['treasureMap'],
      chapters: (raw as Record<string, unknown>).cities as TreasureMapData['chapters'],
    };
  } else {
    throw new Error('无效的寻宝图格式');
  }
  if (!data.treasureMap.type) {
    data.treasureMap.type = 'geographic';
  }
  // 记录导入时间
  data.importedAt = new Date().toISOString();
  await db.treasureMaps.put(data);
}

export async function exportCollections(): Promise<CollectionItem[]> {
  return db.collections.toArray();
}

export async function importCollections(items: CollectionItem[]): Promise<void> {
  await db.collections.bulkPut(items);
}

// ─── 首次启动初始化 ───

export async function initPresetMaps(presets: TreasureMapData[]): Promise<void> {
  const count = await db.treasureMaps.count();
  if (count === 0) {
    await db.treasureMaps.bulkPut(presets);
  }
}

// ─── 数据一致性检查 ───

export async function cleanupLinkedStars(): Promise<void> {
  const allCollections = await db.collections.toArray();
  const existingIds = new Set(allCollections.map((c) => c.id));
  let needsUpdate = false;

  for (const col of allCollections) {
    const original = col.linkedStars;
    col.linkedStars = col.linkedStars.filter((id) => existingIds.has(id));
    if (col.linkedStars.length !== original.length) {
      needsUpdate = true;
    }
  }

  if (needsUpdate) {
    await db.collections.bulkPut(allCollections);
  }
}

export default db;
