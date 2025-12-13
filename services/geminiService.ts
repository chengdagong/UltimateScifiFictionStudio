import { WorldModel, SocialEntity, EntityCategory, LayerDefinition, StorySegment, FrameworkDefinition, ApiSettings, EntityRelationship, EntityState, StoryAgent, TechNode, TechDependency } from "../types";

const callBackend = async (endpoint: string, settings: ApiSettings, params: any) => {
    const token = localStorage.getItem('token'); 
    const headers: any = {
        'Content-Type': 'application/json'
    };
    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const res = await fetch(`/api/ai/${endpoint}`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ settings, params })
    });

    if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error || 'Backend request failed');
    }

    const data = await res.json();
    return data.result;
};

const parseJSON = (text: string) => {
    try {
        return JSON.parse(text);
    } catch (e) {
        const jsonMatch = text.match(/```json\n([\s\S]*?)\n```/) || text.match(/\{[\s\S]*\}/) || text.match(/\[\s*\{[\s\S]*\}\s*\]/);
        if (jsonMatch) return JSON.parse(jsonMatch[1] || jsonMatch[0]);
        return null;
    }
};

const handleApiError = (error: any) => {
  console.error("API Error:", error);
  const msg = error.message || JSON.stringify(error);

  if (msg.includes("Failed to fetch") || msg.includes("NetworkError") || msg.includes("fetch failed")) {
    throw new Error("网络请求失败。请检查您的网络连接、API Key 是否正确，或尝试在设置中配置 Base URL (代理地址)。");
  }

  if (msg.includes("User location is not supported") || msg.includes("Region not supported") || msg.includes("403") || msg.includes("PERMISSION_DENIED")) {
    throw new Error("API 错误: 当前地区不支持 (User location is not supported)。\n建议方案：\n1. 开启 VPN 并切换到支持的地区 (如美国、新加坡)。\n2. 在设置中配置反向代理 (Base URL)。");
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
    try {
        const rawText = await callBackend('generate-entities', settings, {
            layerTitle: layerDef.title,
            layerDesc: layerDef.description,
            categoriesStr: layerDef.allowedCategories.join(', '),
            isTimeDimension: layerDef.isTimeDimension,
            context
        });

        const data = parseJSON(rawText);
        if (!Array.isArray(data)) return [];

        return data.map((item: any) => ({
            id: crypto.randomUUID(),
            name: item.name,
            description: item.description,
            category: item.category as EntityCategory || (layerDef.isTimeDimension ? EntityCategory.EVENT : EntityCategory.UNKNOWN)
        }));
    } catch (error: any) {
        console.error("AI Error:", error);
        return [];
    }
};

export const importWorldFromText = async (
  storyText: string,
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
    try {
        const rawText = await callBackend('import-world', settings, { storyText });
        const result = parseJSON(rawText) || {};

        const context = result.context || "导入的世界";
        const getArr = (x: any) => Array.isArray(x) ? x : [];

        const rawEntities = getArr(result.entities);
        const rawRels = getArr(result.relationships);
        const rawTimeline = getArr(result.timeline);
        const rawTech = getArr(result.technologies);
        const rawStates = getArr(result.entityStates);

        const nameToIdMap: Record<string, string> = {};
        const entities: SocialEntity[] = rawEntities.map((e: any) => {
            const id = crypto.randomUUID();
            const name = e.name || "未知实体";
            nameToIdMap[name] = id;
            return {
                id: id,
                name: name,
                description: e.description || "",
                category: e.category as EntityCategory || EntityCategory.UNKNOWN,
                validFrom: e.validFrom,
                validTo: e.validTo
            };
        });

        const findIdByName = (name: string): string | undefined => {
            if (!name) return undefined;
            if (nameToIdMap[name]) return nameToIdMap[name];
            const foundName = Object.keys(nameToIdMap).find(k => k.includes(name) || name.includes(k));
            return foundName ? nameToIdMap[foundName] : undefined;
        };

        const relationships: EntityRelationship[] = rawRels.map((r: any) => {
            const sourceId = findIdByName(r.sourceName);
            const targetId = findIdByName(r.targetName);
            if (!sourceId || !targetId || sourceId === targetId) return null;
            return {
                id: crypto.randomUUID(),
                sourceId,
                targetId,
                type: r.type || "相关",
                description: r.description || ""
            };
        }).filter((r: unknown): r is EntityRelationship => r !== null);

        const storySegments: StorySegment[] = rawTimeline.map((t: any) => ({
            id: crypto.randomUUID(),
            timestamp: t.timestamp || "未知时间",
            content: t.content || "",
            influencedBy: Array.isArray(t.participantNames)
                ? t.participantNames.map((n: string) => findIdByName(n)).filter((id: string) => !!id)
                : []
        }));

        const technologies: TechNode[] = rawTech.map((t: any) => ({
            id: crypto.randomUUID(),
            name: t.name || "未命名技术",
            description: t.description || "",
            era: t.era || "Unknown Era",
            type: t.type || 'civil',
            status: t.status || 'production'
        }));

        const entityStates: EntityState[] = rawStates.map((s: any) => {
            const eId = findIdByName(s.entityName);
            if (!eId) return null;
            return {
                id: crypto.randomUUID(),
                entityId: eId,
                timestamp: s.timestamp || "未知时间",
                description: s.description || ""
            };
        }).filter((s: unknown): s is EntityState => s !== null);

        return {
            context,
            entities,
            relationships,
            storySegments,
            technologies,
            techDependencies: [],
            entityStates
        };

    } catch (error: any) {
        console.error("AI Error:", error);
        return { context: "", entities: [], relationships: [], storySegments: [], technologies: [], techDependencies: [], entityStates: [] };
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
    try {
        const layerInstructions = framework.layers.map(layer => {
            return `- 层级: ${layer.title} (${layer.description})\n  允许的类别: ${layer.allowedCategories.join(', ')}`;
        }).join('\n');

        const rawText = await callBackend('generate-world', settings, {
            scenarioPrompt,
            frameworkName: framework.name,
            frameworkDesc: framework.description,
            layerInstructions
        });

        const result = parseJSON(rawText) || {};
        const context = result.context || "生成的剧本世界";
        const getArray = (arr: any) => Array.isArray(arr) ? arr : [];

        const rawEntities = getArray(result.entities);
        const rawRelationships = getArray(result.relationships);
        const rawStates = getArray(result.entityStates);
        const rawTimeline = getArray(result.timeline);
        const rawTech = getArray(result.technologies);
        const rawTechDeps = getArray(result.techDependencies);

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
        console.error("AI Error:", error);
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
    try {
        const systemState = framework.layers.map(layer => {
            const layerEntities = model.entities.filter(e => layer.allowedCategories.includes(e.category));
            const items = layerEntities.map(e => {
                return `- ${e.name} (${e.category}): ${e.description}`;
            }).join("\n");
            return `### ${layer.title}\n${items || "(空)"}`;
        }).join("\n\n");

        return await callBackend('execute-agent', settings, {
            taskInstruction,
            currentTime,
            worldContext,
            systemState,
            previousOutput,
            agentRole: agent.role,
            critiqueFeedback,
            systemPrompt: agent.systemPrompt
        });
    } catch (error: any) {
        console.error("AI Error:", error);
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
    try {
        const rawText = await callBackend('execute-review', settings, {
            contentToReview,
            criteria,
            systemPrompt: agent.systemPrompt
        });

        const result = parseJSON(rawText) || {};
        return {
            verdict: result.verdict === 'PASS' ? 'PASS' : 'FAIL',
            feedback: result.feedback || "无反馈"
        };
    } catch (error: any) {
        console.error("AI Error:", error);
        return { verdict: 'FAIL', feedback: "审查过程发生错误" };
    }
};

export const generateWorldChronicle = async (
  model: WorldModel,
  framework: FrameworkDefinition,
  storySegments: StorySegment[],
  context: string,
  settings: ApiSettings
): Promise<string> => {
    try {
        const entitiesDigest = framework.layers.map(layer => {
            const layerEntities = model.entities.filter(e => layer.allowedCategories.includes(e.category));
            const items = layerEntities.map(e => `- ${e.name} (${e.category}): ${e.description}`).join('\n');
            return `### ${layer.title}\n${items || "(无记载)"}`;
        }).join('\n\n');

        const historyDigest = storySegments.map((s, i) => {
            return `[时间点 ${i + 1}: ${s.timestamp}]\n${s.content}`;
        }).join('\n\n');

        return await callBackend('generate-chronicle', settings, {
            frameworkName: framework.name,
            context,
            entitiesDigest,
            historyDigest
        });
    } catch (error: any) {
        console.error("AI Error:", error);
        return "";
    }
};

export const generateRelatedTechNode = async (
  baseNode: TechNode,
  relation: 'dependency' | 'unlock',
  context: string,
  settings: ApiSettings
): Promise<Omit<TechNode, 'id'>> => {
    try {
        const rawText = await callBackend('generate-tech', settings, {
            context,
            baseNode,
            relation
        });

        const result = parseJSON(rawText) || {};
        return {
            name: result.name || "未知技术",
            description: result.description || "...",
            era: result.era || baseNode.era,
            type: result.type || baseNode.type,
            status: 'concept'
        };
    } catch (error: any) {
        console.error("AI Error:", error);
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
    try {
        const contextSnippet = existingEntities
            .slice(0, 20)
            .map(e => `${e.name} (${e.category})`)
            .join(", ");

        const rawText = await callBackend('generate-character', settings, {
            promptInput,
            contextSnippet
        });

        const result = parseJSON(rawText) || {};
        return {
            id: crypto.randomUUID(),
            name: result.name || "新人物",
            description: result.description || "...",
            category: EntityCategory.PERSON,
            validFrom: result.validFrom || "未知"
        };
    } catch (error: any) {
        console.error("AI Error:", error);
        return {
            id: crypto.randomUUID(),
            name: "生成失败",
            description: "AI 生成失败，请重试。",
            category: EntityCategory.PERSON
        };
    }
};

export const extractEntitiesFromSnippet = async (
  snippet: string,
  existingEntities: SocialEntity[],
  settings: ApiSettings
): Promise<SocialEntity[]> => {
    try {
        const contextSnippet = existingEntities
            .slice(0, 50)
            .map(e => `${e.name} (${e.category})`)
            .join(", ");

        const rawText = await callBackend('extract-entities', settings, {
            snippet,
            contextSnippet
        });

        const data = parseJSON(rawText);
        if (!Array.isArray(data)) return [];

        return data.map((item: any) => ({
            id: crypto.randomUUID(),
            name: item.name,
            description: item.description,
            category: item.category as EntityCategory || EntityCategory.UNKNOWN
        }));
    } catch (error: any) {
        console.error("AI Error:", error);
        return [];
    }
};
