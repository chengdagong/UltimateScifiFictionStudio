export const generateEntitiesPrompt = (layerTitle: string, layerDesc: string, categoriesStr: string, isTimeDimension: boolean, context: string) => {
  if (isTimeDimension) {
    return `
    世界背景: "${context}"
    
    任务: 为 **${layerTitle}** 创造 3 个历史事件。
    层级定义: ${layerDesc}
    
    要求:
    1. 'name': 事件简短标题。
    2. 'description': 包含具体时间和影响。
    3. 'category': 必须是 "event"。
    
    输出 JSON 数组: [{name, description, category}]
    `;
  } else {
    return `
    世界背景: "${context}"
    
    任务: 为 **${layerTitle}** 创造 3 个社会实体。
    层级定义: ${layerDesc}
    
    允许的类别 (Category): ${categoriesStr}
    
    要求:
    1. 实体之间要有多样性和对立性。
    2. 'category': 必须从允许的类别中选择一个最合适的 (${categoriesStr})。
    3. 'description': 详细描述及其在社会中的作用。

    输出 JSON 数组: [{name, description, category}]
    `;
  }
};

export const importWorldPrompt = (storyText: string) => `
    任务: 分析以下文本，不仅仅是提取实体，而是要**重建**整个世界模型，包括其时间线、技术树和实体的历史演变。
    
    【文本内容】
    ${storyText.slice(0, 15000)}

    【合法类别清单 (Category Lists)】:
    - person: 具体的人物、关键角色。
    - org: 组织、团体、政党、公司、家族、政府机构。
    - place: 地点、城市、环境、空间。
    - event: 历史事件、战争、条约签署。
    - tech: 技术、工具、武器、基础设施。
    - resource: 资源、矿产、货币、物资。
    - belief: 信仰、宗教、法律、意识形态、概念。

    要求:
    1. **Context**: 总结一段"世界背景" (context)。
    2. **Entities**: 提取关键社会实体。
       - 'category': 必须严格遵循上述清单。
       - 'validFrom'/'validTo': 根据文本推断其活跃或存在的时期 (如 "2050年", "大萧条时期")。
    3. **Relationships**: 提取实体间关系。
       - 必须明确源头(sourceName)和目标(targetName)。
    4. **Timeline**: 提取文本中提及的关键情节或历史事件作为时间线节点 (StorySegments)。
       - 'participantNames': 列出参与该事件的实体名称。
    5. **Technologies**: 提取文中出现或暗示的技术 (TechNodes)。
       - 'era': 该技术出现的时期。
       - 'status': 推断其成熟度 (concept/prototype/production/obsolete)。
    6. **EntityStates**: 如果文中有描述实体在特定时间点的具体状态 (如 "他在2050年很穷，但在2060年成为了富豪")，请提取为状态快照。

    输出严格的 JSON 格式:
    {
      "context": "...",
      "entities": [
        { "name": "...", "description": "...", "category": "...", "validFrom": "...", "validTo": "..." }
      ],
      "relationships": [
        { "sourceName": "...", "targetName": "...", "type": "...", "description": "..." }
      ],
      "timeline": [
        { "timestamp": "...", "content": "...", "participantNames": ["..."] }
      ],
      "technologies": [
        { "name": "...", "description": "...", "era": "...", "type": "civil", "status": "production" }
      ],
      "entityStates": [
        { "entityName": "...", "timestamp": "...", "description": "..." }
      ]
    }
`;

export const generateWorldFromScenarioPrompt = (scenarioPrompt: string, frameworkName: string, frameworkDesc: string, layerInstructions: string) => `
    任务: 作为一个精通社会解剖学、历史学和科技史的专家，请根据以下剧本设定，构建一个**跨越整个历史时期**的动态社会结构模型和科技树。
    不要只生成一个静态的时间切片，而是要展示出实体和关系随时间的**演变、兴起和消亡**。
    
    【剧本设定与时间跨度】
    ${scenarioPrompt}

    【社会理论框架】
    ${frameworkName}: ${frameworkDesc}
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

export const executeAgentTaskPrompt = (taskInstruction: string, currentTime: string, worldContext: string, systemState: string, previousOutput: string, agentRole: string, critiqueFeedback?: string) => {
  let prompt = `
    【当前任务】: ${taskInstruction}
    【当前时间节点】: ${currentTime}
    
    【世界背景】: ${worldContext}
    
    【社会结构参考】:
    ${systemState}

    【前序工作成果 (Input)】:
    ${previousOutput ? previousOutput : "(无前序输出，这是第一步)"}

    请根据你的身份设定 (${agentRole}) 和上述信息执行任务。
    `;

  if (critiqueFeedback) {
    prompt += `
        
        !!! 这是一个重写任务 !!!
        上一轮生成的内容被审查 Agent 拒绝了。
        【审查意见 (Critique)】: ${critiqueFeedback}
        
        请根据审查意见，重新修改或重写内容，务必解决上述指出的问题。
        `;
  }
  return prompt;
};

export const executeReviewTaskPrompt = (contentToReview: string, criteria: string) => `
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

export const generateWorldChroniclePrompt = (frameworkName: string, context: string, entitiesDigest: string, historyDigest: string) => `
    角色: 你是一位深刻的历史学家，擅长从社会结构演变（${frameworkName}）的角度剖析历史。

    【世界背景】
    ${context}

    【社会结构 (${frameworkName})】
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
    2. **深度分析**: 必须结合 ${frameworkName} 的层级逻辑（如宏观系统的压迫如何导致微观系统的崩溃）。
    3. **宿命感**: 强调个体在系统面前的无力感或悲剧性反抗。
    4. **叙事语调**: 冷静、克制、富有哲理性。

    文章结构建议 (仅供参考，可根据内容调整):
    - 引言: 一个强有力的历史场景或哲学性断言。
    - 剖析: 深入分析 2-3 个关键实体在系统中的挣扎。
    - 结语: 对时代命运的终极判词。
`;

export const generateRelatedTechNodePrompt = (context: string, baseNode: any, relation: string) => `
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

export const generateCharacterProfilePrompt = (promptInput: string, contextSnippet: string) => `
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

export const extractEntitiesFromSnippetPrompt = (snippet: string, contextSnippet: string) => `
    任务: 你是社会解剖学家。请分析以下文本片段，提取其中潜在的"社会解剖学对象" (Social Anatomy Objects)。
    
    【文本片段】
    "${snippet}"
    
    【已存在实体 (仅供参考，避免重复)】
    ${contextSnippet || "无"}
    
    【提取要求】:
    1. 识别文中提到的人物、组织、地点、重要物品(资源/技术)、事件或信仰概念。
    2. 如果实体已经存在于【已存在实体】中，**不要**再次提取，除非文中有新的重要描述。
    3. 为每个实体分配最合适的类别 (person, org, place, event, tech, resource, belief)。
    4. 生成简短但切中要害的描述 (Description)，解释其在当前语境下的社会功能或意义。
    5. 语言要求：如果输入文本主要为中文，则所有输出字段（name, description）必须使用简体中文。
    
    输出严格的 JSON 数组:
    [
      { "name": "...", "category": "...", "description": "..." }
    ]
`;
