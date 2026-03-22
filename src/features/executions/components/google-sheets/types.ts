/**
 * Represents an upstream node that can provide data to the Google Sheets node.
 * Used by both node.tsx (to discover sources) and dialog.tsx (to display them).
 */
export type UpstreamSource = {
  nodeId: string;
  nodeType: string;
  label: string;
  variableKey: string;
  savedResponseNames: string[];
};
