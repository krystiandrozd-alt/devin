// Stencil panel — draggable component library
// Organizes built-in components + saved templates by category, search, drag-to-canvas

import { COMPONENT_CATEGORIES, BPMN_CATEGORIES, DATAMODEL_CATEGORIES, DATAMAPPING_CATEGORIES, GANTT_CATEGORIES, ORG_CATEGORIES, SEQUENCE_CATEGORIES, createElementFromComponent } from './components.js?v=1.15.7';
import { getAllIcons, getCategories } from './icons.js?v=1.15.7';
import { updateSimpleNodeLayout, snapActivationToLifeline, canEmbed, findHaloParent, tuckChildInside, showDropGhost, hideDropGhost } from './canvas.js?v=1.15.7';
import { startImageAddFlow } from './image-component.js?v=1.15.7';
import * as history from './history.js?v=1.15.7';
import { getTemplates, deleteTemplate, renderTemplateThumbnail, instantiateTemplate, onTemplatesChange } from './templates.js?v=1.15.7';
import { confirmModal } from './feedback.js?v=1.15.7';
import { DIAGRAM_TYPES } from './tabs.js?v=1.15.7'; // reader-friendly workspace labels (no cycle: tabs ⊄ stencil)
