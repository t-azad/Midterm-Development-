"use strict";

/** Keep a computed cell index within the matrix boundaries. */
function clamp(value, minimum, maximum) {
  return Math.max(minimum, Math.min(maximum, value));
}

/**
 * Find the matrix cell underneath the pointer.
 * Using coordinates rather than event.target works with pointer capture,
 * including when the pointer is dragged outside the visible matrix.
 */
function cellAtPointer(clientX, clientY) {
  const bounds = matrixElement.getBoundingClientRect();
  const cellWidth = bounds.width / COLUMN_COUNT;
  const cellHeight = bounds.height / ROW_COUNT;

  return {
    row: clamp(Math.floor((clientY - bounds.top) / cellHeight), 0, ROW_COUNT - 1),
    column: clamp(Math.floor((clientX - bounds.left) / cellWidth), 0, COLUMN_COUNT - 1)
  };
}

/**
 * Classify the gesture by direction.
 * Near-horizontal and near-vertical movements select a full row/column.
 * Other movements that cross both axes select a rectangle.
 */
function getGestureType(drag, endCell, clientX, clientY) {
  const horizontalDistance = Math.abs(clientX - drag.startX);
  const verticalDistance = Math.abs(clientY - drag.startY);
  const movedRows = endCell.row !== drag.startRow;
  const movedColumns = endCell.column !== drag.startColumn;
  const maxDistance = Math.max(horizontalDistance, verticalDistance);
  const diagonalRatio = maxDistance === 0
    ? 0
    : Math.min(horizontalDistance, verticalDistance) / maxDistance;

  if (movedRows && movedColumns && diagonalRatio >= DIAGONAL_RATIO) {
    return "rectangle";
  }

  return horizontalDistance >= verticalDistance ? "row" : "column";
}

/** Preview exactly the cells that the current gesture will sort. */
function updateSelection(drag, endCell, gestureType)
{
  let selected = false;

  if (gestureType === "row") {
    selected = rowIndex === drag.startRow;
  } else if (gestureType === "column") {
    selected = columnIndex === drag.startColumn;
  } else {
    selected =
      rowIndex >= topRow &&
      rowIndex <= bottomRow &&
      columnIndex >= leftColumn &&
      columnIndex <= rightColumn;
  }

  cellElement.classList.toggle("selected", selected);
}

/** Remove drag styling without changing any values. */
function clearSelection() {
  matrixElement.querySelectorAll(".selected, .active").forEach((cellElement) => {
    cellElement.classList.remove("selected", "active");
  });
}

/** Start dragging on a numerical cell. */
matrixElement.addEventListener("pointerdown", (event) => {
  const cellElement = event.target.closest(".cell");

  if (!cellElement || event.button !== 0 || activeDrag !== null) {
    return;
  }

  activeDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    startRow: Number(cellElement.dataset.row),
    startColumn: Number(cellElement.dataset.column)
  };

  matrixElement.setPointerCapture(event.pointerId);
  cellElement.classList.add("active");
  event.preventDefault();
});

/** Show the affected row, column, or rectangle during the drag. */
matrixElement.addEventListener("pointermove", (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  const endCell = cellAtPointer(event.clientX, event.clientY);
  const gestureType = getGestureType(
    activeDrag,
    endCell,
    event.clientX,
    event.clientY
  );

  updateSelection(activeDrag, endCell, gestureType);
});

/** Apply the sort when the pointer is released. */
matrixElement.addEventListener("pointerup", (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  const drag = activeDrag;
  activeDrag = null;

  const deltaX = event.clientX - drag.startX;
  const deltaY = event.clientY - drag.startY;

  if (Math.hypot(deltaX, deltaY) < MIN_DRAG_PIXELS) {
    clearSelection();
    return;
  }

  const endCell = cellAtPointer(event.clientX, event.clientY);
  const gestureType = getGestureType(drag, endCell, event.clientX, event.clientY);

  if (gestureType === "rectangle") {
    // Downward diagonals sort ascending; upward diagonals sort descending.
    sortRectangle(
      drag.startRow,
      endCell.row,
      drag.startColumn,
      endCell.column,
      deltaY > 0
    );
  } else if (gestureType === "row") {
    sortRow(drag.startRow, deltaX > 0);
  } else {
    sortColumn(drag.startColumn, deltaY > 0);
  }

  renderMatrix();
});

/** Canceled pointer gestures must not modify the matrix. */
matrixElement.addEventListener("pointercancel", (event) => {
  if (activeDrag && event.pointerId === activeDrag.pointerId) {
    activeDrag = null;
    clearSelection();
  }
});

// Initial display: 30 rows and 40 columns, totaling 1,200 values.
renderMatrix();
