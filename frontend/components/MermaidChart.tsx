import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

interface MermaidChartProps {
  code: string;
}

const MermaidChart: React.FC<MermaidChartProps> = ({ code }) => {
  const ref = useRef<HTMLDivElement>(null);
  // Generate a unique ID for each diagram instance
  const diagramId = React.useMemo(() => `mermaid-${Math.random().toString(36).substr(2, 9)}`, []);

  useEffect(() => {
    if (ref.current) {
      ref.current.innerHTML = `<div class="mermaid" id="${diagramId}">${code}</div>`;
      mermaid.initialize({ startOnLoad: false, theme: 'dark' });
      // Delay to ensure DOM is ready
      setTimeout(() => {
        try {
          mermaid.init(undefined, `#${diagramId}`);
        } catch (e) {
          // Optionally log or ignore
        }
      }, 0);
    }
  }, [code, diagramId]);

  return <div ref={ref} />;
};

export default MermaidChart;
