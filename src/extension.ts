import * as vscode from 'vscode';
import { HwpCustomProvider } from './hwpProvider';

export function activate(context: vscode.ExtensionContext): void {
  const extensionRoot = vscode.Uri.file(context.extensionPath);
  // Register our custom editor provider
  const provider = new HwpCustomProvider(extensionRoot);
  context.subscriptions.push(
    vscode.window.registerCustomEditorProvider(
      HwpCustomProvider.viewType,
      provider,
      {
        webviewOptions: {
          enableFindWidget: false, // default
          retainContextWhenHidden: true,
        },
      }
    )
  );
}

export function deactivate(): void {}
