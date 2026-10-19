"use strict";

/**
 * Matrix sorter: users drag directly on cells to sort numerical values.
 * No separate sorting buttons, menus, or other widgets are used.
 */

// Configuration constants.
const ROW_COUNT = 30;
const COLUMN_COUNT = 40;
const MIN_DRAG_PIXELS = 24;
const DIAGONAL_RATIO = 0.55;
const RANDOM_SEED = 20261016;

const matrixElement = document.getElementById("matrix");
let matrixValues = createMatrix();
let activeDrag = null;

/**
 * Generate reproducible integers in the range 0–999.
 * The seed ensures the initial matrix is identical on every page load.
 */
function createMatrix() {
  let seed = RANDOM_SEED;

  function nextRandom() {
    seed = (1664525 * seed + 1013904223) >>> 0;
    return seed / 4294967296;
  }

  return Array.from({ length: ROW_COUNT }, () =>
    Array.from({ length: COLUMN_COUNT }, () =>
      Math.floor(nextRandom() * 1000)
    )
  );
}

/** Render exactly 30 × 40 cells using a single document fragment. */
function renderMatrix() {
  const fragment = document.createDocumentFragment();

  matrixValues.forEach((rowValues, rowIndex) => {
    rowValues.forEach((value, columnIndex) => {
      const cell = document.createElement("div");
      cell.className = "cell";
      cell.setAttribute("role", "gridcell");
      cell.setAttribute("aria-rowindex", String(rowIndex + 1));
      cell.setAttribute("aria-colindex", String(columnIndex + 1));
      cell.dataset.row = String(rowIndex);
      cell.dataset.column = String(columnIndex);
      cell.textContent = String(value);
      fragment.appendChild(cell);
    });
  });

  matrixElement.replaceChildren(fragment);
}

/** Numeric comparator used for both ascending and descending sorting. */
function compareNumbers(first, second, ascending) {
  return ascending ? first - second : second - first;
}

/** Sort one row without changing values in other rows. */
function sortRow(rowIndex, ascending) {
  matrixValues[rowIndex].sort((first, second) =>
    compareNumbers(first, second, ascending)
  );
}

/** Sort one column without changing values in other columns. */
function sortColumn(columnIndex, ascending) {
  const columnValues = matrixValues.map((row) => row[columnIndex]);

  columnValues.sort((first, second) =>
    compareNumbers(first, second, ascending)
  );

  columnValues.forEach((value, rowIndex) => {
    matrixValues[rowIndex][columnIndex] = value;
  });
}

/**
 * Sort every row, then every column.
 * Sorting the columns preserves row ordering because corresponding
 * order statistics of already ordered neighboring columns stay ordered.
 */
function sortBothAxes(ascending) {
  for (let rowIndex = 0; rowIndex < ROW_COUNT; rowIndex += 1) {
    sortRow(rowIndex, ascending);
  }

  for (let columnIndex = 0; columnIndex < COLUMN_COUNT; columnIndex += 1) {
    sortColumn(columnIndex, ascending);
  }
}

/**
 * Convert drag direction into a sorting operation.
 * Horizontal gestures sort the selected row; vertical gestures sort
 * the selected column; down-right and up-left sort both axes.
 * Other diagonal gestures use their dominant direction.
 */
function applySortingGesture(deltaX, deltaY, rowIndex, columnIndex) {
  const horizontalDistance = Math.abs(deltaX);
  const verticalDistance = Math.abs(deltaY);
  const totalDistance = Math.hypot(deltaX, deltaY);

  // Ignore accidental clicks or very short drags.
  if (totalDistance < MIN_DRAG_PIXELS) {
    return;
  }

  const smallerDistance = Math.min(horizontalDistance, verticalDistance);
  const largerDistance = Math.max(horizontalDistance, verticalDistance);
  const isDiagonal = smallerDistance / largerDistance >= DIAGONAL_RATIO;

  if (isDiagonal && deltaX > 0 && deltaY > 0) {
    sortBothAxes(true);
  } else if (isDiagonal && deltaX < 0 && deltaY < 0) {
    sortBothAxes(false);
  } else if (horizontalDistance >= verticalDistance) {
    sortRow(rowIndex, deltaX > 0);
  } else {
    sortColumn(columnIndex, deltaY > 0);
  }

  // Show the sorted matrix immediately.
  renderMatrix();
}

/** Remove the highlight if a drag is canceled or finishes without sorting. */
function clearDragHighlight() {
  const highlightedCell = matrixElement.querySelector(".cell.active");

  if (highlightedCell) {
    highlightedCell.classList.remove("active");
  }
}

/** Record the selected cell and starting position of the pointer. */
matrixElement.addEventListener("pointerdown", (event) => {
  const cell = event.target.closest(".cell");

  if (!cell || event.button !== 0 || activeDrag !== null) {
    return;
  }

  activeDrag = {
    pointerId: event.pointerId,
    startX: event.clientX,
    startY: event.clientY,
    rowIndex: Number(cell.dataset.row),
    columnIndex: Number(cell.dataset.column)
  };

  matrixElement.setPointerCapture(event.pointerId);
  cell.classList.add("active");
  event.preventDefault();
});

/** Complete the drag and apply the appropriate sorting operation. */
matrixElement.addEventListener("pointerup", (event) => {
  if (!activeDrag || event.pointerId !== activeDrag.pointerId) {
    return;
  }

  const { startX, startY, rowIndex, columnIndex } = activeDrag;
  activeDrag = null;

  applySortingGesture(
    event.clientX - startX,
    event.clientY - startY,
    rowIndex,
    columnIndex
  );

  clearDragHighlight();
});

/** Abandon interrupted gestures without changing any numbers. */
matrixElement.addEventListener("pointercancel", (event) => {
  if (activeDrag && event.pointerId === activeDrag.pointerId) {
    activeDrag = null;
    clearDragHighlight();
  }
});

// Display the original 1,200 numerical values when the page loads.
renderMatrix();
