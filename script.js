"use strict";

/**
 * Direct-manipulation sorter for a 30 × 40 numerical matrix.
 * Dragging across cells selects a row, column, or rectangular region.
 * No buttons, dropdowns, or other interface widgets are required.
 */

const ROW_COUNT = 30;
const COLUMN_COUNT = 40;
const RANDOM_SEED = 7;
const MIN_DRAG_PIXELS = 12;
const DIAGONAL_RATIO = 0.35;

const matrixElement = document.getElementById("matrix");

let matrixValues = createMatrix();
let activeDrag = null;

/** Generate the same 1,200 integers (0–999) on every page load. */
function createMatrix() 
{
  let randomSeed = RANDOM_SEED;

  function nextRandom() {
    randomSeed = (17 * randomSeed + 43) % 1009;
    return randomSeed / 1009;
  }

  return Array.from({ length: ROW_COUNT }, () =>
    Array.from({ length: COLUMN_COUNT }, () =>
      Math.floor(nextRandom() * 1000)
    )
  );
}

/** Draw the matrix using exactly one DOM element per numerical value. */
function renderMatrix() {
  const fragment = document.createDocumentFragment();

  matrixValues.forEach((rowValues, rowIndex) => {
    rowValues.forEach((value, columnIndex) => {
      const cellElement = document.createElement("div");
      cellElement.className = "cell";
      cellElement.setAttribute("role", "gridcell");
      cellElement.setAttribute("aria-rowindex", String(rowIndex + 1));
      cellElement.setAttribute("aria-colindex", String(columnIndex + 1));
      cellElement.dataset.row = String(rowIndex);
      cellElement.dataset.column = String(columnIndex);
      cellElement.textContent = String(value);
      fragment.appendChild(cellElement);
    });
  });

  matrixElement.replaceChildren(fragment);
}

/** Compare numbers without lexicographic (string) sorting. */
function compareNumbers(first, second, ascending) 
{
  return ascending ? first - second : second - first;
}

/** Sort all numbers in the indicated row. */
function sortRow(rowIndex, ascending) 
{
  matrixValues[rowIndex].sort((first, second) =>
    compareNumbers(first, second, ascending)
  );
}

/** Sort all numbers in the indicated column. */
function sortColumn(columnIndex, ascending) 
{
  const columnValues = matrixValues.map((row) => row[columnIndex]);

  columnValues.sort((first, second) =>
    compareNumbers(first, second, ascending)
  );

  columnValues.forEach((value, rowIndex) => {
    matrixValues[rowIndex][columnIndex] = value;
  });
}

/**
 * Sort only the rectangle bounded by the starting and ending cells.
 * First sort each selected row, then each selected column. Column sorting
 * preserves the row ordering, so both axes are sorted after these passes.
 * Cells outside the rectangle are never modified.
 */
function sortRectangle(startRow, endRow, startColumn, endColumn, ascending) 
{
  const topRow = Math.min(startRow, endRow);
  const bottomRow = Math.max(startRow, endRow);
  const leftColumn = Math.min(startColumn, endColumn);
  const rightColumn = Math.max(startColumn, endColumn);

  // Sort the selected values within each row.
  for (let rowIndex = topRow; rowIndex <= bottomRow; rowIndex += 1) 
  {
    const sortedValues = matrixValues[rowIndex]
      .slice(leftColumn, rightColumn + 1)
      .sort((first, second) => compareNumbers(first, second, ascending));

    sortedValues.forEach((value, offset) => {
      matrixValues[rowIndex][leftColumn + offset] = value;
    });
  }

  // Sort the selected values within each column.
  for (let columnIndex = leftColumn; columnIndex <= rightColumn; columnIndex += 1) 
  {
    const columnValues = [];

    for (let rowIndex = topRow; rowIndex <= bottomRow; rowIndex += 1) {
      columnValues.push(matrixValues[rowIndex][columnIndex]);
    }

    columnValues.sort((first, second) =>
      compareNumbers(first, second, ascending)
    );

    columnValues.forEach((value, offset) => {
      matrixValues[topRow + offset][columnIndex] = value;
    });
  }
}

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

/** Highlight the row, column, or rectangle affected by the drag. */
function updateSelection(drag, endCell, gestureType) {
  const topRow = Math.min(drag.startRow, endCell.row);
  const bottomRow = Math.max(drag.startRow, endCell.row);
  const leftColumn = Math.min(drag.startColumn, endCell.column);
  const rightColumn = Math.max(drag.startColumn, endCell.column);

  matrixElement.querySelectorAll(".cell").forEach((cellElement) => {
    const rowIndex = Number(cellElement.dataset.row);
    const columnIndex = Number(cellElement.dataset.column);

    let selected;

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
  });
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
