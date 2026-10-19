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
