/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/
import * as path from 'path';
import * as vscode from 'vscode';
async function getTasks(): Promise<vscode.Task[]> {
    const workspaceFolders = vscode.workspace.workspaceFolders;
    const result: vscode.Task[] = [];
    if (!workspaceFolders || workspaceFolders.length === 0) {
        console.log('Not Creating task, no workspaces')
        return result;
    }
    for (const workspaceFolder of workspaceFolders) {
        const folderString = workspaceFolder.uri.fsPath;
        if (!folderString) {
            continue;
        }
        const dirname = path.basename(folderString);
        const taskName = `build-monitor-${dirname}`
        const kind = {
            type: BuildMonitorTaskProvider.type,
            task: taskName
        };

        console.log('Creating task', taskName)
        const task = new vscode.Task(kind, workspaceFolder, taskName, BuildMonitorTaskProvider.type,
            () => {
                // How to call our command?
                return vscode.commands.executeCommand('build-monitor.build')
            });
        task.group = vscode.TaskGroup.Build;
        result.push(task)
    }

    return result
}
export class BuildMonitorTaskProvider implements vscode.TaskProvider {
    static type = 'build-monitor';
    private resultPromise: Thenable<vscode.Task[]> | undefined = undefined;

    constructor() {

    }

    public provideTasks() {
        if (!this.resultPromise) {
            this.resultPromise = getTasks()
        }
        return this.resultPromise;
    }

    public resolveTask(_task: vscode.Task): vscode.Task | undefined {
        const task = _task.definition.task;
        // A BuildMonitor task consists of a task and an optional file as specified in BuildMonitorTaskDefinition
        // Make sure that this looks like a BuildMonitor task by checking that there is a task.
        if (task) {
            // resolveTask requires that the same definition object be used.
            const definition = <any>_task.definition;
            return new vscode.Task(definition, _task.scope ?? vscode.TaskScope.Workspace, definition.task, 'BuildMonitor', vscode.commands.executeCommand(`build-monitor.build`));
        }
        return undefined;
    }
}
