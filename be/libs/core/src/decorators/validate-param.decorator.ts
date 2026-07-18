import 'reflect-metadata';
import Joi from 'joi';
import { BadRequestException } from '@nestjs/common';

const JOI_SCHEMAS_KEY = Symbol('joi_schemas');

export function JoiValidate(schema: Joi.Schema) {
  return (
    target: any,
    propertyKey: string | symbol,
    parameterIndex: number,
  ) => {
    const existingSchemas: Record<number, Joi.Schema> =
      Reflect.getMetadata(JOI_SCHEMAS_KEY, target, propertyKey) || {};
    existingSchemas[parameterIndex] = schema;
    Reflect.defineMetadata(
      JOI_SCHEMAS_KEY,
      existingSchemas,
      target,
      propertyKey,
    );
  };
}

export function ValidateParams() {
  return (
    target: any,
    propertyKey: string | symbol,
    descriptor: PropertyDescriptor,
  ) => {
    const original = descriptor.value;
    descriptor.value = function (...args: any[]) {
      const schemas: Record<number, Joi.Schema> =
        Reflect.getMetadata(JOI_SCHEMAS_KEY, target, propertyKey) || {};

      for (const [indexStr, schema] of Object.entries(schemas)) {
        const index = Number(indexStr);
        const value = args[index];
        const { error, value: validated } = schema.validate(value, {
          abortEarly: false,
          stripUnknown: true,
        });
        if (error) {
          const details = error.details.map((d) => d.message);
          throw new BadRequestException({
            message: 'Validation failed: ' + details.join(' | '),
            paramIndex: index,
            details: error.details.map((d) => d.message),
          });
        }
        args[index] = validated;
      }

      return original.apply(this, args);
    };
    return descriptor;
  };
}
