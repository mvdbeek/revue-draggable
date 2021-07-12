import { isNum, int } from './shims';
import { getTouch, innerWidth, innerHeight, offsetXYFromParent, outerWidth, outerHeight } from './domFns';
import type { Bounds, ControlPosition, DraggableData, MouseTouchEvent } from './types';

export function getBoundPosition({ bounds, x, y, node }: { bounds: any; x: number; y: number; node: any }): [number, number] {
  // If no bounds, short-circuit and move on
  if (!bounds) return [x, y];
  // Clone new bounds
  bounds = typeof bounds === 'string' ? bounds : cloneBounds(bounds);

  if (typeof bounds === 'string') {
    const { ownerDocument } = node;
    const ownerWindow = ownerDocument.defaultView;
    let boundNode;
    if (bounds === 'parent') {
      boundNode = node.parentNode;
    } else {
      boundNode = ownerDocument.querySelector(bounds);
    }
    if (!(ownerWindow && boundNode instanceof ownerWindow.HTMLElement)) {
      throw new Error('Bounds selector "' + bounds + '" could not find an element.');
    }
    const nodeStyle = ownerWindow.getComputedStyle(node);
    const boundNodeStyle = ownerWindow.getComputedStyle(boundNode);
    // Compute bounds. This is a pain with padding and offsets but this gets it exactly right.
    bounds = {
      left: -node.offsetLeft + int(boundNodeStyle.paddingLeft) + int(nodeStyle.marginLeft),
      top: -node.offsetTop + int(boundNodeStyle.paddingTop) + int(nodeStyle.marginTop),
      right:
        innerWidth(boundNode) -
        outerWidth(node) -
        node.offsetLeft +
        int(boundNodeStyle.paddingRight) -
        int(nodeStyle.marginRight),
      bottom:
        innerHeight(boundNode) -
        outerHeight(node) -
        node.offsetTop +
        int(boundNodeStyle.paddingBottom) -
        int(nodeStyle.marginBottom)
    };
  }

  // Keep x and y below right and bottom limits...
  if (isNum(bounds.right)) x = Math.min(x, bounds.right);
  if (isNum(bounds.bottom)) y = Math.min(y, bounds.bottom);

  // But above left and top limits.
  if (isNum(bounds.left)) x = Math.max(x, bounds.left);
  if (isNum(bounds.top)) y = Math.max(y, bounds.top);

  return [x, y];
}

export function snapToGrid(grid: [number, number], pendingX: number, pendingY: number): [number, number] {
  const x = Math.round(pendingX / grid[0]) * grid[0];
  const y = Math.round(pendingY / grid[1]) * grid[1];
  return [x, y];
}

export function canDragX(axis: 'both' | 'x' | 'y' | 'none'): boolean {
  return axis === 'both' || axis === 'x';
}

export function canDragY(axis: 'both' | 'x' | 'y' | 'none'): boolean {
  return axis === 'both' || axis === 'y';
}

export function getControlPosition({
  e,
  touchIdentifier,
  node,
  offsetContainer,
  scale
}: {
  e: MouseTouchEvent;
  touchIdentifier: number | undefined;
  node: HTMLElement;
  offsetContainer: HTMLElement;
  scale: number;
}): ControlPosition | null {
  const touchObj = typeof touchIdentifier === 'number' ? getTouch(e, touchIdentifier) : null;
  if (typeof touchIdentifier === 'number' && !touchObj) return null; // not the right touch
  // User can provide an offsetParent if desired.
  const offsetParent = offsetContainer || node.offsetParent || node.ownerDocument.body;
  return offsetXYFromParent(touchObj || e, offsetParent, scale);
}

// Create an data object exposed by <DraggableCore>'s events
export function createCoreData({
  node,
  x,
  y,
  lastX,
  lastY
}: {
  node: HTMLElement;
  x: number;
  y: number;
  lastX: number;
  lastY: number;
}): DraggableData {
  const isStart = !isNaN(lastX);
  if (!isStart) {
    // If this is our first move, use the x and y as last coords.
    return {
      node,
      deltaX: 0,
      deltaY: 0,
      lastX: x,
      lastY: y,
      x,
      y
    };
  } else {
    // Otherwise calculate proper values.
    return {
      node,
      deltaX: x - lastX,
      deltaY: y - lastY,
      lastX,
      lastY,
      x,
      y
    };
  }
}

// Create an data exposed by <Draggable>'s events
export function createDraggableData({
  scale,
  x,
  y,
  coreData
}: {
  scale: number;
  x: number;
  y: number;
  coreData: DraggableData;
}): DraggableData {
  return {
    node: coreData.node,
    x: x + coreData.deltaX / scale,
    y: y + coreData.deltaY / scale,
    deltaX: coreData.deltaX / scale,
    deltaY: coreData.deltaY / scale,
    lastX: x,
    lastY: y
  };
}

// A lot faster than stringify/parse
function cloneBounds(bounds: Bounds): Bounds {
  return {
    left: bounds.left,
    top: bounds.top,
    right: bounds.right,
    bottom: bounds.bottom
  };
}
