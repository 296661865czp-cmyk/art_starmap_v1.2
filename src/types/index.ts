// 感官等级
export type SensoryLevel = 0 | 1 | 2 | 3 | 4;
// 0=无感, 1=微弱, 2=适中, 3=强烈, 4=沉浸

// 感官指纹
export interface SensoryFingerprint {
  hearing: SensoryLevel;    // 听觉
  sight: SensoryLevel;      // 视觉
  touch: SensoryLevel;      // 触觉
  smell: SensoryLevel;      // 嗅觉
  taste: SensoryLevel;      // 味觉
  body: SensoryLevel;       // 体感
  time: SensoryLevel;       // 时间
}

// 艺术领域
export type ArtDomain =
  | 'music'        // 音乐
  | 'painting'     // 绘画
  | 'sculpture'    // 雕塑/建筑
  | 'dance'        // 舞蹈/身体
  | 'literature'   // 文学/诗歌
  | 'flavor'       // 风味艺术
  | 'film'         // 电影/戏剧
  | 'synesthesia'  // 通感
  | 'sports';      // 体育

// Domain 显示名称映射
export const DOMAIN_LABELS: Record<ArtDomain, string> = {
  music: '音乐',
  painting: '绘画',
  sculpture: '雕塑/建筑',
  dance: '舞蹈/身体',
  literature: '文学/诗歌',
  flavor: '风味艺术',
  film: '电影/戏剧',
  synesthesia: '通感',
  sports: '体育',
};

// Domain CSS 变量名映射
export const DOMAIN_COLORS: Record<ArtDomain, string> = {
  music: 'var(--domain-music)',
  painting: 'var(--domain-painting)',
  sculpture: 'var(--domain-sculpture)',
  dance: 'var(--domain-dance)',
  literature: 'var(--domain-literature)',
  flavor: 'var(--domain-flavor)',
  film: 'var(--domain-film)',
  synesthesia: 'var(--domain-synesthesia)',
  sports: 'var(--domain-sports)',
};

// 探索状态
export type ExploreStatus = 'unexplored' | 'next' | 'explored';

// 寻宝图类型
export type TreasureMapType = 'geographic' | 'thematic';

// 寻宝图子项目
export interface TreasureSubItem {
  id: string;
  title: string;
  description: string;
  exploreStatus: ExploreStatus;
}

// 寻宝图探索点
export interface TreasureItem {
  id: string;
  title: string;
  domain: ArtDomain;
  description: string;
  hints: string;
  exploreStatus: ExploreStatus;
  subItems: TreasureSubItem[];
}

// 寻宝图章节
export interface TreasureChapter {
  id: string;
  name: string;
  description: string;
  items: TreasureItem[];
}

// 寻宝图元数据
export interface TreasureMapMeta {
  id: string;
  name: string;
  description: string;
  creator: string;
  version: string;
  type: TreasureMapType;
}

// 寻宝图完整数据
export interface TreasureMapData {
  treasureMap: TreasureMapMeta;
  chapters: TreasureChapter[];
  importedAt?: string;               // 导入时间戳
}

// 藏宝阁藏品记录
export interface CollectionItem {
  id: string;
  title: string;
  domain: ArtDomain;
  description: string;
  sensory: SensoryFingerprint;
  notes: string;                    // 个人笔记
  linkedStars: string[];            // 手动关联的藏品 id 列表
  source: {
    type: 'treasure-map' | 'free';  // 来源类型
    mapId?: string;                 // 来源寻宝图 id
    mapName?: string;               // 来源寻宝图名称
    itemId?: string;                // 来源寻宝图 item id
  };
  createdAt: string;                // ISO 时间戳
}

// 页面路由
export type PageRoute =
  | { page: 'home' }
  | { page: 'treasure-map-list' }
  | { page: 'treasure-map-detail'; mapId: string; chapterId: string }
  | { page: 'collect' }
  | { page: 'vault-list' }
  | { page: 'vault-detail'; collectionId: string }
  | { page: 'feel-impossible' };
