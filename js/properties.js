// Properties panel — left sidebar element inspector
// Properties are grouped into collapsible accordion sections

import { wrapSelectionWithMarker } from './markdown.js?v=1.15.7';
import { confirmModal, showToast, buildModal } from './feedback.js?v=1.15.7';
import { getAllIcons, getIconDataUri } from './icons.js?v=1.15.7';
import { Z_BASE, Z_TIER_SPAN, tierNameForType, updateSimpleNodeLayout, updateDataObjectHeaderLayout, syncMobilePanelHeight, canEmbed, applyMappingLinkStyle, applyRelationshipLinkStyle, syncMappingTypeBadge, syncFrequencyLabel } from './canvas.js?v=1.15.7';
import * as stencilModule from './stencil.js?v=1.15.7';
import { getPalette, addToPalette, removeFromPalette, onPaletteChange, PALETTE_MAX_SLOTS } from './brand-palette.js?v=1.15.7';
import { resizeDataObjectToFit, contrastTextColor, getStencilSvgDataUri, SVG as COMPONENT_SVG, extractLinkDomain } from './components.js?v=1.15.7';
import {
  duplicate as clipboardDuplicate,
  cloneElementWithConnectors,
  countConnectors,
  countConnectedConnectors,
  cloneSelectionWithMode,
  countExternalConnectors,
  countExternalConnectedConnectors,
} from './clipboard.js?v=1.15.7';
import * as history from './history.js?v=1.15.7';
import { startImageAddFlow } from './image-component.js?v=1.15.7';
import { escHtml, sanitizeFilenamePart } from './util.js?v=1.15.7';
import { getActiveTabName } from './tabs.js?v=1.15.7';
import { saveSelectionAsTemplate } from './templates.js?v=1.15.7';
import { newFid } from './shapes.js?v=1.15.7';

/**
 * Wrap a callback so every mutation inside it (potentially many
 * `cell.attr()` calls across one or more elements) is collapsed into a
 * SINGLE undo command. Without this, picking a colour on a SimpleNode
 * would push 4 separate commands (body/fill, label/fill, subtitle/fill,
 * subtitle/opacity) and Cmd+Z would only revert the last one.
 */
function asUndoBatch(fn) {
  return (...args) => {
    history.startBatch();
    try { fn(...args); }
    finally { history.endBatch(); }
  };
}

/** Resolve a color value — if it's a CSS var(), compute the actual color; otherwise return as-is. */
function resolveColor(color) {
  if (!color) return '';
  if (color.startsWith('var(')) {
    return getComputedStyle(document.documentElement).getPropertyValue(
      color.replace(/^var\(/, '').replace(/\)$/, '').split(',')[0].trim()
    ).trim() || '#1C1E21';
  }
  return color;
}

// Human-readable display names for shape types
const TYPE_LABELS = {
  'sf.SimpleNode':     'Node',
  'sf.Container':      'Container',
  'sf.TextLabel':      'Text',
  'sf.Note':           'Note',
  'sf.Image':          'Image',
  'sf.Task':           'Task',
  'sf.TaskGroup':      'Task Group',
  'sf.Zone':           'Zone',
  'sf.BpmnEvent':      'Event',
  'sf.BpmnTask':       'Task',
  'sf.BpmnGateway':    'Gateway',
  'sf.BpmnSubprocess': 'Subprocess',
  'sf.BpmnLoop':       'Loop',
  'sf.BpmnPool':       'Pool',
  'sf.BpmnDataObject': 'Data Object',
  'sf.FlowProcess':    'Process',
  'sf.FlowDecision':   'Decision',
  'sf.FlowTerminator': 'Terminator',
  'sf.FlowDatabase':   'Database',
  'sf.FlowDocument':   'Document',
  'sf.FlowIO':         'Input / Output',
  'sf.FlowPredefined': 'Predefined Process',
  'sf.FlowOffPage':    'Off-Page Link',
  'sf.Annotation':     'Annotation',
  'sf.Line':           'Line',
  'sf.Link':           'Link',
  'sf.DataObject':     'Object',
  'sf.OrgPerson':      'Person',
  'sf.GanttTask':      'Task',
  'sf.GanttMilestone': 'Milestone',
  'sf.GanttMarker':    'Today Marker',
  'sf.GanttTimeline':  'Timeline',
  'sf.GanttGroup':     'Group',
  'sf.SequenceParticipant': 'Participant',
  'sf.SequenceActor':       'Actor',
  'sf.SequenceActivation':  'Activation',
  'sf.SequenceFragment':    'Fragment',
};

/** The user-facing name of a cell (its label), or '' if unnamed. Single source of the
 *  label-accessor chain the inspector uses — reused by the a11y narrator. */
export function cellName(cell) {
  if (!cell) return '';
  if (cell.isLink?.()) return cell.labels?.()?.[0]?.attrs?.text?.text || '';
  return cell.get('_savedLabel') || cell.get('objectName')
    || cell.attr?.('label/text') || cell.attr?.('headerLabel/text') || '';
}

/** A concise screen-reader description of a cell: type + name (+ endpoints for connectors).
 *  e.g. "Object: Contact", "Node: Alpha", "Connector from Alpha to Beta". */
export function describeCell(cell) {
  if (!cell) return '';
  if (cell.isLink?.()) {
    const label = cellName(cell);
    const from = cellName(cell.getSourceCell?.());
    const to = cellName(cell.getTargetCell?.());
    const ends = (from || to) ? ` from ${from || 'a shape'} to ${to || 'a shape'}` : '';
    return `Connector${label ? ` ${label}` : ''}${ends}`;
  }
  const type = cell.get('type') || '';
  const typeLabel = cell.get('iconMode') ? 'Icon' : (TYPE_LABELS[type] || type.replace('sf.', '') || 'Element');
  const name = cellName(cell);
  return `${typeLabel}${name ? `: ${name}` : ''}`;
}
