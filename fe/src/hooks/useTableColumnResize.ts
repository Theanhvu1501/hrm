import { useEffect, useRef, useCallback } from 'react';

const STORAGE_KEY_PREFIX = 'table-col-widths-';

/**
 * Hook to enable column resizing for Ant Design tables using pure DOM manipulation.
 * Supports tables with scroll.y (which creates separate header and body tables).
 * Persists column widths to localStorage.
 */
export function useTableColumnResize(tableClassName: string, storageKey?: string) {
  const isResizingRef = useRef(false);
  const appliedRef = useRef(false);
  const key = storageKey || `${STORAGE_KEY_PREFIX}${tableClassName}`;

  // Load saved widths from localStorage
  const getSavedWidths = useCallback((): Record<number, number> => {
    try {
      const saved = localStorage.getItem(key);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  }, [key]);

  // Save widths to localStorage
  const saveWidth = useCallback((colIndex: number, width: number) => {
    try {
      const widths = getSavedWidths();
      widths[colIndex] = width;
      localStorage.setItem(key, JSON.stringify(widths));
    } catch {
      // Ignore storage errors
    }
  }, [key, getSavedWidths]);

  // Apply saved widths to table
  const applySavedWidths = useCallback((tableWrapper: Element) => {
    const savedWidths = getSavedWidths();
    if (Object.keys(savedWidths).length === 0) return;

    const headerTable = tableWrapper.querySelector('.ant-table-header table');
    const bodyTable = tableWrapper.querySelector('.ant-table-body table');
    const headerColgroup = headerTable?.querySelector('colgroup');
    const bodyColgroup = bodyTable?.querySelector('colgroup');

    // Check if colgroups exist
    if (!headerColgroup && !bodyColgroup) return;

    Object.entries(savedWidths).forEach(([indexStr, width]) => {
      const index = parseInt(indexStr, 10);
      const widthStr = `${width}px`;

      if (headerColgroup && headerColgroup.children[index]) {
        const col = headerColgroup.children[index] as HTMLElement;
        col.style.width = widthStr;
        col.style.minWidth = widthStr;
      }

      if (bodyColgroup && bodyColgroup.children[index]) {
        const col = bodyColgroup.children[index] as HTMLElement;
        col.style.width = widthStr;
        col.style.minWidth = widthStr;
      }

      // Also update th
      const headerCells = headerTable
        ? headerTable.querySelectorAll<HTMLTableCellElement>('thead th')
        : tableWrapper.querySelectorAll<HTMLTableCellElement>('.ant-table-thead th');

      if (headerCells[index]) {
        headerCells[index].style.width = widthStr;
        headerCells[index].style.minWidth = widthStr;
      }
    });

    appliedRef.current = true;
  }, [getSavedWidths]);

  const initResize = useCallback(() => {
    if (isResizingRef.current) return;

    const tableWrapper = document.querySelector(`.${tableClassName}`);
    if (!tableWrapper) return;

    // Ant Design with scroll.y creates: .ant-table-header table and .ant-table-body table
    const headerTable = tableWrapper.querySelector('.ant-table-header table');
    const bodyTable = tableWrapper.querySelector('.ant-table-body table');

    // Get header cells from header table
    const headerCells = headerTable
      ? headerTable.querySelectorAll<HTMLTableCellElement>('thead th:not(.ant-table-cell-fix-right)')
      : tableWrapper.querySelectorAll<HTMLTableCellElement>('.ant-table-thead th:not(.ant-table-cell-fix-right)');

    if (headerCells.length === 0) return;

    // Always try to apply saved widths
    applySavedWidths(tableWrapper);

    headerCells.forEach((th, index) => {
      if (th.querySelector('.col-resize-handle')) return;

      const handle = document.createElement('div');
      handle.className = 'col-resize-handle';
      handle.setAttribute('data-col-index', String(index));
      th.style.position = 'relative';
      th.appendChild(handle);

      handle.addEventListener('mousedown', (e) => {
        e.preventDefault();
        e.stopPropagation();

        isResizingRef.current = true;
        const startX = e.pageX;
        const startWidth = th.offsetWidth;

        // Get fresh references to colgroups
        const currentHeaderColgroup = headerTable?.querySelector('colgroup');
        const currentBodyColgroup = bodyTable?.querySelector('colgroup');

        document.body.classList.add('col-resizing');

        const onMove = (moveEvent: MouseEvent) => {
          const diff = moveEvent.pageX - startX;
          const newWidth = Math.max(40, startWidth + diff);
          const widthStr = `${newWidth}px`;

          // Update header colgroup
          if (currentHeaderColgroup && currentHeaderColgroup.children[index]) {
            const col = currentHeaderColgroup.children[index] as HTMLElement;
            col.style.width = widthStr;
            col.style.minWidth = widthStr;
          }

          // Update body colgroup
          if (currentBodyColgroup && currentBodyColgroup.children[index]) {
            const col = currentBodyColgroup.children[index] as HTMLElement;
            col.style.width = widthStr;
            col.style.minWidth = widthStr;
          }

          // Also update th directly
          th.style.width = widthStr;
          th.style.minWidth = widthStr;
        };

        const onUp = (upEvent: MouseEvent) => {
          document.body.classList.remove('col-resizing');
          isResizingRef.current = false;

          // Calculate final width and save to localStorage
          const diff = upEvent.pageX - startX;
          const finalWidth = Math.max(40, startWidth + diff);
          saveWidth(index, finalWidth);

          document.removeEventListener('mousemove', onMove);
          document.removeEventListener('mouseup', onUp);
        };

        document.addEventListener('mousemove', onMove);
        document.addEventListener('mouseup', onUp);
      });
    });
  }, [tableClassName, applySavedWidths, saveWidth]);

  useEffect(() => {
    // Apply saved widths multiple times to handle Ant Design re-renders
    const timers = [
      setTimeout(initResize, 100),
      setTimeout(initResize, 300),
      setTimeout(initResize, 500),
      setTimeout(initResize, 1000),
    ];

    // Re-init when data changes
    const observer = new MutationObserver(() => {
      if (!isResizingRef.current) {
        // Debounce and apply
        setTimeout(() => {
          const tableWrapper = document.querySelector(`.${tableClassName}`);
          if (tableWrapper) {
            applySavedWidths(tableWrapper);
            initResize();
          }
        }, 50);
      }
    });

    const container = document.querySelector(`.${tableClassName}`);
    if (container) {
      observer.observe(container, { childList: true, subtree: true });
    }

    return () => {
      timers.forEach(clearTimeout);
      observer.disconnect();
    };
  }, [tableClassName, initResize, applySavedWidths]);
}
