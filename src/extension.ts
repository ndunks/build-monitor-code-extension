// The module 'vscode' contains the VS Code extensibility API
// Import the module and reference it with the alias vscode in your code below
import { existsSync, readFileSync } from 'fs';
import { kill } from 'process';
import * as vscode from 'vscode';
import { BuildMonitorTaskProvider } from './task-provider';
const ID = 'build-monitor';
const commandId = `${ID}.build`;
let taskProvider: vscode.Disposable

function sleep(ms = 300) {
	return new Promise(r => setTimeout(r, ms))
}

function findTheLastChild(pid: number) {
	const fpath = `/proc/${pid}/task/${pid}/children`;
	if (existsSync(fpath)) {
		const childs = readFileSync(fpath, 'ascii').trim();
		//console.log('PID', pid, 'childs:', childs)
		const childPid = parseInt(childs);
		if (isNaN(childPid)) {
			return 0;
		} else {
			return findTheLastChild(childPid) || childPid
		}
	} else {
		return 0
	}
}

export function activate(context: vscode.ExtensionContext) {
	console.log(ID, 'Activated')
	// The command has been defined in the package.json file
	// Now provide the implementation of the command with  registerCommand
	// The commandId parameter must match the command field in package.json
	context.subscriptions.push(vscode.commands.registerCommand(commandId, async function () {
		let myTerminal: vscode.Terminal = vscode.window.terminals.find(v => v.name == commandId);
		const config = vscode.workspace.getConfiguration(ID);
		if (!myTerminal) {
			myTerminal = vscode.window.createTerminal(commandId);
			myTerminal.show();
			await sleep();
		} else {
			await myTerminal.processId.then(async pid => {
				//get child PID
				let childPid = findTheLastChild(pid);
				if (childPid > 0) {
					kill(childPid, config.kill_signal || "SIGTERM")
					let currentChildPid = findTheLastChild(pid);
					let counter = 0;
					do {
						if (counter++ >= 4) {
							console.warn('Timeout waiting child process to exit.');
							kill(childPid, "SIGTERM")
							await sleep(200);
							break;
						}
						await sleep(200);
						currentChildPid = findTheLastChild(pid);
					} while (currentChildPid)

				} else {
					console.warn('No Child PID')
				}
			})
		}
		myTerminal.sendText(`${config.command} ${config.command_args.join(' ')}`)
	}));

	// create a new status bar item that we can now manage
	const myStatusBarItem = vscode.window.createStatusBarItem(vscode.StatusBarAlignment.Left, 100)
	context.subscriptions.push(myStatusBarItem);
	myStatusBarItem.command = commandId;
	myStatusBarItem.text = 'Build & Monitor';
	myStatusBarItem.show();

	// const workspaceRoot = (vscode.workspace.workspaceFolders && (vscode.workspace.workspaceFolders.length > 0))
	// 	? vscode.workspace.workspaceFolders[0].uri.fsPath : undefined;
	// if (!workspaceRoot) {
	// 	console.log('No workspace for tasks')
	// 	return;
	// }
	// console.log('Creatng Task')

	// taskProvider = vscode.tasks.registerTaskProvider(BuildMonitorTaskProvider.type, new BuildMonitorTaskProvider());
}

// this method is called when your extension is deactivated
export function deactivate() {
	console.log(ID, 'Deactivated')
	if (taskProvider) {
		taskProvider.dispose()
	}
}
