import * as vscode from 'vscode';
import { WrapWallet} from '../helpers/Sign/wrapwallet';
import { Constants } from '../constants';
import { CosmwasmAPI } from '../helpers/cosmwasm/api';
import { Workspace } from '../helpers/workspace';
import { Account } from '../models/account';
import { Contract } from '../models/contract';
import { AccountDataProvider } from '../views/accountDataProvider';

export class AccountCmds {
	public static async Register(context: vscode.ExtensionContext) {
		this.registerAddAccountCmd(context, accountViewProvider);
		this.registerRequestFundsCmd(context, accountViewProvider);
		this.registerOpenInExplorerCmd(context);
		this.registerCopyAccountAddressCmd(context);
		this.registerCopyMnemonicCmd(context);
		this.registerDeleteAddressCmd(context, accountViewProvider);
		this.registerSelectAccountCmd(context);
		this.registerRefreshAccountCmd(context);
	}


	private static registerAddAccountCmd(context: vscode.ExtensionContext, accountViewProvider: AccountDataProvider) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.addAccount', () => {
			vscode.window.showInputBox({
				title: vscode.l10n.t("Account Label"),
				value: vscode.l10n.t("testAccount"),
			}).then(accountLabel => {
				if (accountLabel) {
					if (!Account.AccountLabelExists(context.globalState, accountLabel)) {
						const options = [vscode.l10n.t("Generate seed phrase for me (Recommended)"), vscode.l10n.t("I have a seed phrase")];
						vscode.window.showQuickPick(options).then(rr => {
							if (rr) {
								if (rr === vscode.l10n.t("Generate seed phrase for me (Recommended)")) {
									let defaultLen = WrapWallet.isEthSecp256k1(global.workspaceChain.signType)? 12 : 24;
									WrapWallet.generate(global.workspaceChain.signType, defaultLen).then(wallet => {
										const account = new Account(accountLabel, wallet.mnemonic);
										saveNewAccount(account);
									});
								}
								if (rr === vscode.l10n.t("I have a seed phrase")) {
									vscode.window.showInputBox({
										title: vscode.l10n.t("Account Mnemonic"),
										placeHolder: vscode.l10n.t("Ensure this is not your main account seed phrase. This info is stored in plain text in vscode.")
									}).then(mnemonic => {
										if (mnemonic) {
											const account = new Account(accountLabel, mnemonic)
											saveNewAccount(account);
										}
									})
								}
							}
						});
					}
					else {
						vscode.window.showErrorMessage(vscode.l10n.t("Account label \"{label}\" is already taken. Choose a new one.", { label: accountLabel }));
					}
				}
			})
		});

		context.subscriptions.push(disposable);

		async function saveNewAccount(account: Account) {
			if (!Account.AccountMnemonicExists(context.globalState, account.mnemonic)) {
				if (!await Account.AddAccount(context.globalState, account)){
					vscode.window.showErrorMessage(vscode.l10n.t("Given seed phrase is invalid - '{mnemonic}'", { mnemonic: account.mnemonic }));
					return;
				}
				vscode.window.showInformationMessage(vscode.l10n.t("Added new account: {label}", { label: account.label }));
				const accounts = await Account.GetAccounts(context.globalState);
				accountViewProvider.refresh(accounts);
			}
			else {
				vscode.window.showErrorMessage(vscode.l10n.t("{label} - Account with given seed phrase is already imported.", { label: account.label }));
			}
		}
	}

	private static registerRequestFundsCmd(context: vscode.ExtensionContext, accountViewProvider: AccountDataProvider) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.requestFunds', async (item: Account) => {
			if (item.address) {
				if (global.workspaceChain.faucetEndpoint) {
					vscode.window.withProgress({
						location: {
							viewId: Constants.VIEWS_ACCOUNT
						},
						title: vscode.l10n.t("Requesting funds from faucet"),
						cancellable: false
					}, (progress, token) => {
						token.onCancellationRequested(() => { });
						progress.report({ message: '' });
						return new Promise(async (resolve, reject) => {
							try {
								await CosmwasmAPI.RequestFunds(item.address);
								vscode.window.showInformationMessage(vscode.l10n.t("Funds updated! 🤑🤑"));
								var accounts = await Account.GetAccounts(context.globalState);
								accountViewProvider.refresh(accounts);
								resolve(undefined);
							}
							catch (err: any) {
								vscode.window.showErrorMessage(vscode.l10n.t("Woopsie! Could not add funds 😿 - {err}", { err: err }));
								reject(err);
							}
						});
					});
				}
				else {
					vscode.window.showErrorMessage(vscode.l10n.t("Faucet endpoint has not been set in the chain config settings"));
				}
			}
		});
		context.subscriptions.push(disposable);
	}

	private static registerOpenInExplorerCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.openInExplorer', (item: Account) => {
			const url = global.workspaceChain.accountExplorerLink;
			const explorerUrl = url.replace("${accountAddress}", item.address);
			vscode.env.openExternal(vscode.Uri.parse(explorerUrl));
		});
		context.subscriptions.push(disposable);
	}

	private static registerCopyAccountAddressCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.copyAddress', (item: Account | Contract) => {
			let address = "";
			if ((item as Account).address) {
				address = (item as Account).address;
			}
			else if ((item as Contract).contractAddress) {
				address = (item as Contract).contractAddress;
			}
			if (address) {
				vscode.env.clipboard.writeText(address).then(() => {
					vscode.window.showInformationMessage(vscode.l10n.t("Copied to clipboard: {addr}", { addr: address }));
				});
			}
			else {
				vscode.window.showErrorMessage(vscode.l10n.t("Could not copy to clipboard."));
			}
		});
		context.subscriptions.push(disposable);
	}

	private static registerCopyMnemonicCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.copyMnemonic', (item: Account) => {
			if (item.mnemonic) {
				vscode.env.clipboard.writeText(item.mnemonic).then(() => {
					vscode.window.showInformationMessage(vscode.l10n.t("Copied to clipboard: {seed}", { seed: item.mnemonic }));
				});
			}
			else {
				vscode.window.showErrorMessage(vscode.l10n.t("Could not copy to clipboard."));
			}
		});
		context.subscriptions.push(disposable);
	}

	private static registerDeleteAddressCmd(context: vscode.ExtensionContext, accountViewProvider: AccountDataProvider) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.deleteAccount', (item: Account) => {
			vscode.window.showQuickPick(["Yes", "No"], {
				title: vscode.l10n.t("Are you sure you want to delete the account {label}?", { label: item.label }),
				placeHolder: vscode.l10n.t("Are you sure you want to delete the account {label} ?", { label: item.label }),
			}).then(async resp => {
				if (resp && resp.toLowerCase() === "yes") {
					Account.DeleteAccount(context.globalState, item);
					var accounts = await Account.GetAccounts(context.globalState);
					accountViewProvider.refresh(accounts);
					vscode.window.showInformationMessage(vscode.l10n.t("Deleted account: {label}", { label: item.label }));
				}
			})
		});
		context.subscriptions.push(disposable);
	}

	private static registerSelectAccountCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.selectAccount', (account: Account) => {
			Workspace.SetSelectedAccount(account);
		});
		context.subscriptions.push(disposable);
	}

	private static registerRefreshAccountCmd(context: vscode.ExtensionContext) {
		let disposable = vscode.commands.registerCommand('okx-wasmy.refreshAccount', async () => {
			vscode.window.withProgress({
				location: { viewId: Constants.VIEWS_ACCOUNT },
				title: vscode.l10n.t("Refreshing account view"),
				cancellable: false
			}, async (progress, token) => {
				token.onCancellationRequested(() => { });
				progress.report({ message: '' });
				const accounts = await Account.GetAccounts(context.globalState);
				accountViewProvider.refresh(accounts);
				return Promise.resolve();
			});
		});
		context.subscriptions.push(disposable);
	}
}