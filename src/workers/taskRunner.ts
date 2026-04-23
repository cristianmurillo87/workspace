import { Repository } from 'typeorm';
import { Task } from '../models/Task';
import { getJobForTaskType } from '../jobs/JobFactory';
import { WorkflowStatus } from '../workflows/WorkflowFactory';
import { Workflow } from '../models/Workflow';
import { Result } from '../models/Result';
import { generateReportFromWorflow } from '../utils/workflow-utils';

export enum TaskStatus {
	Queued = 'queued',
	InProgress = 'in_progress',
	Completed = 'completed',
	Failed = 'failed',
	Skipped = 'skipped',
}

export class TaskRunner {
	constructor(private taskRepository: Repository<Task>) {}

	/**
	 * Runs the appropriate job based on the task's type, managing the task's status.
	 * @param task - The task entity that determines which job to run.
	 * @throws If the job fails, it rethrows the error.
	 */
	async run(task: Task): Promise<void> {
		task.status = TaskStatus.InProgress;
		task.progress = 'starting job...';
		await this.taskRepository.save(task);
		const job = getJobForTaskType(task.taskType);
		const resultRepository = this.taskRepository.manager.getRepository(Result);

		try {
			let taskDependency: Task | undefined = undefined;

			if (task.dependency) {
				taskDependency =
					(await this.taskRepository.findOne({
						where: {
							stepNumber: task.dependency,
						},
					})) ?? undefined;
			}

			if (task.taskType === 'reportGeneration' || !taskDependency || taskDependency.status === TaskStatus.Completed) {
				console.log(`Starting job ${task.taskType} for task ${task.taskId}...`);

				const taskResult = await job.run(task, taskDependency);
				console.log(`Job ${task.taskType} for task ${task.taskId} completed successfully.`);

				const result = new Result();
				result.taskId = task.taskId!;
				result.data = JSON.stringify(taskResult || {});
				await resultRepository.save(result);

				task.resultId = result.resultId!;
				task.status = TaskStatus.Completed;
				task.output = JSON.stringify(taskResult);
				task.progress = null;
				await this.taskRepository.save(task);
			} else if ([TaskStatus.Failed, TaskStatus.Skipped].includes(taskDependency?.status)) {
				task.status = TaskStatus.Skipped;
				task.progress = null;
				task.errorMsg = `Task not executed since a dependency either failed or was skipped.`;
				await this.taskRepository.save(task);
			}
		} catch (error: any) {
			console.error(`Error running job ${task.taskType} for task ${task.taskId}:`, error);

			task.status = TaskStatus.Failed;
			task.progress = null;
			task.errorMsg = JSON.stringify(error.message ?? error);
			await this.taskRepository.save(task);

			throw error;
		}

		const workflowRepository = this.taskRepository.manager.getRepository(Workflow);
		const currentWorkflow = await workflowRepository.findOne({
			where: { workflowId: task.workflow.workflowId },
			relations: ['tasks'],
		});

		if (currentWorkflow) {
			const allCompleted = currentWorkflow.tasks.every((t) => t.status === TaskStatus.Completed);
			const anyFailed = currentWorkflow.tasks.some((t) => t.status === TaskStatus.Failed);

			if (anyFailed) {
				currentWorkflow.status = WorkflowStatus.Failed;
			} else if (allCompleted) {
				currentWorkflow.status = WorkflowStatus.Completed;
			} else {
				currentWorkflow.status = WorkflowStatus.InProgress;
			}

			const workflowCompleted = currentWorkflow.tasks.every((t) =>
				[TaskStatus.Completed, TaskStatus.Failed, TaskStatus.Skipped].includes(t.status),
			);
			if (workflowCompleted) {
				const reportGenerationTask = currentWorkflow.tasks.find((t) => t.taskType === 'reportGeneration');
				if (reportGenerationTask?.output) {
					const result = JSON.parse(reportGenerationTask.output);
					result.status = currentWorkflow.status;
					currentWorkflow.finalResult = JSON.stringify(result);
				}

				if (!currentWorkflow.finalResult) {
					const report = generateReportFromWorflow(currentWorkflow);
					currentWorkflow.finalResult = JSON.stringify(report);
				}
			}

			await workflowRepository.save(currentWorkflow);
		}
	}
}

