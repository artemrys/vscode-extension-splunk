import * as vscode from 'vscode';

import {
    dispatchSpl2Module,
    getClient,
} from '../splunk';
import { SplunkController } from '../controller';
import { splunkMessagesToOutputItems } from '../utils';

export class Spl2Controller extends SplunkController {
    constructor() {
        super('spl2-notebook-controller', 'spl2-notebook', 'SPL2 Note', ['splunk_spl2']);
        this._controller.executeHandler = this._execute.bind(this);
    }

    protected _execute(
        cells: vscode.NotebookCell[],
        _notebook: vscode.NotebookDocument,
        _controller: vscode.NotebookController
    ): void {
        for (let cell of cells) {
            if (cell.document.languageId == 'splunk_spl2') {
                this._doSpl2Execution(cell);
            }
        }
    }

    private async _doSpl2Execution(cell: vscode.NotebookCell): Promise<void> {
        const execution = super._startExecution(cell);

        const spl2Module = cell.document.getText().trim();
        const service = getClient();
    
        let job;
        try {
            job = await dispatchSpl2Module(
                service,
                spl2Module,
                cell?.metadata?.splunk?.earliestTime,
                cell?.metadata?.splunk?.latestTime,
            );
            await super._finishExecution(job, cell, execution);
        } catch (failedResponse) {
            let outputItems: vscode.NotebookCellOutputItem[] = [];
            if (!failedResponse.data || !failedResponse.data.messages) {
                outputItems = [vscode.NotebookCellOutputItem.error(failedResponse)];
            } else {
                const messages = failedResponse.data.messages;
                outputItems = splunkMessagesToOutputItems(messages);
            }

            execution.replaceOutput([new vscode.NotebookCellOutput(outputItems)]);
            execution.end(false, Date.now());
        }
    }
}
