import * as path from 'path';
import * as vscode from 'vscode';
import { Disposable } from './disposable';

function escapeAttribute(value: string | vscode.Uri): string {
  return value.toString().replace(/"/g, '&quot;');
}

type PreviewState = 'Disposed' | 'Visible' | 'Active';

export class HwpPreview extends Disposable {
  private _previewState: PreviewState = 'Visible';

  constructor(
    private readonly extensionRoot: vscode.Uri,
    private readonly resource: vscode.Uri,
    private readonly webviewEditor: vscode.WebviewPanel
  ) {
    super();
    const resourceRoot = resource.with({
      path: resource.path.replace(/\/[^/]+?\.\w+$/, '/'),
    });

    webviewEditor.webview.options = {
      enableScripts: true,
      localResourceRoots: [resourceRoot, extensionRoot],
    };

    this._register(
      webviewEditor.webview.onDidReceiveMessage((message) => {
        switch (message.type) {
          case 'reopen-as-text': {
            vscode.commands.executeCommand(
              'vscode.openWith',
              resource,
              'default',
              webviewEditor.viewColumn
            );
            break;
          }
        }
      })
    );

    this._register(
      webviewEditor.onDidChangeViewState(() => {
        this.update();
      })
    );

    this._register(
      webviewEditor.onDidDispose(() => {
        this._previewState = 'Disposed';
      })
    );

    const watcher = this._register(
      vscode.workspace.createFileSystemWatcher(resource.fsPath)
    );
    this._register(
      watcher.onDidChange((e) => {
        if (e.toString() === this.resource.toString()) {
          this.reload();
        }
      })
    );
    this._register(
      watcher.onDidDelete((e) => {
        if (e.toString() === this.resource.toString()) {
          this.webviewEditor.dispose();
        }
      })
    );

    this.webviewEditor.webview.html = this.getWebviewContents();
    this.update();
  }

  private reload(): void {
    if (this._previewState !== 'Disposed') {
      this.webviewEditor.webview.postMessage({ type: 'reload' });
    }
  }

  private update(): void {
    if (this._previewState === 'Disposed') {
      return;
    }

    if (this.webviewEditor.active) {
      this._previewState = 'Active';
      return;
    }
    this._previewState = 'Visible';
  }

  private getWebviewContents(): string {
    const webview = this.webviewEditor.webview;
    const docPath = webview.asWebviewUri(this.resource);
    const cspSource = webview.cspSource;
    const resolveAsUri = (...p: string[]): vscode.Uri => {
      const uri = vscode.Uri.file(path.join(this.extensionRoot.path, ...p));
      return webview.asWebviewUri(uri);
    };

    return `<!DOCTYPE html>
    <html>
      <head>
        <meta charset="utf-8">
        <link rel="stylesheet" href="${resolveAsUri('lib', 'hwp', 'viewer.css')}" />
      </head>
      <body>
        <script src="${resolveAsUri('lib', 'hwp', 'hwp.js')}"></script>
        <script>
        const fileUrl = "${escapeAttribute(docPath.toString())}"
        const xhr = new XMLHttpRequest()

        xhr.onload = () => {
          const fileName = decodeURIComponent(fileUrl.split('/').pop())
          document.title = fileName
          new HWP.Viewer(document.body, new Uint8Array(xhr.response), { type: 'array' })
        }

        xhr.open('GET', fileUrl)
        xhr.responseType = 'arraybuffer'
        xhr.send()

        
        </script>
      </body>
    </html>`;
  }
}
