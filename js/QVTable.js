/*
 * QVTable.js
 * Copyright 2014, Tianyong Tang
 * Licensed under the MIT.
 */

$(function () {
	function tableRows(table) {
		return $(table).find('tr').length;
	}

	function tdRowspan(td) {
		var rowspan = parseInt($(td).attr('rowspan'), 10);
		return rowspan > 0 ? rowspan : 1;
	}

	function tdColspan(td) {
		var colspan = parseInt($(td).attr('colspan'), 10);
		return colspan > 0 ? colspan : 1;
	}

	function indexOf(arr, ele) {
		for (var i = 0, l = arr.length; i < l; i++) {
			if (arr[i] === ele) {
				return i;
			}
		}
		return -1;
	}

	function tableCreateByMap(map) {
		var rows = map.length;
		var cols = map[0].length;
		var seen = [];

		var newTable = $('<table>');

		for (var t = 0; t < rows; ++t) {
			var tr = $('<tr>');
			var l = cols - 1;
			while (l >= 0) {
				var td = map[t][l];
				if (td) {
					if (indexOf(seen, td) < 0) {
						seen[seen.length] = td;
						tr.prepend(td);
					}
					var loc = $(td).data('location');
					l -= loc.width;
				} else {
					l -= 1;
				}
			}
			newTable.append(tr);
		}

		return newTable;
	}

	function tableReduceV(table, top, diff) {
		table = $(table);
		var map = table.data('map');

		map.splice(top, diff);

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());
	}

	function tableLocate(table) {
		table = $(table);
		var map = [];

		for (var i = 0, r = tableRows(table); i < r; ++i) {
			map[i] = [];
		}

		table.find('tr').each(function (row) {
			$(this).children('td').each(function () {
				var rowspan = tdRowspan(this);
				var colspan = tdColspan(this);
				var offsetX = 0;
				var trUnits = map[row];

				while (trUnits[offsetX]) {
					++offsetX;
				}

				for (var i = 0; i < rowspan; ++i) {
					for (var j = 0; j < colspan; ++j) {
						map[row + i][offsetX + j] = this;
					}
				}

				$(this).data("location", {
					top: row,
					left: offsetX,
					right: offsetX + colspan,
					bottom: row + rowspan,
					width: colspan,
					height: rowspan
				});
			});
		});

		table.data('map', map);
	}

	function tableShortenH(table, offset) {
		table = $(table);
		offset = offset || 0;

		tableLocate(table);

		var map = table.data('map');
		var cols = map[0].length;
		var rows = map.length;
		var l = cols - offset - 1;

		while (l >= 0) {
			var t = rows - 1;
			var td = map[t][l];
			var tds = [td];
			var loc = $(td).data('location');
			if (loc.width === 1) {
				l -= 1;
				continue;
			}
			var start = loc.left;
			var end = loc.right;
			var minW = loc.width;
			var succ = true;
			t -= 1;
			while (t >= 0) {
				var uptd = map[t][l];
				if (uptd) {
					var upLoc = $(uptd).data('location');

					if (upLoc.width < 2) {
						succ = false;
						break;
					}

					start = Math.max(start, upLoc.left);
					end = Math.min(end, upLoc.right);
					minW = Math.min(minW, upLoc.width);

					tds[tds.length] = uptd;

					t -= upLoc.height;
				} else {
					t -= 1;
				}
			}

			var sp = end - start;

			if (minW === sp) { sp -= 1; }

			if (succ && sp > 0) {
				$(tds).each(function (i, td) {
					td = $(td);
					var loc = td.data('location');
					td.attr('colspan', loc.width - sp);
				});

				tableShortenH(table, cols - l - 1);
				return;
			}

			l -= 1;
		}
	}

	function tableShortenV(table, offset) {
		table = $(table);
		offset = offset || 0;

		tableLocate(table);

		var map = table.data('map');
		var cols = map[0].length;
		var rows = map.length;
		var t = rows - offset - 1;

		while (t >= 0) {
			var l = cols - 1;
			var td = map[t][l];
			var tds = [td];
			var loc = $(td).data('location');
			if (loc.height === 1) {
				t -= 1;
				continue;
			}
			var start = loc.top;
			var end = loc.bottom;
			var minH = loc.height;
			var succ = true;
			l -= 1;
			while (l >= 0) {
				var leftTd = map[t][l];
				if (leftTd) {
					var leftLoc = $(leftTd).data('location');

					if (leftLoc.height < 2) {
						succ = false;
						break;
					}

					start = Math.max(start, leftLoc.top);
					end = Math.min(end, leftLoc.bottom);
					minH = Math.min(minH, leftLoc.height);

					tds[tds.length] = leftTd;

					l -= leftLoc.width;
				} else {
					l -= 1;
				}
			}

			var diff = end - start;

			if (minH === diff) { diff -= 1; }

			if (succ && diff > 0) {
				tableReduceV(table, t, diff);
				$(tds).each(function (i, td) {
					td = $(td);
					var loc = td.data('location');
					td.attr('rowspan', loc.height - diff);
				});
				tableShortenV(table, rows - t - 1);
				return;
			}

			t -= 1;
		}
	}

	function tdVSiblings(td) {
		td = $(td);
		var result = [];
		var table = td.closest('table');
		var totalRows = tableRows(table);
		var location = td.data('location');
		var left = location.left;
		var width = location.width;
		var map = table.data('map');

		var top = 0;
		while (top < totalRows) {
			var eachTd = map[top][left];
			var loc = $(eachTd).data('location');

			if (eachTd !== td[0]) {
				if (loc.width - width > 0) {
					result[result.length] = eachTd;
				} else {
					return [];
				}
			}

			top += loc.height;
		}

		return result;
	}

	function tdRemoveByShorten(td) {
		td = $(td);
		var colspan = tdColspan(td);
		var vSiblings = tdVSiblings(td);

		if (vSiblings.length > 0) {
			$(vSiblings).each(function () {
				$(this).attr('colspan', tdColspan(this) - colspan);
			});

			td.remove();
			return true;
		}

		return false;
	}

	function tdPrevTds(td) {
		td = $(td);
		var result = [];
		var loc = td.data('location');

		if (loc.left > 0) {
			var left = loc.left;
			var map = td.closest('table').data('map');
			var top = loc.top;
			var bottom = loc.bottom;

			while (top < bottom) {
				var prevTd = map[top][left - 1];
				if (prevTd) {
					var prevLoc = $(prevTd).data('location');
					if (prevLoc.top >= loc.top &&
						prevLoc.bottom <= loc.bottom) {
						result[result.length] = prevTd;
						top += prevLoc.height;
					} else {
						return [];
					}
				} else {
					++top;
				}
			}
		}

		return result;
	}

	function tdNextTds(td) {
		td = $(td);
		var result = [];
		var loc = td.data('location');
		var top = loc.top;
		var bottom = loc.bottom;
		var right = loc.right;
		var map = td.closest('table').data('map');

		while (top < bottom) {
			var nextTd = map[top][right];
			if (nextTd) {
				var nextLoc = $(nextTd).data('location');
				if (nextLoc.top >= loc.top &&
					nextLoc.bottom <= loc.bottom) {
					result[result.length] = nextTd;
					top += nextLoc.height;
				} else {
					return [];
				}
			} else {
				++top;
			}
		}

		return result;
	}

	function tdAboveTds(td) {
		td = $(td);
		var result = [];
		var loc = td.data('location');

		if (loc.top > 0) {
			var top = loc.top;
			var left = loc.left;
			var right = loc.right;
			var map = td.closest('table').data('map');

			while (left < right) {
				var aboveTd = map[top - 1][left];
				if (aboveTd) {
					var aboveLoc = $(aboveTd).data('location');
					if (aboveLoc.left >= loc.left &&
						aboveLoc.right <= loc.right) {
						result[result.length] = aboveTd;
						left += aboveLoc.width;
					} else {
						return [];
					}
				} else {
					left += 1;
				}
			}
		}

		return result;
	}

	function tdBelowTds(td) {
		td = $(td);
		var result = [];
		var loc = td.data('location');
		var left = loc.left;
		var right = loc.right;
		var bottom = loc.bottom;
		var map = td.closest('table').data('map');

		while (left < right) {
			var belowTd = map[bottom][left];
			if (belowTd) {
				var belowLoc = $(belowTd).data('location');
				if (belowLoc.left >= loc.left &&
					belowLoc.right <= loc.right) {
					result[result.length] = belowTd;
					left += belowLoc.width;
				} else {
					return [];
				}
			} else {
				left += 1;
			}
		}

		return result;
	}

	function tdRemoveByMergeHTd(td) {
		td = $(td);
		var loc = td.data('location');
		var prevTds = tdPrevTds(td);

		if (prevTds.length > 0) {
			$(prevTds).each(function (i, prevTd) {
				prevTd = $(prevTd);
				var prevLoc = prevTd.data('location');
				prevTd.attr('colspan', prevLoc.width + loc.width);
			});
			td.remove();
			return true;
		}

		var nextTds = tdNextTds(td);

		if (nextTds.length > 0) {
			$(nextTds).each(function (i, nextTd) {
				nextTd = $(nextTd);
				var nextLoc = nextTd.data('location');
				nextTd.attr('colspan', nextLoc.width + loc.width);
			});
			td.remove();
			return true;
		}

		return false;
	}

	function tdRemoveByMergeVTd(td) {
		td = $(td);
		var loc = td.data('location');
		var aboveTds = tdAboveTds(td);

		if (aboveTds.length > 0) {
			$(aboveTds).each(function (i, aboveTd) {
				aboveTd = $(aboveTd);
				var aboveLoc = aboveTd.data('location');
				aboveTd.attr('rowspan', aboveLoc.height + loc.height);
			});
			td.remove();
			return true;
		}

		var belowTds = tdBelowTds(td);

		if (belowTds.length > 0) {
			belowTds = $(belowTds);

			belowTds.each(function (i, belowTd) {
				belowTd = $(belowTd);
				var belowLoc = belowTd.data('location');
				belowTd.attr('rowspan', belowLoc.height + loc.height);
			});

			td.replaceWith(belowTds);

			return true;
		}

		return false;
	}

	function tdSliceHByDivide(td, width) {
		td = $(td);
		var l = parseInt(width / 2, 10);
		var r = width - l;
		var location = td.data('location');
		var height = location.height;
		var newTd = $('<td rowspan="' + height + '" colspan="' + r + '">N</td>');

		td.attr('colspan', l);
		newTd.insertAfter(td);
	}

	function tdSliceHByExpand(td) {
		td = $(td);
		var tds = [];
		var table = td.closest('table');
		var map = table.data('map');
		var rows = map.length - 1;
		var locaction = td.data('location');
		var left = locaction.left;

		while (rows >= 0) {
			var eachTd = map[rows][left];
			if (eachTd) {
				if (eachTd !== td[0]) {
					tds[tds.length] = eachTd;
				}
				var loc = $(eachTd).data('location');
				rows -= loc.height;
			} else {
				rows -= 1;
			}
		}

		tds = $(tds);
		tds.each(function (i, td) {
			td = $(td);
			var loc = td.data('location');
			td.attr('colspan', loc.width + 1);
		});

		var height = locaction.height;
		var width = locaction.width;
		var newTd = $('<td rowspan="' + height + '" colspan="' + width + '">N</td>');

		newTd.insertAfter(td);
	}

	function tdSliceVByDivide(td, height) {
		td = $(td);
		var up = parseInt(height / 2, 10);
		var down = height - up;
		var loc = td.data('location');
		var width = loc.width;
		var newTd = $('<td rowspan="' + down + '" colspan="' + width + '">N</td>');
		var table = td.closest('table');
		var map = table.data('map');

		var top = loc.top + up;
		var bottom = top + down;
		var left = loc.left;

		while (top < bottom) {
			var length = width;
			while (length--) {
				map[top][left + length] = newTd[0];
			}
			top += 1;
		}

		newTd.data('location', {
			top: loc.top, left: left,
			right: left + width, bottom: loc.top + down,
			width: width, height: down
		});

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());

		td.attr('rowspan', up);
	}

	function tdSliceVByExpand (td) {
		td = $(td);
		var table = td.closest('table');
		var map = table.data('map');
		var location = td.data('location');
		var top = location.top;
		var width = location.width;
		var bottom = location.bottom;
		var left = location.left;
		var right = location.right;
		var newTd = $('<td colspan="' + width + '">N</td>');
		var cols = map[0].length - 1;
		var tds = [];

		var col = cols;
		while (col >= 0) {
			var eachTd = map[top][col];
			if (eachTd) {
				if (eachTd !== td[0]) {
					tds[tds.length] = eachTd;
				}
				var loc = $(eachTd).data('location');
				col -= loc.width;
			} else {
				col -= 1;
			}
		}

		col = cols;
		var newTds = [];

		while (col >= 0) {
			var cell = null;
			if (col < left || col >= right) {
				cell = map[top][col];
			} else {
				cell = newTd[0];
			}
			newTds[newTds.length] = cell;
			col -= 1;
		}

		map.splice(bottom, 0, newTds);

		newTd.data('location', {
			top: bottom, left: left,
			right: left + width, bottom: bottom + 1,
			width: width, height: 1
		});

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());

		$(tds).each(function (i, td) {
			td = $(td);
			var loc = td.data('location');
			td.attr('rowspan', loc.height + 1);
		});
	}

	function tdRemove(td) {
		td = $(td);
		var table = td.closest('table');

		if (table.find('td').length < 2) {
			return;
		}

		tableLocate(table);

		tdRemoveByShorten(td) ||
		tdRemoveByMergeHTd(td) ||
		tdRemoveByMergeVTd(td);

		tableShortenH(table);
		tableShortenV(table);
	}

	function tdMerge(table, tds) {
		if (tds.length < 2) { return; }

		table = $(table);
		tds = $(tds);

		tableLocate(table);

		var loc = $(tds[0]).data('location');

		var top = loc.top;
		var left = loc.left;
		var right = loc.right;
		var bottom = loc.bottom;
		var sumArea = 0;

		tds.each(function (i, td) {
			td = $(td);
			var loc = td.data('location');
			top = Math.min(top, loc.top);
			left = Math.min(left, loc.left);
			right = Math.max(right, loc.right);
			bottom = Math.max(bottom, loc.bottom);

			sumArea += loc.width * loc.height;
		});

		var area = (right - left) * (bottom - top);

		if (sumArea !== area) { return; }

		var map = table.data('map');
		var tlTd = map[top][left];

		var row = bottom;
		while (row-- > top) {
			var col = right;
			while (col-- > left) {
				map[row][col] = tlTd;
			}
		}

		tlTd = $(tlTd);

		tlTd.attr('rowspan', bottom - top);
		tlTd.attr('colspan', right - left);

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());

		tableShortenH(table);
		tableShortenV(table);

		tds.toggleClass('highlight');
	}

	function tdSliceH(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var location = td.data('location');
		var width = location.width;

		if (width > 1) {
			tdSliceHByDivide(td, width);
		} else {
			tdSliceHByExpand(td);
		}

		td.toggleClass('highlight');
	}

	function tdSliceV(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var location = td.data('location');
		var height = location.height;

		if (height > 1) {
			tdSliceVByDivide(td, height);
		} else {
			tdSliceVByExpand(td);
		}

		td.toggleClass('highlight');
	}

	function tableInsertRowAtIndex(table, index) {
		table = $(table);

		var map = table.data('map');
		var cols = map[0].length;
		var rows = map.length;
		var bottom = index;
		var newTd = null;
		var tds = [];

		if (bottom > 0 && bottom < rows) {
			var col = cols - 1;
			var top = bottom - 1;
			var length = 0;
			while (col >= 0) {
				var eachTd = map[top][col];
				if (eachTd) {
					eachTd = $(eachTd);
					var eachLoc = eachTd.data('location');
					var eachBottom = eachLoc.bottom;
					if (eachBottom === bottom) {
						length += eachLoc.width;
					}
					if (eachBottom !== bottom) {
						var l = eachLoc.left;
						var r = eachLoc.right;
						eachLoc.height += 1;
						eachTd.attr('rowspan', eachLoc.height);
						eachTd.data('location', eachLoc);
						while (l < r) {
							tds[l++] = eachTd[0];
						}
						if (length > 0) {
							l = r;
							r = l + length;
							newTd = $('<td rowspan="1" colspan="' + length + '">N</td>');
							newTd.data('location', {
								top: bottom, left: l,
								right: r, bottom: bottom + 1,
								width: length, height: 1
							});
							while (l < r) {
								tds[l++] = newTd[0];
							}
							length = 0;
						}
					}
					col -= eachLoc.width;
				} else {
					col -= 1;
				}

				if (col < 0 && length > 0) {
					newTd = $('<td rowspan="1" colspan="' + length + '">N</td>');
					newTd.data('location', {
						top: bottom, left: 0,
						right: length, bottom: bottom + 1,
						width: length, height: 1
					});
					while (length--) {
						tds[length] = newTd[0];
					}
				}
			}
		} else {
			newTd = $('<td rowspan="1" colspan="' + cols + '">N</td>');
			newTd.data('location', {
				top: bottom, left: 0,
				right: cols, bottom: bottom + 1,
				width: cols, height: 1
			});
			while (cols--) {
				tds[cols] = newTd[0];
			}
		}

		map.splice(bottom, 0, tds);

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());
	}

	function tableInsertColAtIndex(table, index) {
		table = $(table);

		var map = table.data('map');
		var cols = map[0].length;
		var rows = map.length;
		var right = index;
		var newTd = null;

		if (right > 0 && right < cols) {
			var row = rows - 1;
			var left = right - 1;
			var height = 0;
			while (row >= 0) {
				var eachTd = map[row][left];
				if (eachTd) {
					eachTd = $(eachTd);
					var eachLoc = eachTd.data('location');
					var eachRight = eachLoc.right;
					if (eachRight === right) {
						height += eachLoc.height;
					}
					if (eachRight !== right) {
						var t = eachLoc.top;
						var b = eachLoc.bottom;
						eachLoc.width += 1;
						eachTd.attr('colspan', eachLoc.width);
						eachTd.data('location', eachLoc);
						while (t < b) {
							map[t++].splice(right, 0, eachTd[0]);
						}
						if (height > 0) {
							t = b;
							b = t + height;
							newTd = $('<td colspan="1" rowspan="' + height + '">N</td>');
							newTd.data('location', {
								top: t, left: right,
								right: right + 1, bottom: b,
								width: 1, height: height
							});
							while (t < b) {
								map[t++].splice(right, 0, newTd[0]);
							}
							height = 0;
						}
					}
					row -= eachLoc.height;
				} else {
					row -= 1;
				}

				if (row < 0 && height > 0) {
					newTd = $('<td colspan="1" rowspan="' + height + '">N</td>');
					newTd.data('location', {
						top: 0, left: right,
						right: right + 1, bottom: height,
						width: 1, height: height
					});
					while (height--) {
						map[height].splice(right, 0, newTd[0]);
					}
				}
			}
		} else {
			newTd = $('<td colspan="1" rowspan="' + rows + '">N</td>');
			newTd.data('location', {
				top: 0, left: right,
				right: right + 1, bottom: rows,
				width: 1, height: rows
			});
			while (rows--) {
				map[rows].splice(right, 0, newTd[0]);
			}
		}

		var newTable = tableCreateByMap(map);

		table.empty();
		table.append(newTable.children());
	}

	function tdNewRowAfter(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var loc = td.data('location');

		tableInsertRowAtIndex(table, loc.bottom);

		td.toggleClass('highlight');
	}

	function tdNewRowBefore(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var loc = td.data('location');

		tableInsertRowAtIndex(table, loc.top);

		td.toggleClass('highlight');
	}

	function tdNewColAfter(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var loc = td.data('location');

		tableInsertColAtIndex(table, loc.right);

		td.toggleClass('highlight');
	}

	function tdNewColBefore(td) {
		td = $(td);
		var table = td.closest('table');

		tableLocate(table);

		var loc = td.data('location');

		tableInsertColAtIndex(table, loc.left);

		td.toggleClass('highlight');
	}

	$('table#qv').on('click', 'td', function () {
		$(this).toggleClass('highlight');
	});

	$('button#remove').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdRemove(this);
		});
	});

	$('button#merge').on('click', function () {
		var table = $('table#qv');
		tdMerge(table, table.find('td.highlight'));
	});

	$('button#sliceH').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdSliceH(this);
		});
	});

	$('button#sliceV').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdSliceV(this);
		});
	});

	$('button#newRowA').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdNewRowAfter(this);
		});
	});

	$('button#newRowB').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdNewRowBefore(this);
		});
	});

	$('button#newColA').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdNewColAfter(this);
		});
	});

	$('button#newColB').on('click', function () {
		$('table#qv td.highlight').each(function () {
			tdNewColBefore(this);
		});
	});
});