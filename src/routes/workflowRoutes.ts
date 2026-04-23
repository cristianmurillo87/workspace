import { Router } from 'express';
import { AppDataSource } from '../data-source';
import { Workflow } from '../models/Workflow';
import { TaskStatus } from '../workers/taskRunner';
import { WorkflowStatus } from '../workflows/WorkflowFactory';

const workflowRouter = Router();

workflowRouter.get('/:id/status', async (req, res) => {
	const workflowId = req.params.id;
	try {
		const workflowRepository = AppDataSource.manager.getRepository(Workflow);
		const workflow = await workflowRepository.findOne({
			where: {
				workflowId,
			},
			relations: ['tasks'],
		});

		if (!workflow) {
			res.status(404).json({ message: `Workflow ${workflowId} not found` });
		} else {
			const result = {
				workflowId,
				status: workflow.status,
				totalTasks: workflow.tasks.length,
				completedTasks: workflow.tasks.filter((t) => t.status === TaskStatus.Completed).length,
			};
			res.status(200).json(result);
		}
	} catch {
		res.status(500).json({ message: `An error ocurred while querying status for workflow ${workflowId}` });
	}
});

workflowRouter.get('/:id/results', async (req, res) => {
	const workflowId = req.params.id;
	try {
		const workflowRepository = AppDataSource.manager.getRepository(Workflow);
		const workflow = await workflowRepository.findOne({
			where: {
				workflowId,
			},
			relations: ['tasks'],
		});

		if (!workflow) {
			res.status(404).json({ message: `Workflow ${workflowId} not found` });
		} else if (![WorkflowStatus.Completed, WorkflowStatus.Failed].includes(workflow.status)) {
			res.status(400).json({
				message: `Workflow ${workflowId} ${workflow.status === WorkflowStatus.InProgress ? 'is still runnig' : 'has not been started yet.'}`,
			});
		} else {
			res.status(200).json(JSON.parse(workflow.finalResult ?? '{}'));
		}
	} catch {
		res.status(500).json({ message: `An error ocurred while trying to retrieve results for workflow ${workflowId}` });
	}
});

export default workflowRouter;

