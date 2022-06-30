import * as vscode from 'vscode';
import { Workspace } from '../helpers/Workspace';
import { Constants } from '../constants';
import { Account } from '../models/Account';
import { Contract } from '../models/Contract';
import { Cosmwasm } from '../helpers/CosmwasmAPI';
import { HistoryHandler } from '../helpers/HistoryHandler';


export class TxProvider implements vscode.WebviewViewProvider {

	constructor(
		private readonly _extensionUri: vscode.Uri,
		private readonly context: vscode.Memento,
	) { }

	resolveWebviewView(webviewView: vscode.WebviewView, context: vscode.WebviewViewResolveContext<unknown>, token: vscode.CancellationToken): void | Thenable<void> {
		webviewView.webview.options = {
			enableScripts: true,
		};

		webviewView.webview.html = this._getHtmlForWebview(webviewView.webview);

		webviewView.webview.onDidReceiveMessage(data => {
			switch (data.type) {
				case 'exec-text':
					{
						const account = Workspace.GetSelectedAccount();
						if (!account) {
							vscode.window.showErrorMessage("No account selected. Select an account from the Accounts view.");
							return;
						}
						const contract = Workspace.GetSelectedContract();
						if (!contract) {
							vscode.window.showErrorMessage("No contract selected. Select a contract in the Contracts view.");
							return;
						}
						try {
							JSON.parse(data.value);
						} catch {
							vscode.window.showErrorMessage("The input is not valid JSON");
							return;
						}
						this.executeTx(data, contract, account);
						break;
					}
			}
		});
	}

	private executeTx(data: any, contract: Contract, account: Account) {
		const req = JSON.parse(data.value);

		HistoryHandler.RecordAction(this.context, contract, Constants.VIEWS_EXECUTE, data.value);
		vscode.window.withProgress({
			location: { viewId: Constants.VIEWS_EXECUTE },
			title: "Executing msg on the contract - " + contract.label,
			cancellable: false
		}, (progress, token) => {
			token.onCancellationRequested(() => { });
			progress.report({ message: '' });
			return new Promise(async (resolve, reject) => {
				await Cosmwasm.Execute(account, contract, req, resolve, reject);
			});
		});
	}

	private _getHtmlForWebview(webview: vscode.Webview) {

		const styleResetUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'reset.css'));
		const styleVSCodeUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'vscode.css'));
		const styleMainUri = webview.asWebviewUri(vscode.Uri.joinPath(this._extensionUri, 'media', 'main.css'));

		return `<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<!--
					Use a content security policy to only allow loading images from https or from our extension directory,
					and only allow scripts that have a specific nonce.
				-->
				<meta http-equiv="Content-Security-Policy" style-src ${webview.cspSource};">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<link href="${styleResetUri}" rel="stylesheet">
				<link href="${styleVSCodeUri}" rel="stylesheet">
				<link href="${styleMainUri}" rel="stylesheet">
				
				<title>Tx Page</title>
			</head>
			<body>
				<textarea id="input-text" placeholder="{'increment':{}}"></textarea>
				<button id="exec-button">Execute</button>
				<script>
					(function () {
						const vscode = acquireVsCodeApi();
						document.querySelector('#exec-button').addEventListener('click', () => {
							const input = document.getElementById('input-text').value;
							vscode.postMessage({ type: 'exec-text', value: input });
						});
					}());
				</script>
			</body>
			</html>`;
	}
}