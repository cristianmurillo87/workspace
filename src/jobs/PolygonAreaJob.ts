import { Feature, Geometry, GeometryObject, Polygon } from 'geojson';
import { area } from '@turf/area';
import { feature } from '@turf/helpers';
import { Task } from '../models/Task';
import { Job } from './Job';

export class PolygonAreaJob implements Job {
	async run(task: Task, dependency?: Task): Promise<string> {
		console.log(`Calculating area requested in ${task.taskId} task...`);

		const turfFeature: Feature<GeometryObject> = feature(JSON.parse(task.geoJson));

		try {
			if (turfFeature.geometry.type === 'Polygon' || turfFeature.geometry.type === 'MultiPolygon') {
				const areaSqm = area(turfFeature).toFixed(3);
				console.log(`The area of the given geometry is ${areaSqm} squared meters`);
				return [`Area: ${areaSqm} squared meters`, JSON.parse(dependency?.output ?? '')].join(' - ');
			}
		} catch {}

		throw new Error('Invalid geometry provided. An area can only be calculated for polygons or multipolygon geometries');
	}
}

