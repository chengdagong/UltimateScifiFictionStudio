import { GoogleGenAI } from "@google/genai";
import { WorldModel, SocialEntity, EntityCategory, LayerDefinition, StorySegment, FrameworkDefinition, ApiSettings, EntityRelationship, EntityState, StoryAgent, TechNode, TechDependency } from "../types";

/**
 * Initialize Google Client
 */
const getGoogleClient = (settings: ApiSettings) => {
  if (!settings.apiKey) throw new Error("API Key is missing.");
  return new GoogleGenAI({
    apiKey: settings.apiKey,
    baseUrl: settings.baseUrl || undefined
  } as any);
};

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

/**
 * Call OpenAI Compatible API
 */
const callOpenAI = async (settings: ApiSettings, prompt: string, jsonMode: boolean = false, systemInstruction?: string): Promise<string> => {
  if (!settings.apiKey) throw new Error("API Key missing");

  const baseUrl = (settings.baseUrl || "https://openrouter.ai/api/v1").replace(/\/$/, "");
  const url = `${baseUrl}/chat/completions`;

  const messages = [];
  if (systemInstruction) {
    messages.push({ role: "system", content: systemInstruction });
  }
  messages.push({ role: "user", content: prompt });

  const body: any = {
    model: settings.model,
    messages: messages,
    temperature: 0.7,
  };

  if (jsonMode) {
    body.response_format = { type: "json_object" };
  }

  const res = await fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "Authorization": `Bearer ${settings.apiKey}`,
      "HTTP-Referer": typeof window !== 'undefined' ? window.location.origin : '',
      "X-Title": "EcoNarrative Studio"
    },
    body: JSON.stringify(body)
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`OpenAI API Error (${res.status}): ${errText}`);
  }

  const data = await res.json();
  return data.choices?.[0]?.message?.content || "";
};

/**
 * Unified Generator with Retry Logic
 */
const generateText = async (settings: ApiSettings, prompt: string, jsonMode: boolean = false, systemInstruction?: string): Promise<string> => {
  const MAX_RETRIES = 3;
  let lastError: any;

  for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
    try {
      if (settings.provider === 'openai') {
        return await callOpenAI(settings, prompt, jsonMode, systemInstruction);
      } else {
        // Google GenAI SDK
        const ai = getGoogleClient(settings);
        const config: any = {
          temperature: 0.7,
          systemInstruction: systemInstruction
        };
        if (jsonMode) config.responseMimeType = "application/json";

        const response = await ai.models.generateContent({
          model: settings.model,
          contents: prompt,
          config
        });
        return response.text || "";
      }
    } catch (error: any) {
      lastError = error;
      const msg = error.message || JSON.stringify(error);

      // Check for retryable errors (500, 503, RPC failures, XHR errors)
      const isRetryable =
        msg.includes("500") ||
        msg.includes("503") ||
        msg.includes("Rpc failed") ||
        msg.includes("xhr error") ||
        msg.includes("fetch failed");

      if (isRetryable && attempt < MAX_RETRIES - 1) {
        const waitTime = Math.pow(2, attempt) * 1000; // 1s, 2s, 4s
        console.warn(`API Error (Attempt ${attempt + 1}/${MAX_RETRIES}). Retrying in ${waitTime}ms...`, msg);
        await delay(waitTime);
        continue;
      }

      // If not retryable or max retries reached, throw immediately
      throw error;
    }
  }

  throw lastError;
};

const handleApiError = (error: any) => {
  console.error("API Error:", error);
  const msg = error.message || JSON.stringify(error);
  if (msg.includes("Region not supported") || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
    throw new Error("API 错误: Region not supported。请在设置中配置反向代理 (Base URL)。");
  }
  if (msg.includes("500") || msg.includes("Rpc failed")) {
    throw new Error("API 服务暂时不可用 (500 RPC Error)，系统已尝试重试。请稍后再试或检查网络。");
  }
  throw new Error(`生成失败: ${msg.slice(0, 100)}...`);
};

export const generateEntitiesForLayer = async (
  layerDef: LayerDefinition,
  context: string,
  existingCount: number,
  settings: ApiSettings
): Promise<SocialEntity[]> => {
  const categoriesStr = layerDef.allowedCategories.join(', ');

  let prompt = "";
  if (layerDef.isTimeDimension) {
    prompt = `
    世界背景: "${context}"
    
    任务: 为 **${layerDef.title}** 创造 3 个历史事件。
    层级定义: ${layerDef.description}
    
    要求:
    1. 'name': 事件简短标题。
    2. 'description': 包含具体时间和影响。
    3. 'category': 必须是 "event"。
    
    输出 JSON 数组: [{name, description, category}]
    `;
  } else {
    prompt = `
    世界背景: "${context}"
    
    任务: 为 **${layerDef.title}** 创造 3 个社会实体。
    层级定义: ${layerDef.description}
    
    允许的类别 (Category): ${categoriesStr}
    
    要求:
    1. 实体之间要有多样性和对立性。
    2. 'category': 必须从允许的类别中选择一个最合适的 (${categoriesStr})。
    3. 'description': 详细描述及其在社会中的作用。

    输出 JSON 数组: [{name, description, category}]
    `;
  }

  try {
    const rawText = await generateText(settings, prompt, false);

    let data: any[] = [];
    try {
      data = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\[\s*\{[\s\S]*\}\s*\]/);
      if (jsonMatch) data = JSON.parse(jsonMatch[1] || jsonMatch[0]);
    }

    if (!Array.isArray(data)) return [];

    return data.map((item) => ({
      id: crypto.randomUUID(),
      name: item.name,
      description: item.description,
      category: item.category as EntityCategory || (layerDef.isTimeDimension ? EntityCategory.EVENT : EntityCategory.UNKNOWN)
    }));
  } catch (error: any) {
    handleApiError(error);
    return [];
  }
};

export const importWorldFromText = async (
  storyText: string,
  settings: ApiSettings
): Promise<{ context: string, entities: SocialEntity[] }> => {
  const prompt = `
    任务: 分析以下文本，提取世界观背景和社会实体。
    
    【文本内容】
    ${storyText.slice(0, 15000)}

    要求:
    1. 总结一段"世界背景" (context)。
    2. 提取所有关键的社会实体 (人物、组织、地点、物品、事件、信仰等)。
    3. 为每个实体分配一个类别 (category)。
    
    输出严格的 JSON 格式:
    {
      "context": "...",
      "entities": [
        { "name": "...", "description": "...", "category": "..." }
      ]
    }
  `;

  try {
    const rawText = await generateText(settings, prompt, true);
    const result = JSON.parse(rawText || "{}");

    const context = result.context || "导入的世界";
    const rawEntities = Array.isArray(result.entities) ? result.entities : [];

    const entities: SocialEntity[] = rawEntities.map((e: any) => ({
      id: crypto.randomUUID(),
      name: e.name || "未知实体",
      description: e.description || "",
      category: e.category as EntityCategory || EntityCategory.UNKNOWN
    }));

    return { context, entities };

  } catch (error: any) {
    handleApiError(error);
    return { context: "", entities: [] };
  }
};

export const generateWorldFromScenario = async (
  scenarioPrompt: string,
  framework: FrameworkDefinition,
  settings: ApiSettings
): Promise<{
  context: string,
  entities: SocialEntity[],
  relationships: EntityRelationship[],
  entityStates: EntityState[],
  storySegments: StorySegment[],
  technologies: TechNode[],
  techDependencies: TechDependency[]
}> => {

  const layerInstructions = framework.layers.map(layer => {
    return `- 层级: ${layer.title} (${layer.description})\n  允许的类别: ${layer.allowedCategories.join(', ')}`;
  }).join('\n');

  const prompt = `
    任务: 作为一个精通社会解剖学、历史学和科技史的专家，请根据以下剧本设定，构建一个**跨越整个历史时期**的动态社会结构模型和科技树。
    不要只生成一个静态的时间切片，而是要展示出实体和关系随时间的**演变、兴起和消亡**。
    
    【剧本设定与时间跨度】
    ${scenarioPrompt}

    【社会理论框架】
    ${framework.name}: ${framework.description}
    包含以下层级：
    ${layerInstructions}

    【要求】
    1. **Context**: 生成一段宏观的“世界背景”，涵盖整个时期的基调。
    2. **Entities (演变)**: 
       - 为每一个层级生成 3-5 个最具代表性的实体。
       - **ValidFrom/ValidTo**: 务必标注实体的存续时间。
    3. **Relationships (动态)**: 
       - 生成实体之间复杂的社会关系网，并标注关系存续时间。
    4. **EntityStates (快照)**: 
       - 选取历史上 2-3 个关键时间点，生成实体的状态变化描述。
    5. **Timeline (关键事件)**:
       - 生成 5-8 个推动历史发展的关键事件节点 (Story Segments)。
       - 务必列出参与该事件的关键实体的临时ID (participantIds)。
    6. **TechTree (科技树)**:
       - 生成 5-8 个在该历史时期具有决定性影响的技术节点 (TechNode)。
       - **era**: 技术出现的具体时期或年份。
       - **status**: 技术的成熟度 (concept, prototype, production, obsolete)。
       - **dependencies**: 构建技术之间的依赖关系 (e.g. 蒸汽机 -> 铁路)。

    输出严格的 JSON 格式 (不要包含 markdown 代码块标记，只返回纯 JSON):
    {
      "context": "世界观背景描述",
      "entities": [
        { "id": "e1", "name": "...", "description": "...", "category": "...", "validFrom": "...", "validTo": "..." }
      ],
      "relationships": [
        { "sourceId": "e1", "targetId": "e2", "type": "...", "validFrom": "..." }
      ],
      "entityStates": [
        { "entityId": "e1", "timestamp": "...", "description": "..." }
      ],
      "timeline": [
        { "timestamp": "...", "content": "...", "participantIds": ["e1"] }
      ],
      "technologies": [
        { "id": "t1", "name": "...", "description": "...", "era": "...", "type": "civil", "status": "production" }
      ],
      "techDependencies": [
        { "sourceId": "t1", "targetId": "t2" }
      ]
    }
  `;

  try {
    const rawText = await generateText(settings, prompt, true);
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    }

    const context = result.context || "生成的剧本世界";

    // Helper to extract arrays safely
    const getArray = (arr: any) => Array.isArray(arr) ? arr : [];

    const rawEntities = getArray(result.entities);
    const rawRelationships = getArray(result.relationships);
    const rawStates = getArray(result.entityStates);
    const rawTimeline = getArray(result.timeline);
    const rawTech = getArray(result.technologies);
    const rawTechDeps = getArray(result.techDependencies);

    // ID Mapping: Temp ID -> UUID
    const idMap: Record<string, string> = {};
    const techIdMap: Record<string, string> = {};

    const entities: SocialEntity[] = rawEntities.map((e: any) => {
      const realId = crypto.randomUUID();
      if (e.id) idMap[e.id] = realId;
      return {
        id: realId,
        name: e.name || "未知实体",
        description: e.description || "",
        category: e.category as EntityCategory || EntityCategory.UNKNOWN,
        validFrom: e.validFrom,
        validTo: e.validTo
      };
    });

    const relationships: EntityRelationship[] = rawRelationships
      .filter((r: any) => idMap[r.sourceId] && idMap[r.targetId])
      .map((r: any) => ({
        id: crypto.randomUUID(),
        sourceId: idMap[r.sourceId],
        targetId: idMap[r.targetId],
        type: r.type || "相关",
        description: r.description || "",
        timestamp: r.timestamp || undefined,
        validFrom: r.validFrom,
        validTo: r.validTo
      }));

    const entityStates: EntityState[] = rawStates
      .filter((s: any) => idMap[s.entityId])
      .map((s: any) => ({
        id: crypto.randomUUID(),
        entityId: idMap[s.entityId],
        timestamp: s.timestamp || "未知时间",
        description: s.description || ""
      }));

    const storySegments: StorySegment[] = rawTimeline.map((t: any) => ({
      id: crypto.randomUUID(),
      timestamp: t.timestamp || "未知时间",
      content: t.content || "",
      influencedBy: Array.isArray(t.participantIds)
        ? t.participantIds.map((pid: string) => idMap[pid]).filter((id: string) => !!id)
        : []
    }));

    // Process Tech Tree
    const technologies: TechNode[] = rawTech.map((t: any) => {
      const realId = crypto.randomUUID();
      if (t.id) techIdMap[t.id] = realId;
      return {
        id: realId,
        name: t.name || "未命名技术",
        description: t.description || "",
        era: t.era || "Unknown Era",
        type: t.type || 'civil',
        status: t.status || 'concept'
      };
    });

    const techDependencies: TechDependency[] = rawTechDeps
      .filter((d: any) => techIdMap[d.sourceId] && techIdMap[d.targetId])
      .map((d: any) => ({
        id: crypto.randomUUID(),
        sourceId: techIdMap[d.sourceId],
        targetId: techIdMap[d.targetId]
      }));

    return { context, entities, relationships, entityStates, storySegments, technologies, techDependencies };

  } catch (error: any) {
    handleApiError(error);
    return { context: "", entities: [], relationships: [], entityStates: [], storySegments: [], technologies: [], techDependencies: [] };
  }
};

export const executeAgentTask = async (
  agent: StoryAgent,
  taskInstruction: string,
  previousOutput: string,
  model: WorldModel,
  framework: FrameworkDefinition,
  worldContext: string,
  currentTime: string,
  settings: ApiSettings,
  critiqueFeedback?: string
): Promise<string> => {

  // Prepare System Snapshot string
  const systemState = framework.layers.map(layer => {
    const layerEntities = model.entities.filter(e => layer.allowedCategories.includes(e.category));
    const items = layerEntities.map(e => {
      return `- ${e.name} (${e.category}): ${e.description}`;
    }).join("\n");
    return `### ${layer.title}\n${items || "(空)"}`;
  }).join("\n\n");

  let prompt = `
    【当前任务】: ${taskInstruction}
    【当前时间节点】: ${currentTime}
    
    【世界背景】: ${worldContext}
    
    【社会结构参考】:
    ${systemState}

    【前序工作成果 (Input)】:
    ${previousOutput ? previousOutput : "(无前序输出，这是第一步)"}

    请根据你的身份设定 (${agent.role}) 和上述信息执行任务。
    `;

  if (critiqueFeedback) {
    prompt += `
        
        !!! 这是一个重写任务 !!!
        上一轮生成的内容被审查 Agent 拒绝了。
        【审查意见 (Critique)】: ${critiqueFeedback}
        
        请根据审查意见，重新修改或重写内容，务必解决上述指出的问题。
        `;
  }

  try {
    return await generateText(settings, prompt, false, agent.systemPrompt);
  } catch (error: any) {
    handleApiError(error);
    return "";
  }
};

export const executeReviewTask = async (
  agent: StoryAgent,
  contentToReview: string,
  criteria: string,
  model: WorldModel,
  framework: FrameworkDefinition,
  worldContext: string,
  settings: ApiSettings
): Promise<{ verdict: 'PASS' | 'FAIL', feedback: string }> => {

  const prompt = `
    【任务目标】: 你是审查员。请审查以下生成的文本内容。
    【审查标准 (Criteria)】: ${criteria}
    
    【待审查内容】:
    ${contentToReview}
    
    请严格判断内容是否符合标准。
    
    输出必须是严格的 JSON 格式:
    {
      "verdict": "PASS" 或 "FAIL",
      "feedback": "如果不通过，请给出具体的修改建议；如果通过，请给出简短的赞赏。"
    }
    `;

  try {
    const rawText = await generateText(settings, prompt, true, agent.systemPrompt);
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    }

    return {
      verdict: result.verdict === 'PASS' ? 'PASS' : 'FAIL',
      feedback: result.feedback || "无反馈"
    };
  } catch (error: any) {
    handleApiError(error);
    return { verdict: 'FAIL', feedback: "审查过程发生错误" };
  }
};

export const generateStorySegment = async (
  model: WorldModel,
  framework: FrameworkDefinition,
  timeSetting: string,
  previousStory: string,
  context: string,
  positiveInstructions: string,
  negativeInstructions: string,
  settings: ApiSettings
): Promise<string> => {
  return "";
};

export const generateWorldChronicle = async (
  model: WorldModel,
  framework: FrameworkDefinition,
  storySegments: StorySegment[],
  context: string,
  settings: ApiSettings
): Promise<string> => {
  const entitiesDigest = framework.layers.map(layer => {
    const layerEntities = model.entities.filter(e => layer.allowedCategories.includes(e.category));
    const items = layerEntities.map(e => `- ${e.name} (${e.category}): ${e.description}`).join('\n');
    return `### ${layer.title}\n${items || "(无记载)"}`;
  }).join('\n\n');

  const historyDigest = storySegments.map((s, i) => {
    return `[时间点 ${i + 1}: ${s.timestamp}]\n${s.content}`;
  }).join('\n\n');

  const prompt = `
    角色: 你是一位深刻的历史学家，擅长从社会结构演变（${framework.name}）的角度剖析历史。

    【世界背景】
    ${context}

    【社会结构 (${framework.name})】
    ${entitiesDigest}

    【已知历史事件】
    ${historyDigest}

    任务: 撰写一篇深度历史评述（World Chronicle）。

    风格指南 (请根据当前历史阶段的特征，灵活选择一种叙事策略，不要千篇一律):
    1. 策略A (见微知著): 类似黄仁宇《万历十五年》。从一个具体的、看似平淡的细节或年份切入，剖析背后的制度性僵局。适用于停滞或缓慢腐朽的时期。
    2. 策略B (洪流奔涌): 类似茨威格《人类群星闪耀时》。聚焦于决定性的瞬间和个人意志与历史必然性的碰撞。适用于剧烈变革或战争时期。
    3. 策略C (文明兴衰): 类似吉本《罗马帝国衰亡史》。使用宏大、悲剧性的语调，俯瞰整个文明的结构性崩塌。
    4. 策略D (群像剪影): 通过对比社会不同阶层（如微观的平民与宏观的统治者）的命运反差，揭示时代的荒谬性。

    核心要求:
    1. **拒绝刻板模板**: 绝对不要每次都用"这是一个无关紧要的年份"开头，除非这确实最符合当前语境。请根据生成的历史内容选择最吸引人的切入点。
    2. **深度分析**: 必须结合 ${framework.name} 的层级逻辑（如宏观系统的压迫如何导致微观系统的崩溃）。
    3. **宿命感**: 强调个体在系统面前的无力感或悲剧性反抗。
    4. **叙事语调**: 冷静、克制、富有哲理性。

    文章结构建议 (仅供参考，可根据内容调整):
    - 引言: 一个强有力的历史场景或哲学性断言。
    - 剖析: 深入分析 2-3 个关键实体在系统中的挣扎。
    - 结语: 对时代命运的终极判词。
  `;

  try {
    return await generateText(settings, prompt, false);
  } catch (error: any) {
    handleApiError(error);
    return "";
  }
};

export const generateRelatedTechNode = async (
  baseNode: TechNode,
  relation: 'dependency' | 'unlock',
  context: string,
  settings: ApiSettings
): Promise<Omit<TechNode, 'id'>> => {
  const prompt = `
    【任务】: 你是科技树设计师。
    【世界背景】: ${context}
    
    【当前科技节点】:
    - 名称: ${baseNode.name}
    - 时代: ${baseNode.era}
    - 类型: ${baseNode.type}
    - 描述: ${baseNode.description}
    
    【需求】: 请构想一个与该科技直接相关的**${relation === 'dependency' ? '前置基础技术 (Pre-requisite)' : '后续解锁技术 (Unlocked Tech)'}**。
    
    输出严格的 JSON 格式:
    {
      "name": "技术名称",
      "description": "简短描述",
      "era": "该技术所处的时代 (必须符合逻辑，前置技术时代应更早，后续技术应更晚)",
      "type": "civil" 或 "military" 或 "abstract",
      "status": "concept"
    }
    `;

  try {
    const rawText = await generateText(settings, prompt, true);
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    }

    return {
      name: result.name || "未知技术",
      description: result.description || "...",
      era: result.era || baseNode.era,
      type: result.type || baseNode.type,
      status: 'concept'
    };

  } catch (error: any) {
    handleApiError(error);
    return {
      name: "生成失败",
      description: "请重试",
      era: baseNode.era,
      type: baseNode.type,
      status: 'concept'
    };
  }

};

export const generateCharacterProfile = async (
  promptInput: string,
  existingEntities: SocialEntity[],
  settings: ApiSettings
): Promise<SocialEntity> => {
  // Basic context from existing entities (optional, but good for consistency)
  const contextSnippet = existingEntities
    .slice(0, 20) // Limit to avoid hitting token limits
    .map(e => `${e.name} (${e.category})`)
    .join(", ");

  const prompt = `
    任务: 你是一个小说人物设计师。请根据用户输入的设计要求，设计一个详细的人物卡。
    
    【现有世界人物参考】: ${contextSnippet || "无"}
    
    【用户设计要求】: "${promptInput}"
    
    请生成一个 JSON 对象，包含以下字段:
    - name: 人物姓名
    - description: 详细的人物小传（包括性格、外貌、背景故事，300字以内）
    - validFrom: 该人物活跃的起始时间/章节 (可选，默认为"第一章")
    
    输出严格的 JSON 格式:
    {
      "name": "...",
      "description": "...",
      "validFrom": "..."
    }
    `;

  try {
    const rawText = await generateText(settings, prompt, true);
    let result: any = {};
    try {
      result = JSON.parse(rawText);
    } catch (e) {
      const jsonMatch = rawText.match(/```json\n([\s\S]*?)\n```/) || rawText.match(/\{[\s\S]*\}/);
      if (jsonMatch) result = JSON.parse(jsonMatch[0]);
    }

    return {
      id: crypto.randomUUID(),
      name: result.name || "新人物",
      description: result.description || "...",
      category: EntityCategory.PERSON,
      validFrom: result.validFrom || "未知"
    };
  } catch (error: any) {
    handleApiError(error);
    return {
      id: crypto.randomUUID(),
      name: "生成失败",
      description: "AI 生成失败，请重试。",
      category: EntityCategory.PERSON
    };
  }
};