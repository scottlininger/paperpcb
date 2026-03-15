/**
 * DropHandler — Generic drag-and-drop file handler.
 *
 * Creates a drop zone UI inside a container element and calls a callback
 * with the dropped files. Supports single files, multiple files, and
 * recursive folder drops via the FileSystemDirectoryEntry API.
 *
 * Usage:
 *   const handler = new DropHandler(container, onDrop, 'Drop files here');
 *   // handler.setMessage('Processing...');
 *   // handler.showError('Something went wrong');
 */

export class DropHandler {
  /**
   * @param {HTMLElement} container - Element to append the drop zone into
   * @param {function({files: File[], folderName: string|null}): void} onDrop - Called with dropped files
   * @param {string} messageHtml - Default message shown in the drop zone
   */
  constructor(container, onDrop, messageHtml) {
    this._onDrop = onDrop;
    this._defaultMessage = messageHtml;

    // Inject styles (once per page).
    if (!DropHandler._stylesInjected) {
      const style = document.createElement('style');
      style.textContent = `
        .drop-zone {
          border: 2px dashed #aaa;
          border-radius: 8px;
          padding: 40px 20px;
          text-align: center;
          color: #888;
          transition: border-color 0.15s, background 0.15s;
          cursor: pointer;
        }
        .drop-zone.over {
          border-color: #4284f5;
          background: rgba(66, 132, 245, 0.06);
        }
      `;
      document.head.appendChild(style);
      DropHandler._stylesInjected = true;
    }

    // Create drop zone element.
    this._el = document.createElement('div');
    this._el.className = 'drop-zone';
    this._el.innerHTML = `<p>${messageHtml}</p>`;
    container.appendChild(this._el);

    // Bind events.
    this._el.addEventListener('dragover', (e) => {
      e.preventDefault();
      this._el.classList.add('over');
    });

    this._el.addEventListener('dragleave', () => {
      this._el.classList.remove('over');
    });

    this._el.addEventListener('drop', (e) => this._handleDrop(e));
  }

  /** Update the drop zone message text. */
  setMessage(text) {
    this._el.querySelector('p').textContent = text;
  }

  /** Reset the drop zone message to the original HTML. */
  resetMessage() {
    this._el.querySelector('p').innerHTML = this._defaultMessage;
  }

  /** @returns {HTMLElement} The drop zone element. */
  get element() {
    return this._el;
  }

  // -- Internal --

  async _handleDrop(e) {
    e.preventDefault();
    this._el.classList.remove('over');

    const items = e.dataTransfer.items;

    // Check for folder drop via webkitGetAsEntry.
    if (items && items.length > 0) {
      const entry = items[0].webkitGetAsEntry?.();
      if (entry && entry.isDirectory) {
        const folderName = entry.name;
        this.setMessage(`Reading folder ${folderName}...`);
        try {
          const files = await DropHandler._readDirectoryFiles(entry);
          this._onDrop({ files, folderName });
        } catch (err) {
          this._onDrop({ files: [], folderName, error: err });
        }
        return;
      }
    }

    // Single or multiple file drop.
    const files = Array.from(e.dataTransfer.files);
    if (files.length === 0) return;

    this.setMessage(`Reading ${files.length === 1 ? files[0].name : `${files.length} files`}...`);
    this._onDrop({ files, folderName: null });
  }

  /**
   * Recursively read all files from a directory entry.
   * Uses the FileSystemDirectoryEntry API (webkitGetAsEntry).
   */
  static _readDirectoryFiles(dirEntry) {
    return new Promise((resolve, reject) => {
      const allFiles = [];
      const reader = dirEntry.createReader();

      function readBatch() {
        reader.readEntries((entries) => {
          if (entries.length === 0) {
            resolve(allFiles);
            return;
          }
          let pending = entries.length;
          for (const entry of entries) {
            if (entry.isFile) {
              entry.file((file) => {
                allFiles.push(file);
                if (--pending === 0) readBatch();
              }, () => {
                if (--pending === 0) readBatch();
              });
            } else if (entry.isDirectory) {
              DropHandler._readDirectoryFiles(entry).then((nested) => {
                allFiles.push(...nested);
                if (--pending === 0) readBatch();
              }).catch(() => {
                if (--pending === 0) readBatch();
              });
            } else {
              if (--pending === 0) readBatch();
            }
          }
        }, reject);
      }

      readBatch();
    });
  }
}

DropHandler._stylesInjected = false;
