import { Workflow } from '../models/Workflow';
import { TaskStatus } from '../workers/taskRunner';

export function generateReportFromWorflow(workflow: Workflow): Record<string, any> {
	const taskDetails = [];
	const taskOutput: any = {};

	for (const tsk of workflow.tasks) {
		taskDetails.push({
			taskId: tsk.taskId,
			type: tsk.taskType,
			status: tsk.status,
			output: tsk.output ? JSON.parse(tsk.output) : null,
			error: tsk.errorMsg,
		});

		if (tsk.status === TaskStatus.Completed && tsk.taskType !== 'reportGeneration') {
			taskOutput[tsk.taskType] = tsk.output ? JSON.parse(tsk.output) : null;
		}
	}

	return {
		workflowId: workflow.workflowId,
		status: workflow.status,
		error: workflow.tasks.find((t) => t.status === TaskStatus.Failed)?.errorMsg,
		finalReport: taskOutput,
		tasks: taskDetails,
	};
}

