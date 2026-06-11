// Properties panel — left sidebar element inspector
// Properties are grouped into collapsible accordion sections

import { wrapSelectionWithMarker } from './markdown.js?v=1.15.7';
import { confirmModal, showToast, buildModal } from './feedback.js?v=1.15.7';
import { getAllIcons, getIconDataUri } from './icons.js?v=1.15.7';
import { Z_BASE, Z_TIER_SPAN, tierNameForType, updateSimpleNodeLayout, updateDataObjectHeaderLayout, syncMobilePanelHeight, canEmbed, applyMappingLinkStyle, applyRelationshipLinkStyle, syncMappingTypeBadge, syncFrequencyLabel } from './canvas.js?v=1.15.7';
import * as stencilModule from './stencil.js?v=1.15.7';
import { getPalette, addToPalette, removeFromPalette, onPaletteChange, PALETTE_MAX_SLOTS } from './brand-palette.js?v=1.15.7';
import { resizeDataObjectToFit, contrastTextColor, getStencilSvgDataUri, SVG as COMPONENT_SVG, extractLinkDomain } from './components.js?v=1.15.7';