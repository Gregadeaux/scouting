'use client';

import React, { useMemo, useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronRight, Copy, Check, FileJson } from 'lucide-react';

interface JsonSchemaViewerProps {
  schema: Record<string, unknown> | null | undefined;
  title?: string;
  description?: string;
  defaultExpanded?: boolean;
  maxHeight?: string;
}

/**
 * Token types for syntax highlighting
 */
type TokenType = 'key' | 'string' | 'number' | 'boolean' | 'null' | 'bracket' | 'punctuation';

/**
 * Get CSS class for token type
 */
function getTokenClass(type: TokenType): string {
  switch (type) {
    case 'key':
      return 'text-purple-600 dark:text-purple-400';
    case 'string':
      return 'text-green-600 dark:text-green-400';
    case 'number':
      return 'text-blue-600 dark:text-blue-400';
    case 'boolean':
      return 'text-orange-600 dark:text-orange-400';
    case 'null':
      return 'text-gray-500 dark:text-gray-500';
    case 'bracket':
      return 'text-gray-700 dark:text-gray-300';
    case 'punctuation':
      return 'text-gray-500 dark:text-gray-500';
    default:
      return 'text-gray-800 dark:text-gray-200';
  }
}

/**
 * Render a syntax-highlighted JSON token
 */
function Token({ type, children }: { type: TokenType; children: React.ReactNode }) {
  return <span className={getTokenClass(type)}>{children}</span>;
}

/**
 * Recursively render JSON with syntax highlighting
 */
function renderJson(
  data: unknown,
  indent: number = 0,
  isLast: boolean = true
): React.ReactNode {
  const indentStr = '  '.repeat(indent);
  const nextIndentStr = '  '.repeat(indent + 1);

  if (data === null) {
    return (
      <>
        <Token type="null">null</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  if (typeof data === 'boolean') {
    return (
      <>
        <Token type="boolean">{data.toString()}</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  if (typeof data === 'number') {
    return (
      <>
        <Token type="number">{data.toString()}</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  if (typeof data === 'string') {
    return (
      <>
        <Token type="string">&quot;{data}&quot;</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  if (Array.isArray(data)) {
    if (data.length === 0) {
      return (
        <>
          <Token type="bracket">[]</Token>
          {!isLast && <Token type="punctuation">,</Token>}
          {'\n'}
        </>
      );
    }

    return (
      <>
        <Token type="bracket">[</Token>
        {'\n'}
        {data.map((item, index) => (
          <React.Fragment key={index}>
            {nextIndentStr}
            {renderJson(item, indent + 1, index === data.length - 1)}
          </React.Fragment>
        ))}
        {indentStr}
        <Token type="bracket">]</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  if (typeof data === 'object') {
    const entries = Object.entries(data);
    if (entries.length === 0) {
      return (
        <>
          <Token type="bracket">{'{}'}</Token>
          {!isLast && <Token type="punctuation">,</Token>}
          {'\n'}
        </>
      );
    }

    return (
      <>
        <Token type="bracket">{'{'}</Token>
        {'\n'}
        {entries.map(([key, value], index) => (
          <React.Fragment key={key}>
            {nextIndentStr}
            <Token type="key">&quot;{key}&quot;</Token>
            <Token type="punctuation">: </Token>
            {renderJson(value, indent + 1, index === entries.length - 1)}
          </React.Fragment>
        ))}
        {indentStr}
        <Token type="bracket">{'}'}</Token>
        {!isLast && <Token type="punctuation">,</Token>}
        {'\n'}
      </>
    );
  }

  return (
    <>
      <Token type="string">{String(data)}</Token>
      {!isLast && <Token type="punctuation">,</Token>}
      {'\n'}
    </>
  );
}

/**
 * Count properties in a JSON schema
 */
function countSchemaProperties(schema: Record<string, unknown>): number {
  const properties = schema.properties as Record<string, unknown> | undefined;
  return properties ? Object.keys(properties).length : 0;
}

/**
 * JsonSchemaViewer Component
 *
 * Displays a JSON schema with syntax highlighting and collapsible sections.
 * Designed for viewing FRC season configuration schemas.
 *
 * @example
 * ```tsx
 * <JsonSchemaViewer
 *   schema={autoSchema}
 *   title="Auto Performance Schema"
 *   description="JSON schema for autonomous period scouting data"
 * />
 * ```
 */
export function JsonSchemaViewer({
  schema,
  title,
  description,
  defaultExpanded = false,
  maxHeight = '400px',
}: JsonSchemaViewerProps) {
  const [isExpanded, setIsExpanded] = useState(defaultExpanded);
  const [copied, setCopied] = useState(false);

  const renderedJson = useMemo(() => {
    if (!schema) return null;
    return renderJson(schema, 0, true);
  }, [schema]);

  const propertyCount = useMemo(() => {
    if (!schema) return 0;
    return countSchemaProperties(schema);
  }, [schema]);

  const handleCopy = async () => {
    if (!schema) return;
    try {
      await navigator.clipboard.writeText(JSON.stringify(schema, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  };

  // No schema state
  if (!schema) {
    return (
      <Card>
        {title && (
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileJson className="h-5 w-5 text-gray-400" />
              {title}
            </CardTitle>
            {description && (
              <p className="text-sm text-gray-600 dark:text-gray-400">{description}</p>
            )}
          </CardHeader>
        )}
        <CardContent>
          <div className="flex items-center justify-center py-8 text-gray-500 dark:text-gray-400">
            <span>No schema defined</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="h-8 w-8 p-0"
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
            <CardTitle className="flex items-center gap-2 text-lg">
              <FileJson className="h-5 w-5 text-blue-500" />
              {title || 'JSON Schema'}
            </CardTitle>
            <Badge variant="secondary" className="ml-2">
              {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
            </Badge>
          </div>
          <Button
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="flex items-center gap-1"
          >
            {copied ? (
              <>
                <Check className="h-4 w-4" />
                Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" />
                Copy
              </>
            )}
          </Button>
        </div>
        {description && (
          <p className="ml-10 text-sm text-gray-600 dark:text-gray-400">{description}</p>
        )}
      </CardHeader>

      {isExpanded && (
        <CardContent className="pt-0">
          <div
            className="overflow-auto rounded-lg bg-gray-50 p-4 dark:bg-gray-900"
            style={{ maxHeight }}
          >
            <pre className="font-mono text-sm leading-relaxed">
              <code>{renderedJson}</code>
            </pre>
          </div>
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Compact variant for inline schema preview
 */
export function JsonSchemaPreview({
  schema,
  label,
}: {
  schema: Record<string, unknown> | null | undefined;
  label?: string;
}) {
  const propertyCount = useMemo(() => {
    if (!schema) return 0;
    return countSchemaProperties(schema);
  }, [schema]);

  if (!schema) {
    return (
      <div className="flex items-center gap-2 text-sm text-gray-500">
        <FileJson className="h-4 w-4" />
        {label && <span>{label}:</span>}
        <span className="italic">Not defined</span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 text-sm">
      <FileJson className="h-4 w-4 text-blue-500" />
      {label && <span className="text-gray-600 dark:text-gray-400">{label}:</span>}
      <Badge variant="secondary">
        {propertyCount} {propertyCount === 1 ? 'property' : 'properties'}
      </Badge>
    </div>
  );
}
