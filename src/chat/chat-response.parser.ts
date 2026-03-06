/**
 * Chat Response Parser
 *
 * Parses the markdown response from the AI and converts it into
 * a structured format that can be easily consumed by the frontend.
 */

export interface ChatSection {
  type: 'text' | 'table' | 'chart' | 'metric';
  content: string | TableBlock | ChartBlock | MetricBlock;
}

export interface ParsedChatResponse {
  summary: string;
  insights: string[];
  data: ChatSection[];
  raw: string;
}

export interface MetricBlock {
  label: string;
  value: string;
  change?: string;
  icon?: string;
}

export interface TableColumn {
  key: string;
  label: string;
}

export interface TableBlock {
  title?: string;
  columns: TableColumn[];
  rows: Record<string, unknown>[];
}

export interface ChartDataset {
  label: string;
  data: number[];
}

export interface ChartBlock {
  chartType: 'bar' | 'line' | 'pie' | 'doughnut';
  title?: string;
  labels: string[];
  datasets: ChartDataset[];
}

/**
 * Parses a markdown chat response into structured sections
 */
export function parseChatResponse(markdown: string): ParsedChatResponse {
  const result: ParsedChatResponse = {
    summary: '',
    insights: [],
    data: [],
    raw: markdown,
  };

  // Normalize line endings
  const normalized = markdown.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  const lines = normalized.split('\n');

  let currentSection: 'none' | 'summary' | 'insights' | 'data' = 'none';
  let currentCodeBlock: { type: string; content: string } | null = null;
  let textBuffer: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmedLine = line.trim();

    // Check for section headers
    if (trimmedLine.match(/^#+\s*summary$/i)) {
      flushTextBuffer();
      currentSection = 'summary';
      continue;
    }

    if (trimmedLine.match(/^#+\s*insights?$/i)) {
      flushTextBuffer();
      currentSection = 'insights';
      continue;
    }

    if (trimmedLine.match(/^#+\s*data$/i)) {
      flushTextBuffer();
      currentSection = 'data';
      continue;
    }

    // Check for code block start (```table, ```chart, ```metric)
    const codeBlockMatch = trimmedLine.match(/^```(table|chart|metric)\s*$/i);
    if (codeBlockMatch) {
      flushTextBuffer();
      currentCodeBlock = {
        type: codeBlockMatch[1].toLowerCase(),
        content: '',
      };
      continue;
    }

    // Check for code block end
    if (currentCodeBlock && trimmedLine === '```') {
      parseAndAddCodeBlock();
      currentCodeBlock = null;
      continue;
    }

    // Accumulate code block content
    if (currentCodeBlock) {
      currentCodeBlock.content += line + '\n';
      continue;
    }

    // Process regular content based on current section
    if (currentSection === 'summary') {
      if (trimmedLine) {
        textBuffer.push(trimmedLine);
      }
    } else if (currentSection === 'insights') {
      // Parse bullet points
      const bulletMatch = trimmedLine.match(/^[*\-•]\s*(.+)$/);
      if (bulletMatch) {
        result.insights.push(bulletMatch[1].trim());
      } else if (trimmedLine && !trimmedLine.startsWith('#')) {
        // Non-bullet insight text
        result.insights.push(trimmedLine);
      }
    } else if (currentSection === 'data') {
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        textBuffer.push(trimmedLine);
      }
    }
  }

  // Flush remaining text
  flushTextBuffer();

  // Handle unclosed code block
  if (currentCodeBlock) {
    parseAndAddCodeBlock();
  }

  return result;

  function flushTextBuffer() {
    if (textBuffer.length === 0) return;

    const text = textBuffer.join(' ').trim();
    textBuffer = [];

    if (!text) return;

    if (currentSection === 'summary') {
      result.summary = text;
    } else if (currentSection === 'data') {
      result.data.push({
        type: 'text',
        content: text,
      });
    }
  }

  function parseAndAddCodeBlock() {
    if (!currentCodeBlock) return;

    const content = currentCodeBlock.content.trim();
    if (!content) return;

    try {
      const parsed = JSON.parse(content) as
        | MetricBlock
        | TableBlock
        | ChartBlock;

      if (currentCodeBlock.type === 'metric') {
        result.data.push({
          type: 'metric',
          content: parsed as MetricBlock,
        });
      } else if (currentCodeBlock.type === 'table') {
        result.data.push({
          type: 'table',
          content: parsed as TableBlock,
        });
      } else if (currentCodeBlock.type === 'chart') {
        result.data.push({
          type: 'chart',
          content: parsed as ChartBlock,
        });
      }
    } catch {
      // If JSON parsing fails, add as raw text
      result.data.push({
        type: 'text',
        content: `\`\`\`${currentCodeBlock.type}\n${content}\n\`\`\``,
      });
    }
  }
}
