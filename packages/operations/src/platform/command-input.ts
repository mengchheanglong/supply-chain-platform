import { OperationalError } from './ports';
export function uuidInput(value: string) {
 if (typeof value!=='string' || !/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/i.test(value)) throw new OperationalError(400,'Invalid command identifier');
 return value.toLowerCase();
}
export function sourceInput(input: {idempotencyKey:string;sourceSystem:string;externalId:string}) {
 uuidInput(input.idempotencyKey);
 if (typeof input.sourceSystem!=='string' || !/^[A-Za-z0-9_.-]{1,80}$/.test(input.sourceSystem) || typeof input.externalId!=='string' || input.externalId.length>160 || !/^\S(?:.*\S)?$/.test(input.externalId)) throw new OperationalError(400,'Invalid source identity');
}
