
import React, { useEffect, useRef, useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3Import from 'd3';
import { WorldModel, StorySegment, FrameworkDefinition, SocialEntity, EntityCategory } from '../types';
import { Info, ZoomIn, ZoomOut, Move } from 'lucide-react';
import { useWorldModel } from '../hooks/useWorldModel';

// Robustly handle D3 import
const d3 = (d3Import as any).default || d3Import;

// Define d3-compatible interfaces locally to resolve missing exports
interface SimulationNodeDatum {
    index?: number;
    x?: number;
    y?: number;
    vx?: number;
    vy?: number;
    fx?: number | null;
    fy?: number | null;
}

interface SimulationLinkDatum<NodeDatum extends SimulationNodeDatum> {
    source: NodeDatum | string | number;
    target: NodeDatum | string | number;
    index?: number;
}

interface GraphNode extends SimulationNodeDatum {
    id: string;
    type: 'EVENT' | 'ENTITY';
    name: string;
    category?: EntityCategory;
    timeIndex: number;
    year: number; // ADDED
    entityId?: string; // For entity nodes, link back to original entity
    desc?: string;
    color: string;
}

interface GraphLink extends SimulationLinkDatum<GraphNode> {
    source: string | GraphNode;
    target: string | GraphNode;
    type: 'CHRONOLOGY' | 'PARTICIPATION' | 'CONTINUITY';
}

const TimelineView: React.FC = () => {
    const { model, storySegments, currentFramework: framework } = useWorldModel();
    const { t } = useTranslation();
    const svgRef = useRef<SVGSVGElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const [hoveredNode, setHoveredNode] = useState<GraphNode | null>(null);

    // --- 1. Data Processing ---
    const graphData = useMemo(() => {
        const nodes: GraphNode[] = [];
        const links: GraphLink[] = [];
        const entityLastSeen: Record<string, string> = {}; // entityId -> nodeId of last appearance

        // Helper to get color
        const getColor = (category: EntityCategory) => {
            const layer = framework.layers.find(l => l.allowedCategories.includes(category));
            if (!layer) return '#94a3b8';
            if (layer.colorClass.includes('red')) return '#f87171';
            if (layer.colorClass.includes('amber')) return '#fbbf24';
            if (layer.colorClass.includes('emerald')) return '#34d399';
            if (layer.colorClass.includes('blue')) return '#60a5fa';
            if (layer.colorClass.includes('violet')) return '#a78bfa';
            if (layer.colorClass.includes('stone')) return '#a8a29e';
            if (layer.colorClass.includes('orange')) return '#fb923c';
            return '#94a3b8';
        };

        // If no story, create a placeholder
        const segmentsToProcess = storySegments.length > 0
            ? storySegments
            : [{ id: 'start', timestamp: t('timeline_initial_state'), content: t('timeline_initial_desc'), influencedBy: [] }];

        segmentsToProcess.forEach((seg, index) => {
            // A. Create Event Node (The Spine)
            const eventNodeId = `evt_${seg.id}`;

            // Parse Year
            const yearMatch = seg.timestamp.match(/(\d{4})/);
            const year = yearMatch ? parseInt(yearMatch[1]) : (2020 + index * 5); // Default start 2020

            nodes.push({
                id: eventNodeId,
                type: 'EVENT',
                name: seg.timestamp,
                timeIndex: index,
                year: year, // ADDED
                desc: seg.content,
                color: '#1e293b' // Slate-900
            });

            // Link to previous event
            if (index > 0) {
                links.push({
                    source: `evt_${segmentsToProcess[index - 1].id}`,
                    target: eventNodeId,
                    type: 'CHRONOLOGY'
                });
            }

            // B. Identify Involved Entities
            const involvedEntities = model.entities.filter(e =>
                seg.content.includes(e.name) ||
                (seg.influencedBy && seg.influencedBy.includes(e.id))
            );

            involvedEntities.forEach(entity => {
                const entityNodeId = `ent_${entity.id}_${index}`;

                // Create Entity Node for this specific time
                nodes.push({
                    id: entityNodeId,
                    type: 'ENTITY',
                    name: entity.name,
                    category: entity.category,
                    timeIndex: index,
                    year: year, // Inherit year from event
                    entityId: entity.id,
                    desc: entity.description,
                    color: getColor(entity.category)
                });

                // Link: Participation (Event -> Entity)
                links.push({
                    source: eventNodeId,
                    target: entityNodeId,
                    type: 'PARTICIPATION'
                });

                // Link: Continuity (Entity T-1 -> Entity T)
                if (entityLastSeen[entity.id]) {
                    links.push({
                        source: entityLastSeen[entity.id],
                        target: entityNodeId,
                        type: 'CONTINUITY'
                    });
                }
                entityLastSeen[entity.id] = entityNodeId;
            });
        });

        return { nodes, links };
    }, [model, storySegments, framework, t]);


    // --- 2. D3 Rendering ---
    useEffect(() => {
        if (!svgRef.current || !containerRef.current) return;
        if (!d3 || !d3.forceSimulation) return;

        try {
            const width = containerRef.current.clientWidth || 800;
            const height = containerRef.current.clientHeight || 400;

            // Clear
            const svg = d3.select(svgRef.current);
            svg.selectAll("*").remove();

            // Deep copy
            const nodesData = graphData.nodes.map(n => ({ ...n }));
            const linksData = graphData.links.map(l => ({ ...l }));

            const PIXELS_PER_YEAR = 100;
            const minYear = d3.min(nodesData, (d: any) => d.year) || 2020;
            const maxYear = d3.max(nodesData, (d: any) => d.year) || 2100;

            // Initial Scale
            const xScale = d3.scaleLinear()
                .domain([minYear, maxYear])
                .range([100, Math.max(width - 100, (maxYear - minYear) * PIXELS_PER_YEAR)]); // Ensure enough width

            // 1. Create Graph Group FIRST (so it is at the bottom)
            const g = svg.append("g");

            // 2. Create Axis Group SECOND (so it is on top)
            const axisG = svg.append("g")
                .attr("class", "x-axis")
                .attr("transform", "translate(0, 0)"); // Start at very top

            // Add Background for Axis (Sticky Header effect)
            axisG.append("rect")
                .attr("x", 0)
                .attr("y", 0)
                .attr("width", width)
                .attr("height", 60)
                .attr("fill", "white")
                .attr("fill-opacity", 0.95)
                .attr("class", "backdrop-blur-sm border-b border-slate-200");

            // Add actual axis container pushed down slightly
            const axisContent = axisG.append("g").attr("transform", "translate(0, 50)");

            const zoom = d3.zoom()
                .scaleExtent([0.1, 5])
                .on("zoom", (event: any) => {
                    // Transform the graph content (Nodes/Links)
                    g.attr("transform", event.transform);

                    // Rescale Axis (Semantic Zoom)
                    const newXScale = event.transform.rescaleX(xScale);

                    // Update Axis
                    const axis = d3.axisBottom(newXScale) // Changed to axisBottom to hang from the header
                        .ticks(width / 100)
                        .tickFormat(d3.format("d"));

                    axisContent.call(axis as any);

                    // Style ticks
                    axisContent.selectAll("text")
                        .attr("fill", "#64748b")
                        .attr("font-size", 12)
                        .attr("font-weight", "bold");
                    axisContent.selectAll("line").attr("stroke", "#cbd5e1");
                    axisContent.selectAll("path").attr("stroke", "#cbd5e1").attr("display", "none"); // Hide main line if wanted
                });

            svg.call(zoom);

            // Initial Axis Draw
            const initialAxis = d3.axisBottom(xScale).ticks(width / 100).tickFormat(d3.format("d"));
            axisContent.call(initialAxis as any);

            // Style initial ticks
            axisContent.selectAll("text").attr("fill", "#64748b").attr("font-size", 12).attr("font-weight", "bold");
            axisContent.selectAll("line").attr("stroke", "#cbd5e1");
            axisContent.selectAll("path").attr("display", "none");


            // Simulation Setup
            const simulation = d3.forceSimulation(nodesData)
                .force("link", d3.forceLink(linksData).id((d: any) => d.id).distance(100))
                .force("charge", d3.forceManyBody().strength(-300))
                .force("collide", d3.forceCollide().radius(35))
                .force("x", d3.forceX((d: GraphNode) => xScale(d.year)).strength(3)) // Strong X strength to align with time
                .force("y", d3.forceY((d: GraphNode) => {
                    if (d.type === 'EVENT') return 200; // Center events line
                    const catIndex = Object.values(EntityCategory).indexOf(d.category || EntityCategory.UNKNOWN);
                    return 350 + (catIndex * 70);
                }).strength(0.8));

            // Define Markers
            const defs = svg.append("defs");
            defs.append("marker")
                .attr("id", "arrow-continuity")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 25)
                .attr("refY", 0)
                .attr("markerWidth", 6)
                .attr("markerHeight", 6)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", "#94a3b8");

            defs.append("marker")
                .attr("id", "arrow-chrono")
                .attr("viewBox", "0 -5 10 10")
                .attr("refX", 40)
                .attr("refY", 0)
                .attr("markerWidth", 8)
                .attr("markerHeight", 8)
                .attr("orient", "auto")
                .append("path")
                .attr("d", "M0,-5L10,0L0,5")
                .attr("fill", "#1e293b");

            // --- Draw Links ---
            const link = g.append("g")
                .selectAll("path")
                .data(linksData)
                .join("path")
                .attr("fill", "none")
                .attr("stroke-width", (d: any) => {
                    if (d.type === 'CHRONOLOGY') return 5;
                    if (d.type === 'CONTINUITY') return 2;
                    return 1;
                })
                .attr("stroke", (d: any) => {
                    if (d.type === 'CHRONOLOGY') return "#1e293b";
                    if (d.type === 'CONTINUITY') return "#94a3b8";
                    return "#cbd5e1";
                })
                .attr("stroke-dasharray", (d: any) => d.type === 'PARTICIPATION' ? "4 4" : "none")
                .attr("opacity", (d: any) => d.type === 'PARTICIPATION' ? 0.6 : 1)
                .attr("marker-end", (d: any) => {
                    if (d.type === 'CONTINUITY') return "url(#arrow-continuity)";
                    if (d.type === 'CHRONOLOGY') return "url(#arrow-chrono)";
                    return null;
                });

            // --- Draw Nodes ---
            const node = g.append("g")
                .selectAll("g")
                .data(nodesData)
                .join("g")
                .call(d3.drag()
                    .on("start", dragstarted)
                    .on("drag", dragged)
                    .on("end", dragended)
                );

            // Event Nodes
            const eventGroups = node.filter((d: any) => d.type === 'EVENT');
            eventGroups.append("circle")
                .attr("r", 35)
                .attr("fill", "white")
                .attr("stroke", "#e2e8f0")
                .attr("stroke-width", 1);
            eventGroups.append("circle")
                .attr("r", 30)
                .attr("fill", "#1e293b")
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .attr("cursor", "pointer")
                .on("mouseenter", (e: any, d: any) => setHoveredNode(d))
                .on("mouseleave", () => setHoveredNode(null));
            eventGroups.append("text")
                .text((d: any) => d.timeIndex + 1)
                .attr("text-anchor", "middle")
                .attr("dy", "0.35em")
                .attr("fill", "#94a3b8")
                .attr("font-size", 20)
                .attr("font-weight", "bold")
                .attr("opacity", 0.5)
                .attr("pointer-events", "none");
            eventGroups.append("text")
                .text((d: any) => d.name)
                .attr("text-anchor", "middle")
                .attr("dy", "-3em")
                .attr("fill", "#1e293b")
                .attr("font-size", 14)
                .attr("font-weight", "bold")
                .attr("pointer-events", "none")
                .style("text-shadow", "0 1px 3px rgba(255,255,255,0.8)");

            // Entity Nodes
            const entityGroups = node.filter((d: any) => d.type === 'ENTITY');
            entityGroups.append("circle")
                .attr("r", 20)
                .attr("fill", (d: any) => d.color)
                .attr("stroke", "#fff")
                .attr("stroke-width", 2)
                .attr("cursor", "pointer")
                .on("mouseenter", (e: any, d: any) => setHoveredNode(d))
                .on("mouseleave", () => setHoveredNode(null));
            entityGroups.append("text")
                .text((d: any) => d.name)
                .attr("text-anchor", "middle")
                .attr("y", 35)
                .attr("font-size", 11)
                .attr("fill", "#475569")
                .attr("paint-order", "stroke")
                .attr("stroke", "white")
                .attr("stroke-width", 4)
                .attr("stroke-linecap", "round")
                .attr("stroke-linejoin", "round")
                .style("pointer-events", "none");

            simulation.on("tick", () => {
                link.attr("d", (d: any) => {
                    if (!d.source || !d.target) return "";
                    const srcX = d.source.x;
                    const srcY = d.source.y;
                    const tgtX = d.target.x;
                    const tgtY = d.target.y;

                    if (d.type === 'CHRONOLOGY') {
                        return `M${srcX},${srcY} L${tgtX},${tgtY}`;
                    }

                    const cx1 = srcX + (tgtX - srcX) / 2;
                    const cy1 = srcY;
                    const cx2 = srcX + (tgtX - srcX) / 2;
                    const cy2 = tgtY;
                    return `M${srcX},${srcY} C${cx1},${cy1} ${cx2},${cy2} ${tgtX},${tgtY}`;
                });
                node.attr("transform", (d: any) => `translate(${d.x},${d.y})`);
            });

            function dragstarted(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0.3).restart();
                d.fx = d.x;
                d.fy = d.y;
            }

            function dragged(event: any, d: any) {
                d.fx = event.x;
                d.fy = event.y;
            }

            function dragended(event: any, d: any) {
                if (!event.active) simulation.alphaTarget(0);
                d.fx = null;
                d.fy = null;
            }

            return () => {
                simulation.stop();
            };
        } catch (e) {
            console.error("D3 Timeline Error:", e);
        }
    }, [graphData]);

    return (
        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-0 overflow-hidden h-full flex flex-col relative">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex items-center justify-between shrink-0">
                <div>
                    <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
                        <Move className="w-5 h-5 text-indigo-700" />
                        {t('timeline_title')}
                    </h2>
                    <p className="text-xs text-slate-500 mt-1">
                        {t('timeline_subtitle')}
                    </p>
                </div>
            </div>

            <div ref={containerRef} className="flex-1 w-full bg-slate-50/50 relative cursor-grab active:cursor-grabbing">
                <svg ref={svgRef} className="w-full h-full"></svg>

                {hoveredNode && (
                    <div
                        className="absolute z-10 p-4 bg-white/95 backdrop-blur rounded-xl shadow-xl border border-slate-200 max-w-sm animate-fadeIn pointer-events-none"
                        style={{ top: 20, right: 20 }}
                    >
                        <div className="flex items-start justify-between mb-2">
                            <span className={`text-[10px] font-bold px-2 py-0.5 rounded text-white ${hoveredNode.type === 'EVENT' ? 'bg-slate-800' : 'bg-indigo-500'}`}>
                                {hoveredNode.type === 'EVENT' ? t('timeline_node_event') : t('timeline_node_entity')}
                            </span>
                            {hoveredNode.type === 'EVENT' && <span className="text-xs font-mono text-slate-400">#{hoveredNode.timeIndex + 1}</span>}
                        </div>
                        <h3 className="font-bold text-lg text-slate-800 mb-2 leading-tight">{hoveredNode.name}</h3>
                        <p className="text-sm text-slate-600 leading-relaxed max-h-40 overflow-y-hidden text-ellipsis">
                            {hoveredNode.desc}
                        </p>
                    </div>
                )}

                {storySegments.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                        <div className="bg-white p-6 rounded-xl shadow-lg border border-slate-100 text-center max-w-md">
                            <Info className="w-10 h-10 text-slate-300 mx-auto mb-3" />
                            <h3 className="font-bold text-slate-700 mb-1">{t('timeline_empty_title')}</h3>
                            <p className="text-sm text-slate-500">{t('timeline_empty_desc')}</p>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default TimelineView;
