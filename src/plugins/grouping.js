// TODO:
// 1) show / hide groups -> see bindEvents method
// 2) render options (+/-) for each group
// 3) tests

/*
 1) TODO: lining up expander buttons, when multiple groups collapse to the same slot
 2) TODO: displaying expander buttons, when all rows are collapsed
 [v] 3) TODOne: clicking the collapse/expand button shouldn't select the whole row
 [v] 4) TODOne: expanding a collapsed group, which contains another collapsed group should expand the parent group, but not the child group
 5) TODO: Write tests for checking group header content, because they seem not to work
 [v] 6) TODOne : Fix scrolling issue (when a row group is collapsed, scrolling past it is real choppy)
 7) TODO: Error / Warning handling
 [v] 8) TODOne: Keyboard control (skipping grouped cols/rows)
 [v] TODOne: Unable user to select cell in merged column
 10) TODO: hide all cols/rows on a level
 [v] TODOne: check why top headers are off by a few pixels
 */

var Grouping = function (instance) {
  /**
   * array of items
   * @type {Array}
   */
  var groups = [];

  /**
   * group definition
   * @type {{id: String, level: Number, rows: Array, cols: Array, hidden: Number}}
   */
  var item = {
    id: '',
    level: 0,
    hidden: 0,
    rows: [],
    cols: []
  };

  /**
   * total rows and cols merged in groups
   * @type {{rows: number, cols: number}}
   */
  var counters = {
    rows: 0,
    cols: 0
  };

  /**
   * group levels
   * @type {{rows: number, cols: number}}
   */
  var levels = {
    rows: 1,
    cols: 1
  };

  /**
   * List of hidden rows
   * @type {Array}
   */
  var hiddenRows = [];

  /**
   * List of hidden columns
   * @type {Array}
   */
  var hiddenCols = [];

  var rootElement = instance.rootElement[0].parentNode;

  /**
   * default css class
   * @type {string}
   */
  var cssClass = 'group';

  /**
   * last clicked item
   * @type {Object}
   */
  var lastClicked = null;

  /**
   * create group element
   * @param item
   * @returns {HTMLElement}
   */
  var createGroupElement = function (item) {
    var li = document.createElement('li');

    li.innerHTML = item.id;
    li.className = cssClass;

    var type = '';

    if (item.cols instanceof Array) {
      type = 'cols';
    } else {
      type = 'rows';
    }

    li.setAttribute('id', item.id);
    li.setAttribute('level', item.level.toString());
    li.setAttribute('type', type);

    return li;
  };

  /**
   * compare object properties
   * @param {String} property
   * @param {String} orderDirection
   * @returns {Function}
   */
  var compare = function (property, orderDirection) {
    return function (item1, item2) {
      return typeof (orderDirection) === 'undefined' || orderDirection === 'asc' ? item1[property] - item2[property] : item2[property] - item1[property];
    }
  };

  /**
   * Create range array between from and to
   * @param {Number} from
   * @param {Number} to
   * @returns {Array}
   */
  var range = function (from, to) {
    var arr = [];
    while (from <= to) {
      arr.push(from++);
    }

    return arr;
  };

  /**
   * * Get groups for range
   * @param from
   * @param to
   * @returns {{total: {rows: number, cols: number}, groups: Array}}
   */
  var getRangeGroups = function (from, to) {
    var cells = [],
      cell = {
        row: null,
        col: null
      };

    if (instance.selection.selectedHeader.cols) {
      // get all rows for selected columns
      while (from <= to) {
        cell = {
          row: -1,
          col: from++
        };
        cells.push(cell);
      }

    } else {
      // get all columns for selected rows
      while (from <= to) {
        cell = {
          row: from++,
          col: -1
        };
        cells.push(cell);
      }
    }

    var cellsGroups = getCellsGroups(cells),
      totalRows = 0,
      totalCols = 0;

    // for selected cells, calculate total groups divided into rows and columns
    for (var i = 0; i < cellsGroups.length; i++) {
      totalRows += cellsGroups[i].filter(function (item) {
        return item['rows']
      }).length;

      totalCols += cellsGroups[i].filter(function (item) {
        return item['cols']
      }).length;
    }

    return {
      total: {
        rows: totalRows,
        cols: totalCols
      },
      groups: cellsGroups
    };
  };

  /**
   * Get all groups for cells
   * @param {Array} cells [{row:0, col:0}, {row:0, col:1}, {row:1, col:2}]
   * @returns {Array}
   */
  var getCellsGroups = function (cells) {
    var _groups = [];

    for (var i = 0; i < cells.length; i++) {
      _groups.push(getCellGroups(cells[i]));
    }

    return _groups;
  };

  /**
   * Get all groups for cell
   * @param {Object} coords {row:1, col:2}
   * @param {Number} groupLevel Optional
   * @param {String} groupType Optional
   * @returns {Array}
   */
  var getCellGroups = function (coords, groupLevel, groupType) {
    var row = coords.row,
      col = coords.col;

    // for row = -1 and col = -1, get all columns and rows
    var tmpRow = (row === -1 ? 0 : row),
      tmpCol = (col === -1 ? 0 : col);

    var _groups = [];

    for (var i = 0; i < groups.length; i++) {
      var group = groups[i],
        id = group['id'],
        level = group['level'],
        rows = group['rows'] || [],
        cols = group['cols'] || [];

      if (_groups.indexOf(id) === -1) {
        if (rows.indexOf(tmpRow) !== -1 || cols.indexOf(tmpCol) !== -1) {
          _groups.push(group);
        }
      }
    }

    // add col groups
    if (col === -1) {
      _groups = _groups.concat(getColGroups());
    } else if (row === -1) {
      // add row groups
      _groups = _groups.concat(getRowGroups());
    }

    if (groupLevel) {
      _groups = _groups.filter(function (item) {
        return item['level'] === groupLevel;
      });
    }

    if (groupType) {
      if (groupType === 'cols') {
        _groups = _groups.filter(function (item) {
          return item['cols'];
        });
      } else if (groupType === 'rows') {
        _groups = _groups.filter(function (item) {
          return item['rows'];
        });
      }
    }

    // remove duplicates
    var tmp = [];
    return _groups.filter(function (item) {
      if (tmp.indexOf(item.id) === -1) {
        tmp.push(item.id);
        return item;
      }
    });
  };

  /**
   * get group by id
   * @param id
   * @returns {Object} group
   */
  var getGroupById = function (id) {
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i].id == id) return groups[i];
    }
    return false;
  };

  /**
   * get group by row and level
   * @param row
   * @param level
   * @returns {Object} group
   */
  var getGroupByRowAndLevel = function (row, level) {
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i].level == level && groups[i].rows && groups[i].rows.indexOf(row) > -1) return groups[i];
    }
    return false;
  };

  /**
   * get group by row and level
   * @param row
   * @param level
   * @returns {Object} group
   */
  var getGroupByColAndLevel = function (col, level) {
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i].level == level && groups[i].cols && groups[i].cols.indexOf(col) > -1) return groups[i];
    }
    return false;
  };

  /**
   * get total column groups
   * @returns {*|Array}
   */
  var getColGroups = function () {
    var result = [];
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i]['cols'] instanceof Array) result.push(groups[i]);
    }
    return result;
  };

  /**
   * get total col groups by level
   * @param {Number} level
   * @returns {*|Array}
   */
  var getColGroupsByLevel = function (level) {
    var result = [];
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i]['level'] === level) result.push(groups[i]);
    }
    return result;
  };

  /**
   * get total row groups
   * @returns {*|Array}
   */
  var getRowGroups = function () {
    var result = [];
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i]['rows'] instanceof Array) result.push(groups[i]);
    }
    return result;
  };

  /**
   * get total row groups by level
   * @param {Number} level
   * @returns {*|Array}
   */
  var getRowGroupsByLevel = function (level) {
    var result = [];
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      if (groups[i]['level'] === level) result.push(groups[i]);
    }
    return result;
  };

  /**
   * get last inserted range level in columns
   * @param {Array} rangeGroups
   * @returns {number}
   */
  var getLastLevelColsInRange = function (rangeGroups) {
    var level = 0;

    if (rangeGroups.length) {
      rangeGroups.forEach(function (items) {
        items = items.filter(function (item) {
          return item['cols'];
        });

        if (items.length) {
          var sortedGroup = items.sort(compare('level', 'desc')),
            lastLevel = sortedGroup[0].level;

          if (level < lastLevel) {
            level = lastLevel;
          }
        }
      });
    }

    return level;
  };

  /**
   * get last inserted range level in rows
   * @param {Array} rangeGroups
   * @returns {number}
   */
  var getLastLevelRowsInRange = function (rangeGroups) {
    var level = 0;

    if (rangeGroups.length) {
      rangeGroups.forEach(function (items) {
        items = items.filter(function (item) {
          return item['rows'];
        });

        if (items.length) {
          var sortedGroup = items.sort(compare('level', 'desc')),
            lastLevel = sortedGroup[0].level;

          if (level < lastLevel) {
            level = lastLevel;
          }
        }
      });
    }

    return level;
  };

  /**
   * update col groups level
   * @param level
   */
  var updateColGroupsLevel = function (level) {
    var groups = getColGroups().sort(compare('level', 'asc'));

    groups.filter(function (item) {
      if (item.level > level) {
        item.level--;
      }
    });
  };

  /**
   * update row groups level
   * @param level
   */
  var updateRowGroupsLevel = function (level) {
    var groups = getRowGroups().sort(compare('level', 'asc'));

    groups.filter(function (item) {
      if (item.level > level) {
        item.level--;
      }
    });
  };

  /**
   * create group for cols
   * @param {Number} from
   * @param {Number} to
   */
  var groupCols = function (from, to) {
    var rangeGroups = getRangeGroups(from, to),
      lastLevel = getLastLevelColsInRange(rangeGroups.groups);

    if (lastLevel === levels.cols) {
      levels.cols++;
    } else if (lastLevel > levels.cols) {
      levels.cols = lastLevel + 1;
    }

    if (!counters.cols) {
      counters.cols = getColGroups().length;
    }

    counters.cols++;
    groups.push({
      id: 'c' + counters.cols,
      level: levels.cols,
      cols: range(from, to),
      hidden: 0
    });
  };

  /**
   * ungroup columns
   * delete range columns from last inserted groups
   * @param {Number} from
   * @param {Number} to
   */
  var ungroupCols = function (from, to) {
    var copyRange = range(from, to),
      rangeGroups = getRangeGroups(from, to);

    // loop for selected range
    for (var i = 0; i < copyRange.length; i++) {

      var cellIndex = copyRange[i], // value to remove
        cellGroups = rangeGroups.groups[i], // get groups which contains cellIndex
        cellGroupsLength = Handsontable.helper.isArray(cellGroups) ? cellGroups.length : 0; // groups length

      if (cellGroupsLength) {

        cellGroups = cellGroups.filter(function (item) {
          return item['cols'];
        }).sort(compare('level', 'desc'));

        if (cellGroups.length) {

          var cellGroup = cellGroups[0],
            cellGroupLevel = cellGroup.level,
            decrementLevel = getColGroupsByLevel(cellGroupLevel).length > 1 ? false : true;

          // remove value from sorted by level array of objects
          groups.filter(function (item, i) {
            if (item.id === cellGroup.id) {
              var cellIndexPosition = item.cols.indexOf(cellIndex);
              item.cols.splice(cellIndexPosition, 1);

              var len = item.cols.length;
              // there are no elements, remove object from array
              if (!len) {
                counters.cols--;
                groups.splice(i, 1);

                if (levels.cols && decrementLevel) {
                  // update col groups level
                  updateColGroupsLevel(cellGroupLevel);
                  levels.cols--;
                }
              }
            }
          });

        }
      }
    }
  };

  /**
   * create group for rows
   * @param {Number} from
   * @param {Number} to
   */
  var groupRows = function (from, to) {
    var rangeGroups = getRangeGroups(from, to),
      lastLevel = getLastLevelRowsInRange(rangeGroups.groups);

    levels.rows = lastLevel + 1;

    if (!counters.rows) {
      counters.rows = getRowGroups().length;
    }

    counters.rows++;
    groups.push({
      id: 'r' + counters.rows,
      level: levels.rows,
      rows: range(from, to),
      hidden: 0
    });
  };

  /**
   * Ungroup rows
   * delete range rows from last inserted groups
   * @param {Number} from
   * @param {Number} to
   */
  var ungroupRows = function (from, to) {
    var copyRange = range(from, to),
      rangeGroups = getRangeGroups(from, to);

    // loop for selected range
    for (var i = 0; i < copyRange.length; i++) {

      var cellIndex = copyRange[i], // value to remove
        cellGroups = rangeGroups.groups[i], // get groups which contains cellIndex
        cellGroupsLength = Handsontable.helper.isArray(cellGroups) ? cellGroups.length : 0; // groups length

      if (cellGroupsLength) {
        cellGroups = cellGroups.filter(function (item) {
          return item['rows'];
        }).sort(compare('level', 'desc'));

        if (cellGroups.length) {
          var cellGroup = cellGroups[0],
            cellGroupLevel = cellGroup.level,
            decrementLevel = getRowGroupsByLevel(cellGroupLevel).length > 1 ? false : true;

          // remove value from sorted by level array of objects
          groups.filter(function (item, j) {
            if (item.id === cellGroup.id) {

              var cellIndexPosition = item.rows.indexOf(cellIndex);
              item.rows.splice(cellIndexPosition, 1);

              var len = item.rows.length;
              // there are no elements, remove object from array
              if (!len) {
                counters.rows--;
                groups.splice(j, 1);

                if (levels.rows && decrementLevel) {
                  // update col groups level
                  updateRowGroupsLevel(cellGroupLevel);
                  levels.rows--;
                }
              }
            }
          });
        }
      }
    }
  };

  /**
   * show or hide groups
   * @param showHide
   * @param groups
   */
  var showHideGroups = function (showHide, groups, level) {
    for (var i = 0, groupsLength = groups.length; i < groupsLength; i++) {
      groups[i].hidden = showHide;

      if (!hiddenRows[level]) hiddenRows[level] = [];
      if (!hiddenCols[level]) hiddenCols[level] = [];

      if (groups[i].rows) {
        for (var j = 0, rowsLength = groups[i].rows.length; j < rowsLength; j++) {
          if (showHide > 0) {
            hiddenRows[level][groups[i].rows[j]] = true;
          } else {
            hiddenRows[level][groups[i].rows[j]] = void 0;
          }
        }
      } else if (groups[i].cols) {
        for (var j = 0, colsLength = groups[i].cols.length; j < colsLength; j++) {
          if (showHide > 0) {
            hiddenCols[level][groups[i].cols[j]] = true;
          } else {
            hiddenCols[level][groups[i].cols[j]] = void 0;
          }
        }
      }
    }
  };

  /**
   * Check if the next cell of the dimension (row / column) shares the same level
   * @param dimension
   * @param currentPosition
   * @param level
   * @param currentGroupId
   * @returns {boolean}
   */
  var nextIndexSharesLevel = function (dimension, currentPosition, level, currentGroupId) {
    var nextCellGroupId
      , levelsByOrder;

    switch (dimension) {
      case 'rows':
        nextCellGroupId = Handsontable.Grouping.getRowGroupId(currentPosition + 1, level);
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByRows();
        break;
      case 'cols':
        nextCellGroupId = Handsontable.Grouping.getColGroupId(currentPosition + 1, level);
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByCols();
        break;
    }

    if (levelsByOrder[currentPosition + 1] && levelsByOrder[currentPosition + 1].indexOf(level) > -1 && currentGroupId == nextCellGroupId) return true;
    return false;
  };

  /**
   * Check if the previous cell of the dimension (row / column) shares the same level
   * @param dimension
   * @param currentPosition
   * @param level
   * @param currentGroupId
   * @returns {boolean}
   */
  var previousIndexSharesLevel = function (dimension, currentPosition, level, currentGroupId) {
    var previousCellGroupId
      , levelsByOrder;

    switch (dimension) {
      case 'rows':
        previousCellGroupId = Handsontable.Grouping.getRowGroupId(currentPosition - 1, level);
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByRows();
        break;
      case 'cols':
        previousCellGroupId = Handsontable.Grouping.getColGroupId(currentPosition - 1, level);
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByCols();
        break;
    }

    if (levelsByOrder[currentPosition - 1] && levelsByOrder[currentPosition - 1].indexOf(level) > -1 && currentGroupId == previousCellGroupId) return true;
    return false;
  };

  /**
   * Check if the provided index is at the end of the group indicator line
   * @param dimension
   * @param index
   * @param level
   * @param currentGroupId
   * @returns {boolean}
   */
  var isLastIndexOfTheLine = function (dimension, index, level, currentGroupId) {
    if (index === 0) return false;
    var levelsByOrder
      , entriesLength;

    switch (dimension) {
      case 'rows':
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByRows();
        entriesLength = instance.countCols();
        break;
      case 'cols':
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByCols();
        entriesLength = instance.countRows();
        break;
    }

    if (previousIndexSharesLevel(dimension, index, level, currentGroupId)) {
      if (index == entriesLength - 1) {
        return true;
      } else if (!nextIndexSharesLevel(dimension, index, level, currentGroupId)) {
        return true;
      } else if (!levelsByOrder[index + 1]) {
        return true;
      }
    }
    return false;
  };

  /**
   * Check if the provided index is at the beginning of the group indicator line
   * @param dimension
   * @param index
   * @param level
   * @param currentGroupId
   * @returns {boolean}
   */
  var isFirstIndexOfTheLine = function (dimension, index, level, currentGroupId) {
    var levelsByOrder
      , entriesLength;

    switch (dimension) {
      case 'rows':
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByRows();
        entriesLength = instance.countCols();
        break;
      case 'cols':
        levelsByOrder = Handsontable.Grouping.getGroupLevelsByCols();
        entriesLength = instance.countRows();
        break;
    }

    if (index == entriesLength - 1) return false;
    else if (index == 0) {
      if (nextIndexSharesLevel(dimension, index, level, currentGroupId)) {
        return true;
      }
    } else if (!previousIndexSharesLevel(dimension, index, level, currentGroupId)) {
      if (nextIndexSharesLevel(dimension, index, level, currentGroupId)) {
        return true;
      }
    } else if (!levelsByOrder[index - 1]) {
      if (nextIndexSharesLevel(dimension, index, level, currentGroupId)) {
        return true;
      }
    }
    return false;
  };

  /**
   * Add group expander button
   * @param dimension
   * @param index
   * @param level
   * @param id
   * @param elem
   * @returns {*}
   */
  var addGroupExpander = function (dimension, index, level, id, elem) {
    var previousIndexGroupId;

    switch (dimension) {
      case 'rows':
        previousIndexGroupId = Handsontable.Grouping.getRowGroupId(index - 1, level);
        break;
      case 'cols':
        previousIndexGroupId = Handsontable.Grouping.getColGroupId(index - 1, level);
        break;
    }

    if (!previousIndexGroupId) return null;

    if (index > 0) {
      if (previousIndexSharesLevel(dimension, index - 1, level, previousIndexGroupId) && previousIndexGroupId != id) {
        var expanderButton = document.createElement('DIV');
        Handsontable.Dom.addClass(expanderButton, 'htExpandGroup');
        expanderButton.id = 'htExpand-' + previousIndexGroupId;
        expanderButton.appendChild(document.createTextNode('+'));
        expanderButton.setAttribute('data-level', level);
        expanderButton.setAttribute('data-type', dimension);
        expanderButton.setAttribute('data-hidden', "1");

        elem.appendChild(expanderButton);

        return expanderButton;
      }
    }
    return null;
  };

  /**
   * Check if provided cell is collapsed (either by rows or cols)
   * @param currentPosition
   * @returns {boolean}
   */
  var isCollapsed = function (currentPosition) {
    var rowGroups = getRowGroups()
      , colGroups = getColGroups();

    for(var i = 0, rowGroupsCount = rowGroups.length; i < rowGroupsCount; i++) {
      if(rowGroups[i].rows.indexOf(currentPosition.row) > -1 && rowGroups[i].hidden) {
        return true;
      }
    }

    for(var i = 0, colGroupsCount = colGroups.length; i < colGroupsCount; i++) {
      if(colGroups[i].cols.indexOf(currentPosition.col) > -1 && colGroups[i].hidden) {
        return true;
      }
    }

    return false;

//    var cell = instance.getCell(currentPosition.row, currentPosition.col)
//      , thisColElement = instance.rootElement[0].querySelectorAll('colgroup:first-child col:not([class~="rowHeader"])')[currentPosition.col];
//
//    if (!cell)
//      return false;
//
//    if (currentPosition.col < 0 || currentPosition.row < 0)
//      return false;
//
//    if (Handsontable.Dom.hasClass(cell.parentNode, 'hidden') || Handsontable.Dom.hasClass(thisColElement, 'hidden')) {
//      return true;
//    }
//    return false;
  };

  return {

    /**
     * all groups for ht instance
     */
    groups: groups,
    levels: levels,
    instance: instance,

    /**
     * init group
     * @param {Object} settings, could be an array of objects [{cols: [0,1,2]}, {cols: [3,4,5]}, {rows: [0,1]}]
     */
    init: function (settings) {

      if (settings) {
        var initialGroups = instance.getSettings().groups;

        if (initialGroups instanceof Array) {
          this.initGroupsOnStartup(initialGroups);
        }
      }
    },

    /**
     * init groups from configuration on startup
     */
    initGroupsOnStartup: function (initialGroups) {
      var that = this;


      //TODO: zamienic foreach na for?
      initialGroups.forEach(function (item) {
        var _group = [],
          isRow = false,
          isCol = false;

        if (item.rows instanceof Array) {
          _group = item.rows;
          isRow = true;
        } else if (item.cols instanceof Array) {
          _group = item.cols;
          isCol = true;
        }

        var from = _group[0],
          to = _group[_group.length - 1];

        var start = {},
          end = {};

        if (isRow) {
          instance.selection.setSelectedHeaders(true, false);
          start = {
            row: from
          };

          end = {
            row: to
          };

        } else if (isCol) {
          instance.selection.setSelectedHeaders(false, true);

          start = {
            col: from
          };

          end = {
            col: to
          };
        }

        that.group(start, end, true);
      });
      this.render();
    },

    /**
     * group columns, rows
     * @param {Object} start
     * @param {Object} end
     * @param {Bool} isInit
     */
    group: function (start, end, isInit) {
      instance.selection.selectedHeader.rows ? groupRows(start.row, end.row) : groupCols(start.col, end.col);
      if (!isInit) {
        this.render();
      }
    },

    /**
     * ungroup columns, rows
     * @param start
     * @param end
     */
    ungroup: function (start, end) {
      instance.selection.selectedHeader.rows ? ungroupRows(start.row, end.row) : ungroupCols(start.col, end.col);
      this.render();
    },

    /**
     * render groups by level and single group
     */
    render: function () {
      // render group levels and groups
      if (instance.selection.selectedHeader.cols) {

//        renderColGroupLevels();
        renderColGroups();

      } else if (instance.selection.selectedHeader.rows) {

//        renderRowGroupLevels();
//        renderRowGroups();
      }
    },

    /**
     * check if grouping is allowed
     * @returns {boolean}
     */
    groupIsAllowed: function () {
      var selected = instance.getSelected(),
        rowTo = selected[2],
        colTo = selected[3];

      if (instance.selection.selectedHeader.rows) {
        if (colTo !== instance.countCols() - 1) {
          return false;
        }
      } else {
        if (rowTo !== instance.countRows() - 1) {
          return false;
        }
      }

      return true;
    },

    /**
     * check if ungrouping is allowed
     * @returns {boolean}
     */
    ungroupIsAllowed: function () {
      var selected = instance.getSelected(),
        rowFrom = selected[0],
        colFrom = selected[1],
        rowTo = selected[2],
        colTo = selected[3];

      var start = 0,
        end = 0;

      if (instance.selection.selectedHeader.cols) {
        if (rowFrom <= rowTo) {
          start = colFrom;
          end = colTo;
        } else {
          start = colTo;
          end = colFrom;
        }
      } else {
        if (rowFrom <= rowTo) {
          start = rowFrom;
          end = rowTo;
        } else {
          start = rowTo;
          end = rowFrom;
        }
      }

      var _groups = getRangeGroups(start, end);

      return  (instance.selection.selectedHeader.cols) ? (_groups.total.cols > 0 ? true : false) : (_groups.total.rows > 0 ? true : false);
    },

    /**
     * add group/ungroup options to context menu
     * @param {Object} options
     */
    addGroupingToContextMenu: function (options) {
      var instance = this;
      if (!instance.getSettings().groups) {
        return;
      }

      options.items.groupingCellsSeparator = Handsontable.ContextMenu.SEPARATOR;

      options.items.grouping = {
        name: function () {
          return 'Group';
        },
        callback: function (key, selection) {
          var start = selection.start,
            end = selection.end;

          Handsontable.Grouping.group(start, end);
        },
        disabled: function () {
          return !Handsontable.Grouping.groupIsAllowed();
        }
      };

      options.items.ungrouping = {
        name: function () {
          return 'Ungroup';
        },
        callback: function (key, selection) {
          var start = selection.start,
            end = selection.end;

          Handsontable.Grouping.ungroup(start, end);

        },
        disabled: function () {
          return !Handsontable.Grouping.ungroupIsAllowed();
        }
      };
    },

    afterGetRowHeader: function (row, TH) {
      var currentRowHidden = false;
      for (var i = 0, levels = hiddenRows.length; i < levels; i++) {
        if (hiddenRows[i] && hiddenRows[i][row] === true) {
          currentRowHidden = true;
        }
      }

      if (currentRowHidden) {
        Handsontable.Dom.addClass(TH.parentNode, 'hidden');
      } else if (!currentRowHidden && Handsontable.Dom.hasClass(TH.parentNode, 'hidden')) {
        Handsontable.Dom.removeClass(TH.parentNode, 'hidden');
      }

    },
    afterGetColHeader: function (col, TH) {
      var rowHeaders = this.view.wt.wtSettings.getSetting('rowHeaders').length
        , thisColgroup = instance.rootElement[0].querySelectorAll('colgroup col:nth-child(' + parseInt(col + rowHeaders + 1, 10) + ')');

      if (thisColgroup.length === 0) {
        return;
      }

      var currentColHidden = false;
      for (var i = 0, levels = hiddenCols.length; i < levels; i++) {
        if (hiddenCols[i] && hiddenCols[i][col] === true) {
          currentColHidden = true;
        }
      }

      if (currentColHidden) {
        for (var i = 0, colsAmount = thisColgroup.length; i < colsAmount; i++) {
          Handsontable.Dom.addClass(thisColgroup[i], 'hidden');
        }
      } else if (!currentColHidden && Handsontable.Dom.hasClass(thisColgroup[0], 'hidden')) {
        for (var i = 0, colsAmount = thisColgroup.length; i < colsAmount; i++) {
          Handsontable.Dom.removeClass(thisColgroup[i], 'hidden');
        }
      }
    },
    setupVerticalIndicators: function (walkontableConfig) {
      var makeGroupIndicatorsForLevel = function () {
        var direction = "vertical"
          , directionClassname = direction.charAt(0).toUpperCase() + direction.slice(1) // capitalize the first letter
          , levelsByRows = Handsontable.Grouping.getGroupLevelsByRows();

        return function (row, elem) { // returned function will be used to render headers
          var child
            , collapseButton;
          while (child = elem.lastChild) {
            elem.removeChild(child);
          }

          elem.className = 'htGroupIndicatorContainer';

//          console.log(Handsontable.Dom.index(elem),Array.prototype.indexOf.call(elem.parentNode.childNodes, elem));

          var level = Handsontable.Grouping.levels.rows - Handsontable.Dom.index(elem)
            , currentGroupId = Handsontable.Grouping.getRowGroupId(row, level);

          if (row > -1 && (levelsByRows[row] && levelsByRows[row].indexOf(level) > -1)) {

            collapseButton = document.createElement('div');
            Handsontable.Dom.addClass(collapseButton, 'ht' + directionClassname + 'Group');

            if (isFirstIndexOfTheLine('rows', row, level, currentGroupId)) { // add a little thingy and the top of the group indicator
              Handsontable.Dom.addClass(collapseButton, 'htGroupStart');
            }

            if (isLastIndexOfTheLine('rows', row, level, currentGroupId)) { // add [+]/[-] button at the end of the line
              collapseButton.appendChild(document.createTextNode('-'));
              Handsontable.Dom.addClass(collapseButton, 'htCollapseGroup');
              collapseButton.id = 'htCollapse-' + currentGroupId;
              collapseButton.setAttribute('data-level', level);
              collapseButton.setAttribute('data-type', 'rows');
            }
            elem.appendChild(collapseButton);
          }

          // add group expending button
          var expanderButton = addGroupExpander('rows', row, level, currentGroupId, elem);
          if (row > 0) {
            var previousGroupObj = getGroupByRowAndLevel(row - 1, level);

            if (expanderButton && previousGroupObj.hidden) {
              Handsontable.Dom.addClass(expanderButton, 'clickable');
            }
          }

        }
      };


      for (var i = 0; i < Handsontable.Grouping.levels.rows; i++) { // for each level of row groups add a header renderer
        if (!(walkontableConfig.rowHeaders instanceof Array)) {
          walkontableConfig.rowHeaders = typeof walkontableConfig.rowHeaders === 'function' ? walkontableConfig.rowHeaders() : new Array(walkontableConfig.rowHeaders);
        }
        walkontableConfig.rowHeaders.unshift(makeGroupIndicatorsForLevel());
      }
    },
    setupHorizontalIndicators: function (walkontableConfig) {
      var makeGroupIndicatorsForLevel = function () {
        var direction = "horizontal"
          , directionClassname = direction.charAt(0).toUpperCase() + direction.slice(1) // capitalize the first letter
          , levelsByCols = Handsontable.Grouping.getGroupLevelsByCols();

        return function (col, elem) { // returned function will be used to render headers
          var child
            , collapseButton;
          while (child = elem.lastChild) {
            elem.removeChild(child);
          }

          elem.className = 'htGroupIndicatorContainer';

          var level = Handsontable.Grouping.levels.cols - Array.prototype.indexOf.call(elem.parentNode.parentNode.childNodes, elem.parentNode)
            , currentGroupId = Handsontable.Grouping.getColGroupId(col, level);

          if (col > -1 && (levelsByCols[col] && levelsByCols[col].indexOf(level) > -1)) {

            collapseButton = document.createElement('div');
            Handsontable.Dom.addClass(collapseButton, 'ht' + directionClassname + 'Group');

            if (isFirstIndexOfTheLine('cols', col, level, currentGroupId)) { // add a little thingy and the top of the group indicator
              Handsontable.Dom.addClass(collapseButton, 'htGroupStart');
            }

            if (isLastIndexOfTheLine('cols', col, level, currentGroupId)) { // add [+]/[-] button at the end of the line
              collapseButton.appendChild(document.createTextNode('-'));
              Handsontable.Dom.addClass(collapseButton, 'htCollapseGroup');
              collapseButton.id = 'htCollapse-' + currentGroupId;
              collapseButton.setAttribute('data-level', level);
              collapseButton.setAttribute('data-type', 'cols');
            }
            elem.appendChild(collapseButton);
          }

          // add group expending button
          var expanderButton = addGroupExpander('cols', col, level, currentGroupId, elem);
          if (col > 0) {
            var previousGroupObj = getGroupByColAndLevel(col - 1, level);

            if (expanderButton && previousGroupObj.hidden) {
              Handsontable.Dom.addClass(expanderButton, 'clickable');
            }
          }

        };
      };


      for (var i = 0; i < Handsontable.Grouping.levels.cols; i++) { // for each level of col groups add a header renderer
        if (!(walkontableConfig.columnHeaders instanceof Array)) {
          walkontableConfig.columnHeaders = typeof walkontableConfig.columnHeaders === 'function' ? walkontableConfig.columnHeaders() : new Array(walkontableConfig.columnHeaders);
        }
        walkontableConfig.columnHeaders.unshift(makeGroupIndicatorsForLevel());
      }

    },
    getGroupLevelsByRows: function () {
      var rowGroups = getRowGroups()
        , result = [];

      for (var i = 0, groupsLength = rowGroups.length; i < groupsLength; i++) {
        if (rowGroups[i].rows) {
          for (var j = 0, groupRowsLength = rowGroups[i].rows.length; j < groupRowsLength; j++) {
            if (!!!result[rowGroups[i].rows[j]]) result[rowGroups[i].rows[j]] = [];
            result[rowGroups[i].rows[j]].push(rowGroups[i].level);
          }
        }
      }
      return result;
    },
    getGroupLevelsByCols: function () {
      var colGroups = getColGroups()
        , result = [];

      for (var i = 0, groupsLength = colGroups.length; i < groupsLength; i++) {
        if (colGroups[i].cols) {
          for (var j = 0, groupColsLength = colGroups[i].cols.length; j < groupColsLength; j++) {
            if (!!!result[colGroups[i].cols[j]]) result[colGroups[i].cols[j]] = [];
            result[colGroups[i].cols[j]].push(colGroups[i].level);
          }
        }
      }
      return result;
    },
    getRowGroupId: function (row, level) {
      for (var i in this.groups) {
        if (!this.groups[i].rows) continue;
        if (this.groups[i].level === level && this.groups[i].rows.indexOf(row) > -1) return this.groups[i].id;
      }
      return false;
    },
    getColGroupId: function (col, level) {
      for (var i in this.groups) {
        if (!this.groups[i].cols) continue;
        if (this.groups[i].level === level && this.groups[i].cols.indexOf(col) > -1) return this.groups[i].id;
      }
      return false;
    },
    toggleGroupVisibility: function (event, coords, TD) {
      if (Handsontable.Dom.hasClass(event.target, 'htExpandGroup') || Handsontable.Dom.hasClass(event.target, 'htCollapseGroup')) {
        var element = event.target;

        var id = element.id.split('-')[1]
          , level = parseInt(element.getAttribute('data-level'), 10)
          , type = element.getAttribute('data-type')
          , hidden = parseInt(element.getAttribute('data-hidden'));

        if (isNaN(hidden)) {
          hidden = 1;
        } else {
          hidden = (hidden ? 0 : 1);
        }

        lastClicked = {
          id: id,
          level: level,
          type: type,
          hidden: hidden
        };

        element.setAttribute('data-hidden', hidden.toString());

        var groups = [];
        groups.push(getGroupById(id));

        showHideGroups(hidden, groups, level);
        instance.render();

        event.stopImmediatePropagation();
      }
    },
    modifySelectionFactory: function (position) {
      var instance = this.instance;
      var currentlySelected
        , nextPosition = new WalkontableCellCoords(0, 0)
        , nextVisible = function (direction, currentPosition) { // updates delta to skip to the next visible cell
          var updateDelta = 0;

          switch (direction) {
            case 'down':
              while (isCollapsed(currentPosition)) {
                updateDelta++;
                currentPosition.row += 1;
              }
              break;
            case 'up':
              while (isCollapsed(currentPosition)) {
                updateDelta--;
                currentPosition.row -= 1;
              }
              break;
            case 'right':
              while (isCollapsed(currentPosition)) {
                updateDelta++;
                currentPosition.col += 1;
              }
              break;
            case 'left':
              while (isCollapsed(currentPosition)) {
                updateDelta--;
                currentPosition.col -= 1;
              }
              break;
          }

          return updateDelta;
        }
        , updateDelta = function (delta, nextPosition) {
          if (delta.row > 0) { // moving down
            if (isCollapsed(nextPosition)) {
              delta.row += nextVisible('down', nextPosition);
            }
          } else if (delta.row < 0) { // moving up
            if (isCollapsed(nextPosition)) {
              delta.row += nextVisible('up', nextPosition);
            }
          }

          if (delta.col > 0) { // moving right
            if (isCollapsed(nextPosition)) {
              delta.col += nextVisible('right', nextPosition);
            }
          } else if (delta.col < 0) { // moving left
            if (isCollapsed(nextPosition)) {
              delta.col += nextVisible('left', nextPosition);
            }
          }
        };

      switch (position) {
        case 'start':
          return function (delta) {
            currentlySelected = instance.getSelected();
            nextPosition.row = currentlySelected[0] + delta.row;
            nextPosition.col = currentlySelected[1] + delta.col;

            updateDelta(delta, nextPosition);
          };
          break;
        case 'end':
          return function (delta) {
            currentlySelected = instance.getSelected();
            nextPosition.row = currentlySelected[2] + delta.row;
            nextPosition.col = currentlySelected[3] + delta.col;

            updateDelta(delta, nextPosition);
          };
          break;
      }
    },
    modifyRowHeight: function (height, row) {
      if (instance.view.wt.wtTable.rowFilter && isCollapsed({row: row, col: 0})) {
        return 0;
      }
    }
  }
};

/**
 * create new instance
 */
var init = function () {
  var instance = this,
    groupingSetting = !!(instance.getSettings().groups);


  if (groupingSetting) {
    Handsontable.Grouping = new Grouping(instance);
    Handsontable.Grouping.init(groupingSetting);

    Handsontable.hooks.add('beforeInitWalkontable', beforeInitWOT);
    Handsontable.hooks.add('afterInit', updateHeaderWidths);
    Handsontable.hooks.add('afterContextMenuDefaultOptions', Handsontable.Grouping.addGroupingToContextMenu);
    Handsontable.hooks.add('afterGetRowHeader', Handsontable.Grouping.afterGetRowHeader);
    Handsontable.hooks.add('afterGetColHeader', Handsontable.Grouping.afterGetColHeader);
    Handsontable.hooks.add('beforeOnCellMouseDown', Handsontable.Grouping.toggleGroupVisibility);
    Handsontable.hooks.add('modifyTransformStart', Handsontable.Grouping.modifySelectionFactory('start'));
    Handsontable.hooks.add('modifyTransformEnd', Handsontable.Grouping.modifySelectionFactory('end'));
    Handsontable.hooks.add('modifyRowHeight', Handsontable.Grouping.modifyRowHeight);

//    Handsontable.hooks.add('afterScrollVertically', function () {
//      debugger;
//    });
  }
};

/**
 * Update headers widths for the group indicators
 */
var updateHeaderWidths = function () {
  var colgroups = document.querySelectorAll('colgroup');
  for (var i = 0, colgroupsLength = colgroups.length; i < colgroupsLength; i++) {
    var rowHeaders = colgroups[i].querySelectorAll('col.rowHeader');
    for (var j = 0, rowHeadersLength = rowHeaders.length; j < rowHeadersLength; j++) {
      if (j < Handsontable.Grouping.levels.rows) {
        if (j == Handsontable.Grouping.levels.rows - 1) {
          Handsontable.Dom.addClass(rowHeaders[j], 'htGroupColClosest');
        } else {
          Handsontable.Dom.addClass(rowHeaders[j], 'htGroupCol');
        }
      }
    }
  }
};

/**
 * Setup group indicator rendering function before the initialization of Walkontable
 * @param walkontableConfig
 */
var beforeInitWOT = function (walkontableConfig) {
  var instance = this;
  if (!!!instance.getSettings().groups) {
    return;
  }

  Handsontable.Grouping.setupVerticalIndicators(walkontableConfig);
  Handsontable.Grouping.setupHorizontalIndicators(walkontableConfig);

};

Handsontable.hooks.add('beforeInit', init);
