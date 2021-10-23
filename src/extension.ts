// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { SIGILL, SIGINT, SIGKILL } from 'constants';
import { existsSync, readFileSync } from 'fs';
import { kill } from 'process';
import * as vscode from 'vscode';

const commandId = 'esp-idf-build-command';

function sleep(ms = 300) {
	return new Promise(r => setTimeout(r, ms))
}
export function activate(context: vscode.ExtensionContext) {

	// Use the console to output diagnostic information (console.log) and errors (console.error)
	// This line of code will only be executed once when your extension is activated
	// const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	// 	? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	// if (!workspaceRoot) {
	// 	return;
	// }
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand(commandId, async function () {

		let myTerminal: vscode.Terminal = vscode.window.terminals.find(v => v.name == commandId);
		if (!myTerminal) {
			myTerminal = vscode.window.createTerminal(commandId);
			myTerminal.show();
			await sleep();
		} else {
			myTerminal.processId.then(async pid => {
				//get child PID
				const fpath = `/proc/${pid}/task/${pid}/children`;
				if (existsSync(fpath)) {
					const childPid = parseInt(readFileSync(fpath, 'ascii').trim());
					if (!isNaN(childPid)) {
						kill(childPid, SIGKILL)
						await sleep(500);
					}
				} else {
					console.warn('No Child PID')
				}
			})
		}
		myTerminal.sendText("make simple_monitor")
	}));

	// create a new status bar item that we can now manage
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
	context.subscriptions.push(myStatusBarItem);
	myStatusBarItem.command = commandId;
	myStatusBarItem.text = 'BUILD';
	myStatusBarItem.show();
}

// this method is called when your extension is deactivated
export function deactivate() {

}
