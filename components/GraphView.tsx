
import React, { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import * as d3Import from 'd3';
import { SocialEntity, EntityRelationship, FrameworkDefinition, EntityCategory } from '../types';

// Robustly handle D3 import (default vs named exports)
const d3 = (d3Import as any).default || d3Import;

interface GraphViewProps {
  entities: SocialEntity[];
  relationships: EntityRelationship[];
  framework: FrameworkDefinition;
  viewTime: string | null;
  selectedEntityId: string | null;
  onSelectEntity: (id: string) => void;
}

const GraphView: React.FC<GraphViewProps> = ({
  entities,
  relationships,
  framework,
  viewTime,
  selectedEntityId,
  onSelectEntity
}) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Helper to check time validity
  const isActiveInTime = (time: string | null, start?: string, end?: string): boolean => {
    if (!time) return true;
    if (!start && !end) return true;
    if (start && time < start) return false;
    if (end && time > end) return false;
    return true;
  };

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    if (!d3 || !d3.forceSimulation) {
      console.error("D3 Library failed to load");
      return;
    }

    try {
      // 1. Filter Data based on viewTime
      const activeEntities = entities.filter(e => isActiveInTime(viewTime, e.validFrom, e.validTo));
      const entityIds = new Set(activeEntities.map(e => e.id));

      const activeLinks = relationships.filter(r => {
        // Must connect two active entities
        if (!entityIds.has(r.sourceId) || !entityIds.has(r.targetId)) return false;

        // Relationship time check
        if (r.timestamp && viewTime && r.timestamp !== viewTime) return false;
        return isActiveInTime(viewTime, r.validFrom, r.validTo);
      }).map(r => ({ ...r, source: r.sourceId, target: r.targetId }));

      // 2. Setup Dimensions
      const width = containerRef.current.clientWidth || 800;
      const height = containerRef.current.clientHeight || 600;

      // Clear previous
      const svg = d3.select(svgRef.current);
      svg.selectAll("*").remove();

      // 3. Setup Colors
      const getColor = (category: EntityCategory) => {
        const layer = framework.layers.find(l => l.allowedCategories.includes(category));
        if (!layer) return '#94a3b8'; // slate-400

        if (layer.colorClass.includes('red')) return '#f87171';
        if (layer.colorClass.includes('amber')) return '#fbbf24';
        if (layer.colorClass.includes('emerald')) return '#34d399';
        if (layer.colorClass.includes('blue')) return '#60a5fa';
        if (layer.colorClass.includes('violet')) return '#a78bfa';
        if (layer.colorClass.includes('stone')) return '#a8a29e';
        if (layer.colorClass.includes('orange')) return '#fb923c';
        return '#94a3b8';
      };

      // 4. Create Simulation
      // Deep copy data to avoid mutating props if D3 modifies it in place
      const nodesData = activeEntities.map(e => ({ ...e }));
      const linksData = activeLinks.map(l => ({ ...l }));

      const simulation = d3.forceSimulation(nodesData)
        .force("link", d3.forceLink(linksData).id((d: any) => d.id).distance(150))
        .force("charge", d3.forceManyBody().strength(-400))
        .force("center", d3.forceCenter(width / 2, height / 2))
        .force("collide", d3.forceCollide().radius(40));

      // 5. Container for Zoom
      const g = svg.append("g");

      svg.call(d3.zoom()
        .scaleExtent([0.1, 4])
        .on("zoom", (event: any) => {
          g.attr("transform", event.transform);
        }));

      // Define Arrow Marker
      const defs = svg.append("defs");
      defs.selectAll("marker")
        .data(["end"])
        .enter().append("marker")
        .attr("id", "arrow")
        .attr("viewBox", "0 -5 10 10")
        .attr("refX", 25)
        .attr("refY", 0)
        .attr("markerWidth", 6)
        .attr("markerHeight", 6)
        .attr("orient", "auto")
        .append("path")
        .attr("d", "M0,-5L10,0L0,5")
        .attr("fill", "#cbd5e1");

      // 6. Draw Links
      const link = g.append("g")
        .selectAll("g")
        .data(linksData)
        .join("g");

      const linkPath = link.append("path")
        .attr("stroke", "#cbd5e1")
        .attr("stroke-width", 1.5)
        .attr("fill", "none")
        .attr("marker-end", "url(#arrow)");

      const linkText = link.append("text")
        .text((d: any) => d.type)
        .attr("font-size", 10)
        .attr("fill", "#64748b")
        .attr("text-anchor", "middle")
        .attr("dy", -5);

      // 7. Draw Nodes
      const node = g.append("g")
        .selectAll("g")
        .data(nodesData)
        .join("g")
        .call(d3.drag()
          .on("start", dragstarted)
          .on("drag", dragged)
          .on("end", dragended));

      // Node Circle
      node.append("circle")
        .attr("r", 15)
        .attr("fill", (d: any) => getColor(d.category))
        .attr("stroke", (d: any) => selectedEntityId === d.id ? "#1e1b4b" : "#fff")
        .attr("stroke-width", (d: any) => selectedEntityId === d.id ? 3 : 2)
        .attr("cursor", "pointer")
        .on("click", (event: any, d: any) => {
          onSelectEntity(d.id);
          event.stopPropagation();
        });

      // Label Background (for readability)
      node.append("text")
        .text((d: any) => d.name)
        .attr("x", 0)
        .attr("y", 28)
        .attr("text-anchor", "middle")
        .attr("font-size", 12)
        .attr("font-weight", "bold")
        .attr("fill", "#334155")
        .attr("paint-order", "stroke")
        .attr("stroke", "white")
        .attr("stroke-width", 3)
        .attr("stroke-linecap", "round")
        .attr("stroke-linejoin", "round");

      // 8. Ticker
      simulation.on("tick", () => {
        linkPath.attr("d", (d: any) => {
          // Curved lines
          if (!d.source || !d.target) return "";
          const dx = d.target.x - d.source.x;
          const dy = d.target.y - d.source.y;
          const dr = Math.sqrt(dx * dx + dy * dy);
          if (isNaN(dr) || dr === 0) return "";
          return `M${d.source.x},${d.source.y}A${dr},${dr} 0 0,1 ${d.target.x},${d.target.y}`;
        });

        linkText
          .attr("x", (d: any) => (d.source.x + d.target.x) / 2)
          .attr("y", (d: any) => (d.source.y + d.target.y) / 2);

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
      console.error("D3 Graph Error:", e);
    }
  }, [entities, relationships, framework, viewTime, selectedEntityId]);

  return (
    <div ref={containerRef} className="w-full h-full bg-slate-50 cursor-grab active:cursor-grabbing overflow-hidden rounded-lg">
      <svg ref={svgRef} className="w-full h-full" onClick={() => onSelectEntity("")}></svg>
      {entities.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <p className="text-slate-400">{t('graph_no_data')}</p>
        </div>
      )}
    </div>
  );
};

export default GraphView;
