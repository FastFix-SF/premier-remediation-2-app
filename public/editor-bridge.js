/**
 * Editor Bridge Script
 * 
 * This script is injected into white-label sites to enable visual editing.
 * It listens for postMessage events from the parent admin dashboard
 * and allows clicking on elements to select them for editing.
 */
(function() {
  'use strict';

  let isEditMode = false;
  let currentHighlight = null;
  let selectedElement = null;

  // Allowed origins for security (customize as needed)
  const allowedOrigins = [
    'https://fastfixai.lovable.app',
    'http://localhost:5173',
    'http://localhost:3000',
    window.location.origin
  ];

  // Create highlight overlay element
  const highlightOverlay = document.createElement('div');
  highlightOverlay.id = 'visual-editor-highlight';
  highlightOverlay.style.cssText = `
    position: fixed;
    pointer-events: none;
    border: 2px solid #8B5CF6;
    background: rgba(139, 92, 246, 0.1);
    z-index: 999999;
    display: none;
    transition: all 0.1s ease-out;
    box-shadow: 0 0 0 4px rgba(139, 92, 246, 0.2);
  `;
  document.body.appendChild(highlightOverlay);

  // Create selection indicator
  const selectionLabel = document.createElement('div');
  selectionLabel.id = 'visual-editor-label';
  selectionLabel.style.cssText = `
    position: fixed;
    background: #8B5CF6;
    color: white;
    font-size: 12px;
    font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
    padding: 4px 8px;
    border-radius: 4px;
    z-index: 1000000;
    display: none;
    white-space: nowrap;
    box-shadow: 0 2px 8px rgba(0,0,0,0.2);
  `;
  document.body.appendChild(selectionLabel);

  // Generate a unique CSS selector for an element
  function getCssSelector(el) {
    if (!el || el === document.body || el === document.documentElement) {
      return 'body';
    }

    // Try ID first
    if (el.id) {
      return '#' + CSS.escape(el.id);
    }

    // Build path
    const parts = [];
    let current = el;

    while (current && current !== document.body && current !== document.documentElement) {
      let selector = current.tagName.toLowerCase();

      // Add relevant classes (skip utility classes)
      const meaningfulClasses = Array.from(current.classList || [])
        .filter(c => !c.match(/^(w-|h-|p-|m-|flex|grid|text-|bg-|border-|rounded)/))
        .slice(0, 2);
      
      if (meaningfulClasses.length > 0) {
        selector += '.' + meaningfulClasses.map(c => CSS.escape(c)).join('.');
      }

      // Add nth-child if needed for specificity
      const parent = current.parentElement;
      if (parent) {
        const siblings = Array.from(parent.children).filter(c => c.tagName === current.tagName);
        if (siblings.length > 1) {
          const index = siblings.indexOf(current) + 1;
          selector += ':nth-child(' + index + ')';
        }
      }

      parts.unshift(selector);
      current = current.parentElement;
    }

    return parts.join(' > ');
  }

  // Generate XPath for an element
  function getXPath(el) {
    if (!el) return '';
    
    const parts = [];
    let current = el;

    while (current && current.nodeType === Node.ELEMENT_NODE) {
      let index = 1;
      let sibling = current.previousSibling;
      
      while (sibling) {
        if (sibling.nodeType === Node.ELEMENT_NODE && sibling.tagName === current.tagName) {
          index++;
        }
        sibling = sibling.previousSibling;
      }

      const tagName = current.tagName.toLowerCase();
      parts.unshift(tagName + '[' + index + ']');
      current = current.parentNode;
    }

    return '/' + parts.join('/');
  }

  // Get clean text content (first 100 chars)
  function getTextContent(el) {
    const text = el.textContent || '';
    return text.replace(/\s+/g, ' ').trim().substring(0, 100);
  }

  // Update highlight position
  function updateHighlight(el) {
    if (!el) {
      highlightOverlay.style.display = 'none';
      selectionLabel.style.display = 'none';
      return;
    }

    const rect = el.getBoundingClientRect();
    
    highlightOverlay.style.display = 'block';
    highlightOverlay.style.top = rect.top + 'px';
    highlightOverlay.style.left = rect.left + 'px';
    highlightOverlay.style.width = rect.width + 'px';
    highlightOverlay.style.height = rect.height + 'px';

    // Position label
    const tagName = el.tagName.toLowerCase();
    const className = el.className ? '.' + el.className.split(' ')[0] : '';
    selectionLabel.textContent = tagName + className;
    selectionLabel.style.display = 'block';
    selectionLabel.style.top = Math.max(0, rect.top - 26) + 'px';
    selectionLabel.style.left = rect.left + 'px';
  }

  // Handle mouse move in edit mode
  function handleMouseMove(e) {
    if (!isEditMode) return;
    
    // Ignore our own UI elements
    if (e.target.id === 'visual-editor-highlight' || 
        e.target.id === 'visual-editor-label') {
      return;
    }

    currentHighlight = e.target;
    updateHighlight(e.target);
  }

  // Handle click in edit mode
  function handleClick(e) {
    if (!isEditMode) return;

    // Ignore our own UI elements
    if (e.target.id === 'visual-editor-highlight' || 
        e.target.id === 'visual-editor-label') {
      return;
    }

    e.preventDefault();
    e.stopPropagation();

    selectedElement = e.target;
    const rect = selectedElement.getBoundingClientRect();

    // Send selection data to parent
    const payload = {
      type: 'ELEMENT_SELECTED',
      selector: getCssSelector(selectedElement),
      xpath: getXPath(selectedElement),
      tagName: selectedElement.tagName,
      id: selectedElement.id || null,
      className: selectedElement.className || '',
      textContent: getTextContent(selectedElement),
      innerHTML: selectedElement.innerHTML.substring(0, 500),
      attributes: {},
      boundingRect: {
        top: rect.top,
        left: rect.left,
        width: rect.width,
        height: rect.height,
        x: rect.x,
        y: rect.y
      },
      computedStyles: {
        color: window.getComputedStyle(selectedElement).color,
        backgroundColor: window.getComputedStyle(selectedElement).backgroundColor,
        fontSize: window.getComputedStyle(selectedElement).fontSize,
        fontWeight: window.getComputedStyle(selectedElement).fontWeight,
      }
    };

    // Collect important attributes
    ['href', 'src', 'alt', 'data-testid', 'role', 'aria-label'].forEach(attr => {
      if (selectedElement.hasAttribute(attr)) {
        payload.attributes[attr] = selectedElement.getAttribute(attr);
      }
    });

    window.parent.postMessage(payload, '*');
  }

  // Listen for messages from parent
  window.addEventListener('message', function(event) {
    // Security check - verify origin in production
    // if (!allowedOrigins.includes(event.origin)) return;

    const data = event.data;

    if (data.type === 'ENTER_EDIT_MODE') {
      isEditMode = true;
      document.body.style.cursor = 'crosshair';
      console.log('[EditorBridge] Edit mode activated');
    }

    if (data.type === 'EXIT_EDIT_MODE') {
      isEditMode = false;
      document.body.style.cursor = '';
      highlightOverlay.style.display = 'none';
      selectionLabel.style.display = 'none';
      currentHighlight = null;
      selectedElement = null;
      console.log('[EditorBridge] Edit mode deactivated');
    }

    if (data.type === 'REFRESH_PREVIEW') {
      window.location.reload();
    }

    if (data.type === 'PING') {
      window.parent.postMessage({ type: 'PONG', ready: true }, '*');
    }
  });

  // Attach event listeners
  document.addEventListener('mousemove', handleMouseMove, true);
  document.addEventListener('click', handleClick, true);

  // Handle scroll - update highlight position
  window.addEventListener('scroll', function() {
    if (currentHighlight && isEditMode) {
      updateHighlight(currentHighlight);
    }
  }, true);

  // Announce ready
  console.log('[EditorBridge] Visual editor bridge loaded');
  window.parent.postMessage({ type: 'BRIDGE_READY' }, '*');
})();