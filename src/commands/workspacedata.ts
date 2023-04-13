import * as vscode from 'vscode';
import { ExtData } from '../helpers/extensionData/extData';
import { Account } from '../models/account';
import { AccountDataProvider } from '../views/accountDataProvider';
import { ContractDataProvider } from '../views/contractDataProvider';

export class WorkspaceDataCmds {
	public static async Register(context: vscode.ExtensionContext) {
		this.registerResetDataCmd(context, accountViewProvider, contractViewProvider);
		this.registerExportDataCmd(context);
	}

	private static registerExportDataCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.export', async () => {
			const data = ExtData.GetExtensionData(context.globalState);
			data.accounts = await Account.GetAccounts(context.globalState);
			vscode.workspace.openTextDocument({
				language: "jsonc"
			}).then(doc => {
				vscode.window.showTextDocument(doc).then(editor => {
					editor.insertSnippet(new vscode.SnippetString(JSON.stringify(data, null, 4)));
				});
			});
		});
		context.subscriptions.push(disposable);
	}

	private static registerResetDataCmd(context: vscode.ExtensionContext, accountViewProvider: AccountDataProvider, contractViewProvider: ContractDataProvider) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.resetData', () => {
			vscode.window.showQuickPick(["Yes", "No"], {
				title: vscode.l10n.t("Are you sure you want to delete all data?"),
				placeHolder: vscode.l10n.t("Are you sure you want to delete all data?")
			}).then(resp => {
				if (resp && resp.toLowerCase() === "yes") {
					ExtData.ResetExtensionData(context.globalState);
					vscode.window.showInformationMessage(vscode.l10n.t('All okx wasmy data was reset!'));
					var data = ExtData.GetExtensionData(context.globalState);
					accountViewProvider.refresh(data.accounts);
					contractViewProvider.refresh(data.contracts);
				}
			})
		});

		context.subscriptions.push(disposable);
	}
}