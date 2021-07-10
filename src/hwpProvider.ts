import * as vscode from 'vscode';
import { HwpPreview } from './hwpPreview';

export class HwpCustomProvider implements vscode.CustomReadonlyEditorProvider {
  public static readonly viewType = 'hwp.preview';

  private readonly _previews = new Set<HwpPreview>();
  private _activePreview: HwpPreview | undefined;

  constructor(private readonly extensionRoot: vscode.Uri) {}

  public openCustomDocument(uri: vscode.Uri): vscode.CustomDocument {
    return { uri, dispose: (): void => {} };
  }

  public async resolveCustomEditor(
    document: vscode.CustomDocument,
    webviewEditor: vscode.WebviewPanel
  ): Promise<void> {
    const preview = new HwpPreview(
      this.extensionRoot,
      document.uri,
      webviewEditor
    );
    this._previews.add(preview);
    this.setActivePreview(preview);

    webviewEditor.onDidDispose(() => {
      this._previews.delete(preview);
    });

    webviewEditor.onDidChangeViewState(() => {
      if (webviewEditor.active) {
        this.setActivePreview(preview);
      } else if (this._activePreview === preview && !webviewEditor.active) {
        this.setActivePreview(undefined);
      }
    });
  }

  public get activePreview(): HwpPreview {
    return this._activePreview;
  }

  private setActivePreview(value: HwpPreview | undefined): void {
    this._activePreview = value;
  }
}
