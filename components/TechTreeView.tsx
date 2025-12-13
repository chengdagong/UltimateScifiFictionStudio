
import React, { useEffect, useRef, useState, useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3Import from 'd3';
import { useWorldModel } from '../hooks/useWorldModel';
import { TechNode, TechDependency } from '../types';
import { Cpu, Plus, Trash2, X, Edit, Link, Sparkles, PenTool } from 'lucide-react';

const d3 = (d3Import as any).default || d3Import;
const ERA_WIDTH = 250;

interface LinkChoiceContext {
   nodeId: string;
   direction: 'dependency' | 'unlock';
}

const TechTreeView: React.FC = () => {
   const {
      model,
      handleAddTechNode: onAddNode,
      handleUpdateTechNode: onUpdateNode,
      handleRemoveTechNode: onRemoveNode,
      handleAddTechDependency: onAddDependency,
      handleRemoveTechDependency: onRemoveDependency,
      handleGenerateRelatedTech: onGenerateRelatedNode,
      handleAddTechNodeWithLink: onManualCreateAndLink,
      handleUpdateTechNodeLayout: onUpdateNodeLayout,
      generatingTechId: generatingNodeId
   } = useWorldModel();

   const technologies = model.technologies || [];
   const dependencies = model.techDependencies || [];

   const { t } = useTranslation();
   const svgRef = useRef<SVGSVGElement>(null);
   const containerRef = useRef<HTMLDivElement>(null);

   const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
   const [isAdding, setIsAdding] = useState(false);
   const [linkChoiceContext, setLinkChoiceContext] = useState<LinkChoiceContext | null>(null);

   // New Node Form State
   const [newName, setNewName] = useState("");
   const [newEra, setNewEra] = useState("");
   const [newDesc, setNewDesc] = useState("");
   const [newType, setNewType] = useState<'military' | 'civil' | 'abstract'>('civil');

   // Link Context (When creating manually linked node)
   const [manualLinkContext, setManualLinkContext] = useState<{ nodeId: string, direction: 'dependency' | 'unlock' } | null>(null);
   // Context Menu for Right Click
   const [contextMenu, setContextMenu] = useState<{ x: number, y: number, era: string } | null>(null);

   useEffect(() => {
      console.log("LinkChoiceContext Updated:", linkChoiceContext);
   }, [linkChoiceContext]);

   const selectedNode = useMemo(() => technologies.find(t => t.id === selectedNodeId), [technologies, selectedNodeId]);

   // Handle outside click to close menus
   useEffect(() => {
      const handleClickOutside = () => {
         setLinkChoiceContext(null);
         setContextMenu(null);
      };
      // document.addEventListener('click', handleClickOutside); // No longer needed for modal, but good cleanup
      return () => document.removeEventListener('click', handleClickOutside);
   }, []);

   // Derived Graph Structure for D3
   const graphData = useMemo(() => {
      // 1. Sort nodes by era to determine X position
      // Group eras first
      const eras = Array.from(new Set(technologies.map(t => t.era))).sort();

      const nodes = technologies.map(t => ({
         ...t,
         eraIndex: eras.indexOf(t.era),
         fx: t.x ?? undefined, // Use fixed position if available
         fy: t.y ?? undefined
      }));

      const links = dependencies.map(d => ({
         ...d,
         source: d.sourceId,
         target: d.targetId
      }));

      return { nodes, links, eras };
   }, [technologies, dependencies]);

   // Handle D3 Rendering
   useEffect(() => {
      if (!svgRef.current || !containerRef.current || !d3) return;

      try {
         const width = containerRef.current.clientWidth;
         const height = containerRef.current.clientHeight;
         const svg = d3.select(svgRef.current);
         svg.selectAll("*").remove();

         // const ERA_WIDTH = 250; // Moved to top level constant

         // Setup Groups: Content (g) and Header (headerG)
         const g = svg.append("g");
         const headerG = svg.append("g").attr("class", "sticky-header");

         // Header Background
         headerG.append("rect")
            .attr("width", "100%")
            .attr("height", 50)
            .attr("fill", "rgba(255, 255, 255, 0.9)")
            .attr("class", "backdrop-blur-md border-b border-slate-200");

         // Initial Era Labels (will be positioned by zoom)
         const eraLabels = headerG.selectAll("text.era-label")
            .data(graphData.eras)
            .join("text")
            .attr("class", "era-label")
            .text(d => d)
            .attr("y", 30)
            .attr("font-size", 14)
            .attr("font-weight", "bold")
            .attr("fill", "#64748b")
            .attr("text-anchor", "middle")
            .style("pointer-events", "none");

         // Zoom Behavior
         const zoomed = (event: any) => {
            const t = event.transform;
            g.attr("transform", t);

            // Update Header Labels (Sync X, Fix Y)
            eraLabels.attr("x", (d, i) => t.applyX(i * ERA_WIDTH + ERA_WIDTH / 2));
         };

         const zoom = d3.zoom()
            .scaleExtent([0.2, 3])
            .on("zoom", zoomed);

         svg.call(zoom);

         // Initial Transform (Center 2020s if possible, or just default)
         const initialTransform = d3.zoomIdentity.translate(50, 60).scale(0.8); // Shift down y=60 to clear header
         svg.call(zoom.transform, initialTransform);

         // Draw Era Background Columns (In Content Group)
         graphData.eras.forEach((era, i) => {
            g.append("rect")
               .attr("x", i * ERA_WIDTH)
               .attr("y", -1000)
               .attr("width", ERA_WIDTH)
               .attr("height", 3000)
               .attr("fill", i % 2 === 0 ? "#f8fafc" : "#f1f5f9")
               .attr("opacity", 0.5);

            // Note: Labels moved to headerG
         });

         // Force Simulation
         const simulation = d3.forceSimulation(graphData.nodes as any)
            .force("link", d3.forceLink(graphData.links).id((d: any) => d.id).distance(100))
            .force("collide", d3.forceCollide().radius(80))
            .force("charge", d3.forceManyBody().strength(-200))
            .force("x", d3.forceX((d: any) => d.eraIndex * ERA_WIDTH + ERA_WIDTH / 2).strength(1.5))
            .force("y", d3.forceY(height / 2).strength(0.05));

         // Define Markers
         const defs = svg.append("defs"); // Defs should be attached to SVG root usually, or handled carefully if cleared
         defs.append("marker")
            .attr("id", "arrow-tech")
            .attr("viewBox", "0 -5 10 10")
            .attr("refX", 35) // Push arrow out of circle
            .attr("refY", 0)
            .attr("markerWidth", 6)
            .attr("markerHeight", 6)
            .attr("orient", "auto")
            .append("path")
            .attr("d", "M0,-5L10,0L0,5")
            .attr("fill", "#cbd5e1");

         // Draw Links (Bezier)
         const link = g.append("g")
            .selectAll("path")
            .data(graphData.links)
            .join("path")
            .attr("fill", "none")
            .attr("stroke", "#cbd5e1")
            .attr("stroke-width", 2)
            .attr("marker-end", "url(#arrow-tech)");

         // Draw Nodes
         const node = g.append("g")
            .selectAll("g")
            .data(graphData.nodes)
            .join("g")
            .call(d3.drag()
               // Prevent drag if clicking on the control buttons
               .filter((event) => !event.target.closest('.control-btn'))
               .on("start", dragstarted)
               .on("drag", dragged)
               .on("end", dragended)
            )
            .on("click", (e: any, d: any) => {
               if (e.target.closest('.control-btn')) return; // Ignore clicks if they originated from controls (double safety)
               console.log("Node clicked:", d.id);
               setSelectedNodeId(d.id);
               e.stopPropagation();
            });

         // Node Shape (Hexagon for Tech?)
         // Let's stick to rounded rects for a "chip" look
         const rect = node.append("rect")
            .attr("x", -60)
            .attr("y", -20)
            .attr("width", 120)
            .attr("height", 40)
            .attr("rx", 6)
            .attr("fill", (d: any) => {
               if (d.type === 'military') return "#fee2e2"; // Red-100
               if (d.type === 'civil') return "#e0f2fe"; // Sky-100
               return "#f3e8ff"; // Purple-100
            })
            .attr("stroke", (d: any) => {
               if (selectedNodeId === d.id) return "#0f172a";
               if (d.type === 'military') return "#ef4444";
               if (d.type === 'civil') return "#0ea5e9";
               return "#a855f7";
            })
            .attr("stroke-width", (d: any) => selectedNodeId === d.id ? 3 : 1.5)
            .attr("class", "shadow-sm transition-all");

         // Status Indicator
         node.append("circle")
            .attr("cx", 50)
            .attr("cy", -20)
            .attr("r", 6)
            .attr("fill", (d: any) => {
               if (d.status === 'production') return "#22c55e";
               if (d.status === 'prototype') return "#eab308";
               if (d.status === 'concept') return "#94a3b8";
               return "#475569";
            })
            .attr("stroke", "#fff");

         node.append("text")
            .text((d: any) => d.name)
            .attr("text-anchor", "middle")
            .attr("dy", 5)
            .attr("font-size", 12)
            .attr("font-weight", "bold")
            .attr("fill", "#334155")
            .style("pointer-events", "none");

         // --- Interaction Controls (Add Pre / Add Post) ---
         // Left Button (Add Dependency)
         const leftControl = node.append("g")
            .attr("transform", "translate(-72, 0)")
            .attr("cursor", "pointer")
            .attr("opacity", 0) // Hide by default
            .attr("class", "control-btn") // Class for drag filtering
            .on("click", (e: any, d: any) => {
               console.log("Left (+) Button Clicked", d.id);
               e.preventDefault();
               e.stopPropagation();
               e.stopImmediatePropagation();

               console.log("Setting link context (dependency)...");
               setLinkChoiceContext({
                  nodeId: d.id,
                  direction: 'dependency'
               });
            });

         leftControl.append("circle")
            .attr("class", "control-btn") // Helper for target check
            .attr("r", 10)
            .attr("fill", "white")
            .attr("stroke", "#64748b")
            .attr("stroke-width", 1.5)
            .style("pointer-events", "all");
         leftControl.append("text")
            .text("+")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-size", 14)
            .attr("fill", "#64748b")
            .style("pointer-events", "none");

         // Right Button (Add Unlock)
         const rightControl = node.append("g")
            .attr("transform", "translate(72, 0)")
            .attr("cursor", "pointer")
            .attr("opacity", 0) // Hide by default
            .attr("class", "control-btn")
            .on("click", (e: any, d: any) => {
               console.log("Right (+) Button Clicked", d.id);
               e.preventDefault();
               e.stopPropagation();
               e.stopImmediatePropagation();

               console.log("Setting link context (unlock)...");
               setLinkChoiceContext({
                  nodeId: d.id,
                  direction: 'unlock'
               });
            });

         rightControl.append("circle")
            .attr("r", 10)
            .attr("fill", "white")
            .attr("stroke", "#0ea5e9")
            .attr("stroke-width", 1.5)
            .style("pointer-events", "all");
         rightControl.append("text")
            .text("+")
            .attr("text-anchor", "middle")
            .attr("dy", 4)
            .attr("font-size", 14)
            .attr("fill", "#0ea5e9")
            .style("pointer-events", "none");

         // Show controls on hover
         node.on("mouseenter", function () {
            d3.select(this).selectAll("g[cursor='pointer']").transition().duration(200).attr("opacity", 1);
         }).on("mouseleave", function () {
            d3.select(this).selectAll("g[cursor='pointer']").transition().duration(200).attr("opacity", 0);
         });

         // Loading Spinner Animation for generating node
         if (generatingNodeId) {
            const loadingNode = node.filter((d: any) => d.id === generatingNodeId);
            loadingNode.selectAll("rect").attr("stroke", "#f59e0b").attr("stroke-dasharray", "4 2");
         }

         simulation.on("tick", () => {
            link.attr("d", (d: any) => {
               const srcX = d.source.x;
               const srcY = d.source.y;
               const tgtX = d.target.x;
               const tgtY = d.target.y;

               // Horizontal Bezier
               const midX = (srcX + tgtX) / 2;
               return `M${srcX},${srcY}C${midX},${srcY} ${midX},${tgtY} ${tgtX},${tgtY}`;
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
            d.fx = event.x;
            d.fy = event.y;
            // Trigger layout update persistence
            if (onUpdateNodeLayout) {
               onUpdateNodeLayout(d.id, d.fx, d.fy);
            }
         }

         return () => simulation.stop();

      } catch (e) {
         console.error("Tech Tree D3 Error", e);
      }
   }, [graphData, selectedNodeId, generatingNodeId]);

   const handleCreate = () => {
      if (newName && newEra) {
         if (manualLinkContext && onManualCreateAndLink) {
            onManualCreateAndLink(newName, newDesc, newEra, newType, manualLinkContext.nodeId, manualLinkContext.direction);
         } else {
            onAddNode(newName, newDesc, newEra, newType);
         }
         setNewName("");
         setNewDesc("");
         setIsAdding(false);
         setManualLinkContext(null);
      }
   };

   const handleMenuOptionClick = (type: 'ai' | 'manual') => {
      if (!linkChoiceContext) return;
      const { nodeId, direction } = linkChoiceContext;

      if (type === 'ai') {
         if (onGenerateRelatedNode) onGenerateRelatedNode(nodeId, direction);
      } else {
         // Open manual creation form with context
         setManualLinkContext({ nodeId, direction });
         setIsAdding(true);

         // Try to pre-fill some smart defaults based on the node
         const baseNode = technologies.find(t => t.id === nodeId);
         if (baseNode) {
            setNewEra(baseNode.era); // Default to same era, user can change
            setNewType(baseNode.type);
         }
      }
      setLinkChoiceContext(null);
   };

   const handleContextMenu = (e: React.MouseEvent) => {
      e.preventDefault();
      if (!svgRef.current) return;

      // Calculate Era based on click position and Zoom
      const transform = d3.zoomTransform(svgRef.current);
      const worldX = (e.nativeEvent.offsetX - transform.x) / transform.k;
      const eraIndex = Math.floor(worldX / ERA_WIDTH);

      // Get Era Name (or default if out of bounds)
      const era = graphData.eras[eraIndex] || (eraIndex >= graphData.eras.length ? t('tech_new_era') : graphData.eras[0]);

      setContextMenu({
         x: e.clientX,
         y: e.clientY,
         era: era
      });
   };

   // Node Detail Panel
   const renderDetail = () => {
      if (!selectedNode) return (
         <div className="p-6 text-center text-slate-400">
            <Cpu className="w-12 h-12 mx-auto mb-4 opacity-50" />
            <p>{t('tech_detail_select_hint')}</p>
            <p className="text-xs mt-2">{t('tech_detail_deselect_hint')}</p>
         </div>
      );

      const relatedSources = dependencies.filter(d => d.targetId === selectedNode.id).map(d => technologies.find(t => t.id === d.sourceId));
      const relatedTargets = dependencies.filter(d => d.sourceId === selectedNode.id).map(d => technologies.find(t => t.id === d.targetId));

      return (
         <div className="p-4 space-y-4 animate-fadeIn">
            <div className="flex justify-between items-start">
               <h3 className="text-lg font-bold text-slate-800">{selectedNode.name}</h3>
               <button onClick={() => onRemoveNode(selectedNode.id)} className="text-slate-400 hover:text-red-500"><Trash2 className="w-4 h-4" /></button>
            </div>

            <div className="space-y-2">
               <label className="text-xs font-bold text-slate-500 uppercase">{t('tech_detail_basic_info')}</label>
               <input
                  className="w-full p-2 border rounded text-sm mb-1"
                  value={selectedNode.name}
                  onChange={e => onUpdateNode(selectedNode.id, e.target.value, selectedNode.description, selectedNode.era, selectedNode.type, selectedNode.status)}
               />
               <textarea
                  className="w-full p-2 border rounded text-sm h-20"
                  value={selectedNode.description}
                  onChange={e => onUpdateNode(selectedNode.id, selectedNode.name, e.target.value, selectedNode.era, selectedNode.type, selectedNode.status)}
               />
            </div>

            <div className="grid grid-cols-2 gap-2">
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('tech_detail_era')}</label>
                  <input
                     className="w-full p-2 border rounded text-sm"
                     value={selectedNode.era}
                     onChange={e => onUpdateNode(selectedNode.id, selectedNode.name, selectedNode.description, e.target.value, selectedNode.type, selectedNode.status)}
                  />
               </div>
               <div>
                  <label className="text-xs font-bold text-slate-500 uppercase">{t('tech_detail_type')}</label>
                  <select
                     className="w-full p-2 border rounded text-sm bg-white"
                     value={selectedNode.type}
                     onChange={e => onUpdateNode(selectedNode.id, selectedNode.name, selectedNode.description, selectedNode.era, e.target.value as any, selectedNode.status)}
                  >
                     <option value="civil">{t('tech_type_civil')}</option>
                     <option value="military">{t('tech_type_military')}</option>
                     <option value="abstract">{t('tech_type_abstract')}</option>
                  </select>
               </div>
            </div>

            <div>
               <label className="text-xs font-bold text-slate-500 uppercase">{t('tech_detail_status')}</label>
               <div className="flex gap-1 mt-1">
                  {['concept', 'prototype', 'production', 'obsolete'].map((s: any) => (
                     <button
                        key={s}
                        onClick={() => onUpdateNode(selectedNode.id, selectedNode.name, selectedNode.description, selectedNode.era, selectedNode.type, s)}
                        className={`px-2 py-1 text-xs rounded border ${selectedNode.status === s ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-slate-500'}`}
                     >
                        {s}
                     </button>
                  ))}
               </div>
            </div>

            <div className="pt-4 border-t border-slate-100">
               <label className="text-xs font-bold text-slate-500 uppercase flex items-center gap-1 mb-2">
                  <Link className="w-3 h-3" /> {t('tech_detail_dependencies')}
               </label>

               <div className="space-y-2 text-sm">
                  <div className="flex gap-2 items-center text-slate-600">
                     <span className="text-xs bg-slate-100 px-1 rounded">{t('tech_dep_source')}</span>
                     <div className="flex-1 flex flex-wrap gap-1">
                        {relatedSources.map(t => (
                           <span key={t?.id} className="bg-slate-50 border px-1 rounded flex items-center gap-1">
                              {t?.name}
                              <button onClick={() => {
                                 const dep = dependencies.find(d => d.sourceId === t?.id && d.targetId === selectedNode.id);
                                 if (dep) onRemoveDependency(dep.id);
                              }}><X className="w-3 h-3" /></button>
                           </span>
                        ))}
                        <select
                           className="text-xs border rounded bg-slate-50 max-w-[100px]"
                           onChange={(e) => {
                              if (e.target.value) onAddDependency(e.target.value, selectedNode.id);
                           }}
                           value=""
                        >
                           <option value="">{t('tech_add_dep')}</option>
                           {technologies.filter(t => t.id !== selectedNode.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                     </div>
                  </div>

                  <div className="flex gap-2 items-center text-slate-600">
                     <span className="text-xs bg-slate-100 px-1 rounded">{t('tech_dep_target')}</span>
                     <div className="flex-1 flex flex-wrap gap-1">
                        {relatedTargets.map(t => (
                           <span key={t?.id} className="bg-slate-50 border px-1 rounded flex items-center gap-1">
                              {t?.name}
                              <button onClick={() => {
                                 const dep = dependencies.find(d => d.sourceId === selectedNode.id && d.targetId === t?.id);
                                 if (dep) onRemoveDependency(dep.id);
                              }}><X className="w-3 h-3" /></button>
                           </span>
                        ))}
                        <select
                           className="text-xs border rounded bg-slate-50 max-w-[100px]"
                           onChange={(e) => {
                              if (e.target.value) onAddDependency(selectedNode.id, e.target.value);
                           }}
                           value=""
                        >
                           <option value="">{t('tech_add_dep')}</option>
                           {technologies.filter(t => t.id !== selectedNode.id).map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                        </select>
                     </div>
                  </div>
               </div>
            </div>
         </div>
      );
   };

   return (
      <div className="flex h-full bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden relative">
         {/* Main Graph Area */}
         <div className="flex-1 flex flex-col relative">
            <div className="px-6 py-4 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
               <div>
                  <h2 className="text-xl font-serif font-bold text-slate-800 flex items-center gap-2">
                     <Cpu className="w-5 h-5 text-indigo-700" /> {t('tech_title')}
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">
                     {t('tech_subtitle')}
                  </p>
               </div>
               <button
                  onClick={() => { setIsAdding(!isAdding); setManualLinkContext(null); setNewName(""); }}
                  className={`flex items-center gap-1 px-3 py-2 rounded-lg font-bold text-sm transition-colors ${isAdding ? 'bg-slate-200 text-slate-700' : 'bg-indigo-600 text-white hover:bg-indigo-700'}`}
               >
                  <Plus className="w-4 h-4" /> {t('tech_new_btn')}
               </button>
            </div>

            {/* Link Choice Modal */}
            {linkChoiceContext && (
               <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 animate-fadeIn" onClick={() => setLinkChoiceContext(null)}>
                  <div className="bg-white rounded-xl shadow-2xl p-6 w-[400px] transform transition-all scale-100" onClick={e => e.stopPropagation()}>
                     <div className="flex justify-between items-center mb-4">
                        <h3 className="text-lg font-bold text-slate-800">
                           {linkChoiceContext.direction === 'dependency' ? t('tech_add_prev') : t('tech_add_next')}
                        </h3>
                        <button onClick={() => setLinkChoiceContext(null)} className="text-slate-400 hover:text-slate-600">
                           <X className="w-5 h-5" />
                        </button>
                     </div>

                     <div className="grid grid-cols-2 gap-4">
                        <button
                           onClick={() => handleMenuOptionClick('ai')}
                           className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-indigo-100 rounded-xl hover:border-indigo-500 hover:bg-indigo-50 transition-all group"
                        >
                           <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full group-hover:scale-110 transition-transform">
                              <Sparkles className="w-6 h-6" />
                           </div>
                           <span className="font-bold text-slate-700">{t('action_ai_generate')}</span>
                           <span className="text-xs text-slate-500 text-center">{t('tech_ai_gen_desc')}</span>
                        </button>

                        <button
                           onClick={() => handleMenuOptionClick('manual')}
                           className="flex flex-col items-center justify-center gap-3 p-6 border-2 border-slate-100 rounded-xl hover:border-slate-500 hover:bg-slate-50 transition-all group"
                        >
                           <div className="p-3 bg-slate-100 text-slate-600 rounded-full group-hover:scale-110 transition-transform">
                              <PenTool className="w-6 h-6" />
                           </div>
                           <span className="font-bold text-slate-700">{t('tech_manual_create')}</span>
                           <span className="text-xs text-slate-500 text-center">{t('tech_manual_desc')}</span>
                        </button>
                     </div>
                  </div>
               </div>
            )}

            {isAdding && (
               <div className="absolute top-20 left-6 z-10 w-64 bg-white p-4 rounded-xl shadow-xl border border-indigo-100 animate-fadeIn">
                  <h3 className="font-bold text-sm mb-3">
                     {manualLinkContext ? (manualLinkContext.direction === 'dependency' ? t('tech_add_node_title_prev') : t('tech_add_node_title_next')) : t('tech_add_node_title_new')}
                  </h3>
                  <input className="w-full mb-2 p-2 border rounded text-xs" placeholder={t('tech_placeholder_name')} value={newName} onChange={e => setNewName(e.target.value)} autoFocus />
                  <input className="w-full mb-2 p-2 border rounded text-xs" placeholder={t('tech_placeholder_era')} value={newEra} onChange={e => setNewEra(e.target.value)} />
                  <select className="w-full mb-2 p-2 border rounded text-xs bg-white" value={newType} onChange={e => setNewType(e.target.value as any)}>
                     <option value="civil">{t('tech_type_civil_short')}</option>
                     <option value="military">{t('tech_type_military_short')}</option>
                     <option value="abstract">{t('tech_type_abstract_short')}</option>
                  </select>
                  <textarea className="w-full mb-2 p-2 border rounded text-xs h-16" placeholder={t('new_entity_default_desc')} value={newDesc} onChange={e => setNewDesc(e.target.value)} />
                  <div className="flex justify-end gap-2">
                     <button onClick={() => { setIsAdding(false); setManualLinkContext(null); }} className="px-2 py-1 text-xs text-slate-500">{t('action_cancel')}</button>
                     <button onClick={handleCreate} className="px-2 py-1 text-xs bg-indigo-600 text-white rounded">{t('action_confirm')}</button>
                  </div>
               </div>
            )}

            {/* Right Click Context Menu */}
            {contextMenu && (
               <div
                  className="fixed z-50 bg-white rounded-lg shadow-xl border border-slate-200 p-1 flex flex-col min-w-[150px] animate-fadeIn"
                  style={{ left: contextMenu.x, top: contextMenu.y }}
                  onClick={(e) => e.stopPropagation()}
               >
                  <div className="px-2 py-1 text-[10px] font-bold text-slate-400 uppercase tracking-wider border-b border-slate-100 mb-1">
                     {t('tech_ctx_create_in', { era: contextMenu.era })}
                  </div>
                  <button
                     onClick={() => {
                        setNewEra(contextMenu.era);
                        setIsAdding(true);
                        setContextMenu(null);
                     }}
                     className="flex items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-indigo-50 hover:text-indigo-600 rounded text-left"
                  >
                     <Plus className="w-4 h-4" /> {t('tech_ctx_create_node')}
                  </button>
               </div>
            )}

            <div
               ref={containerRef}
               className="flex-1 bg-slate-50/50 cursor-grab active:cursor-grabbing"
               onClick={() => { setSelectedNodeId(null); setContextMenu(null); }}
               onContextMenu={handleContextMenu}
            >
               <svg ref={svgRef} className="w-full h-full"></svg>
               {technologies.length === 0 && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                     <div className="text-center text-slate-400">
                        <Cpu className="w-10 h-10 mx-auto mb-2 opacity-50" />
                        <p>{t('tech_empty_title')}</p>
                        <p className="text-xs">{t('tech_empty_desc')}</p>
                     </div>
                  </div>
               )}
            </div>
         </div>

         {/* Right Sidebar Detail */}
         <div className="w-80 border-l border-slate-200 bg-white overflow-y-auto">
            {renderDetail()}
         </div>
      </div>
   );
};

export default TechTreeView;
