import { Not } from 'typeorm';
import { AppDataSource } from '../data-source';
import { Task } from '../models/Task';
import { Job } from './Job';
import { TaskStatus } from '../workers/taskRunner';
import { Workflow } from '../models/Workflow';

export class ReportGenerationJob implements Job {
	async run(task: Task, dependency?: Task): Promise<Record<string, any>> {
		const workflowRepository = AppDataSource.manager.getRepository(Workflow);
		const workflow = await workflowRepository.findOne({
			where: {
				workflowId: task.workflow.workflowId,
				tasks: {
					taskId: Not(task.taskId),
				},
			},
			relations: ['tasks'],
		});

		const report: Record<string, any> = {};
		const tasks = [];
		let error: string | null = null;

		for (const tsk of workflow?.tasks ?? []) {
			let { taskId, taskType, output, status, errorMsg } = tsk;
			output = output ? JSON.parse(output) : null;

			tasks.push({
				taskId,
				output,
				type: taskType,
				status,
			});
			if (status === TaskStatus.Completed && output) {
				report[taskType] = output;
			}

			if (status === TaskStatus.Failed && errorMsg) {
				error = errorMsg;
			}
		}

		const result = {
			workflowId: workflow?.workflowId,
			finalReport: report,
			error,
			tasks,
		};
		return result;
	}
}

