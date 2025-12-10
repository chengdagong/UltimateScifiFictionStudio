
import { FrameworkDefinition } from '../types';

export interface WorldPreset {
  id: string;
  name: string;
  description: string;
  frameworkId: string; // The recommended framework ID
  scenarioPrompt: string; // The core instruction to the AI
}

export const WORLD_PRESETS: WorldPreset[] = [
  {
    id: 'french_revolution',
    name: '法国大革命 (1789-1799)',
    description: '从旧制度的崩溃到拿破仑的崛起。涵盖三级会议、攻占巴士底狱、恐怖统治及热月政变整个时期。',
    frameworkId: 'general',
    scenarioPrompt: '设定为1789年至1799年的法国大革命时期。请构建一个跨越这10年的动态社会模型。\n\n关键要求：\n1. 包含随时间消亡的实体（如路易十六、吉伦特派）和随时间崛起的实体（如拿破仑、救国委员会）。请务必设置 validFrom 和 validTo。\n2. 描述人物身份的转变（例如罗伯斯庇尔从“激进律师”变为“独裁者”），使用 entityStates 记录不同年份的状态。\n3. 描述盟友关系的破裂（例如丹东与罗伯斯庇尔从战友变为政敌），使用 relationships 的 validFrom/validTo 表达关系的变化。\n\n重点关注：第三等级、雅各宾派、保皇党、无套裤汉。'
  },
  {
    id: 'ww2_usa',
    name: '二战时的美国 (1941-1945)',
    description: '从珍珠港事件到日本投降。展示美国社会如何完全转变为战争机器，以及战后的社会变化。',
    frameworkId: 'general',
    scenarioPrompt: '设定为1941年至1945年的美国本土社会。请构建一个展示战争动员全过程的模型。\n\n关键要求：\n1. 实体应体现战时特有的组织（如战时生产委员会）及其解散。\n2. 描述家庭结构的变化（男性参军、女性进入工厂），使用 entityStates 记录。\n3. 种族关系在军队和工厂中的演变。\n4. 政府对微观家庭的影响变化（从征兵开始到战后复员）。'
  },
  {
    id: 'three_kingdoms',
    name: '三国赤壁前后 (200-220)',
    description: '从官渡之战到汉朝灭亡。群雄割据走向三国鼎立的关键时期。',
    frameworkId: 'general',
    scenarioPrompt: '设定为公元200年（官渡之战）到220年（曹丕篡汉）的中国历史时期。\n\n关键要求：\n1. 展现势力的兴衰（如袁绍势力的消亡，刘备势力的流亡与壮大）。\n2. 记录关键人物的阵营变化（如谋士的跳槽、将领的投降），通过 relationships 的时间段来体现。\n3. 记录关键时间点（200年官渡、208年赤壁、219年襄樊）的人物状态变化。'
  },
  {
    id: 'cyberpunk_2077',
    name: '赛博朋克夜之城 (2076-2077)',
    description: '巨型企业战争爆发前夕到传奇陨落。',
    frameworkId: 'general',
    scenarioPrompt: '设定为2076年至2077年的夜之城。\n\n关键要求：\n1. 描述巨型企业（荒坂、军用科技）之间的冷战到热战的变化。\n2. 描述边缘行者团队的组建与覆灭（设置 validTo）。\n3. 展现赛博精神病的高发期和社会压迫的加剧。'
  }
];
